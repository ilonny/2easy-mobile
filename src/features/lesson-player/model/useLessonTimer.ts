import {useCallback, useEffect, useRef, useState} from 'react';
import {Platform, Vibration} from 'react-native';

import {fetchLessonFocusTimer} from '../api/lessonApi';
import {
  IDLE_LESSON_TIMER,
  LessonTimerWsAdapter,
  type LessonTimerState,
} from '../lib/lessonTimerWs';
import {
  LESSON_MEDIA_CATCH_UP_MS,
  publishLessonMediaPlay,
} from '../mediaSync';

/** Strong triple buzz so “times up” is hard to miss (no audio lib in the app). */
function signalTimerFinished() {
  if (Platform.OS === 'android') {
    Vibration.vibrate([0, 220, 100, 220, 100, 420]);
    return;
  }
  // iOS ignores patterns — fire three short pulses.
  Vibration.vibrate(220);
  setTimeout(() => Vibration.vibrate(220), 320);
  setTimeout(() => Vibration.vibrate(420), 640);
}

export function remainingMsFromState(
  state: LessonTimerState,
  nowMs = Date.now(),
): number {
  if (state.status === 'idle') return 0;
  if (state.status === 'paused') {
    return Math.max(0, state.remainingMs ?? 0);
  }
  if (state.status === 'finished') return 0;
  if (state.endsAtMs == null) return Math.max(0, state.remainingMs ?? 0);
  const serverNow = nowMs + state.clockOffsetMs;
  return Math.max(0, state.endsAtMs - serverNow);
}

export function formatTimerMmSs(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function useLessonTimer({
  lessonId,
  enabled,
  isTeacher,
}: {
  lessonId: number;
  enabled: boolean;
  isTeacher: boolean;
}) {
  const adapterRef = useRef<LessonTimerWsAdapter | null>(null);
  const [state, setState] = useState<LessonTimerState>(IDLE_LESSON_TIMER);
  const [remainingMs, setRemainingMs] = useState(0);
  const [finishedPulse, setFinishedPulse] = useState(false);
  const finishedForCommandRef = useRef(0);
  const role = isTeacher ? 'teacher' : 'student';

  useEffect(() => {
    if (!enabled || !lessonId) {
      adapterRef.current?.disconnect();
      adapterRef.current = null;
      setState(IDLE_LESSON_TIMER);
      setRemainingMs(0);
      return;
    }

    const adapter = new LessonTimerWsAdapter();
    adapterRef.current = adapter;
    adapter.setCallbacks({
      onTimer: next => {
        setState(next);
        setRemainingMs(remainingMsFromState(next));
      },
      onPlay: detail => {
        publishLessonMediaPlay(detail);
      },
    });
    void adapter.connect(lessonId, role);

    let stop = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const restoreFromHttp = async () => {
      if (stop) return;
      try {
        const data = await fetchLessonFocusTimer(lessonId);
        if (stop) return;
        const serverNow = Number(data?.server_now_ms || 0);
        const focusTimer = data?.focus?.timer;
        if (focusTimer && focusTimer.status && focusTimer.status !== 'idle') {
          adapter.applyTimerSnapshot({
            ...focusTimer,
            server_time_ms: serverNow || Date.now(),
          });
        } else if (focusTimer?.status === 'idle') {
          adapter.applyTimerSnapshot(null);
        }

        if (!isTeacher) {
          const media = data?.focus?.media;
          const serverTimeMs = Number(media?.server_time_ms || 0);
          const kind =
            media?.kind === 'video'
              ? 'video'
              : media?.kind === 'audio'
                ? 'audio'
                : null;
          if (
            kind &&
            serverNow &&
            serverTimeMs &&
            serverNow - serverTimeMs < LESSON_MEDIA_CATCH_UP_MS &&
            serverNow - serverTimeMs > -5000
          ) {
            publishLessonMediaPlay({
              commandId: Number(media?.command_id || 0),
              exId: Number(media?.ex_id || data?.focus?.ex_id || 0),
              kind,
              mediaIndex: Number(media?.media_index || 0),
              positionSec: Number(media?.position_sec || 0),
              serverTimeMs,
              clockOffsetMs: serverNow - Date.now(),
              action: media?.action === 'pause' ? 'pause' : 'play',
              scroll: media?.scroll !== false,
            });
          }
        }
      } catch {
        /* ignore */
      }
      if (!stop) {
        pollTimer = setTimeout(() => {
          void restoreFromHttp();
        }, 4000);
      }
    };

    pollTimer = setTimeout(() => {
      void restoreFromHttp();
    }, 200);

    return () => {
      stop = true;
      if (pollTimer) clearTimeout(pollTimer);
      adapter.disconnect();
      if (adapterRef.current === adapter) {
        adapterRef.current = null;
      }
    };
  }, [enabled, isTeacher, lessonId, role]);

  useEffect(() => {
    if (!enabled) return;
    if (state.status !== 'running') {
      setRemainingMs(remainingMsFromState(state));
      return;
    }
    const tick = () => {
      const next = remainingMsFromState(state);
      setRemainingMs(next);
      if (next <= 0 && finishedForCommandRef.current !== state.commandId) {
        finishedForCommandRef.current = state.commandId;
        setFinishedPulse(true);
        signalTimerFinished();
        setTimeout(() => setFinishedPulse(false), 2800);
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [enabled, state]);

  useEffect(() => {
    if (state.status === 'finished' && state.commandId) {
      if (finishedForCommandRef.current !== state.commandId) {
        finishedForCommandRef.current = state.commandId;
        setFinishedPulse(true);
        signalTimerFinished();
        setTimeout(() => setFinishedPulse(false), 2800);
      }
    }
  }, [state.commandId, state.status]);

  const start = useCallback(
    (durationSec: number) => {
      if (!isTeacher) return;
      adapterRef.current?.startTimer(durationSec);
    },
    [isTeacher],
  );

  const pause = useCallback(() => {
    if (!isTeacher) return;
    adapterRef.current?.pauseTimer();
  }, [isTeacher]);

  const resume = useCallback(() => {
    if (!isTeacher) return;
    adapterRef.current?.resumeTimer();
  }, [isTeacher]);

  const reset = useCallback(() => {
    if (!isTeacher) return;
    adapterRef.current?.resetTimer();
  }, [isTeacher]);

  const progress =
    state.durationSec > 0
      ? Math.min(1, Math.max(0, remainingMs / (state.durationSec * 1000)))
      : 0;

  return {
    state,
    remainingMs,
    display: formatTimerMmSs(remainingMs),
    progress,
    finishedPulse,
    isActive: state.status === 'running' || state.status === 'paused',
    isIdle: state.status === 'idle',
    isTeacher,
    start,
    pause,
    resume,
    reset,
  };
}

export type UseLessonTimer = ReturnType<typeof useLessonTimer>;
