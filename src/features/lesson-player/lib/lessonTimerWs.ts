import {API_BASE_URL, STORAGE_KEYS} from '../../../shared/config';
import {readStorage} from '../../../shared/lib/storage';

export const LESSON_MEDIA_WS_PATH = '/api/lesson/media/ws';
export const LESSON_TIMER_PING_MS = 20000;
export const LESSON_TIMER_RECONNECT_MS = 1500;
/** Drop stale play commands older than this (same as site). */
const LESSON_MEDIA_CATCH_UP_MS = 90_000;

export type LessonTimerStatus = 'idle' | 'running' | 'paused' | 'finished';

export type LessonTimerState = {
  commandId: number;
  status: LessonTimerStatus;
  durationSec: number;
  endsAtMs: number | null;
  remainingMs: number | null;
  updatedAtMs: number;
  serverTimeMs: number;
  clockOffsetMs: number;
};

export const IDLE_LESSON_TIMER: LessonTimerState = {
  commandId: 0,
  status: 'idle',
  durationSec: 0,
  endsAtMs: null,
  remainingMs: null,
  updatedAtMs: 0,
  serverTimeMs: 0,
  clockOffsetMs: 0,
};

export const LESSON_TIMER_PRESETS_SEC = [60, 180, 300, 600] as const;

export type LessonMediaWsRole = 'teacher' | 'student';

export type LessonMediaPlayIncoming = {
  commandId: number;
  exId: number;
  kind: 'audio' | 'video';
  mediaIndex: number;
  positionSec: number;
  serverTimeMs: number;
  clockOffsetMs: number;
  action: 'play' | 'pause';
  scroll: boolean;
};

type TimerCallbacks = {
  onTimer?: (state: LessonTimerState) => void;
  onPlay?: (detail: LessonMediaPlayIncoming) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (message: string) => void;
};

type WsIncoming = {
  type?: string;
  server_time_ms?: number;
  command_id?: number;
  ex_id?: number;
  kind?: string;
  media_index?: number;
  position_sec?: number;
  action?: string;
  scroll?: boolean;
  status?: string;
  duration_sec?: number;
  ends_at_ms?: number | null;
  remaining_ms?: number | null;
  updated_at_ms?: number;
  message?: string;
};

async function getTimerWsUrl(lessonId: number) {
  const token = await readStorage(STORAGE_KEYS.token);
  const wsBase = API_BASE_URL.replace(/^http/i, 'ws');
  const params = new URLSearchParams({
    lesson_id: String(lessonId),
  });
  if (token) {
    params.set('token', token);
  }
  return `${wsBase}${LESSON_MEDIA_WS_PATH}?${params.toString()}`;
}

function parseStatus(raw?: string): LessonTimerStatus | null {
  if (
    raw === 'idle' ||
    raw === 'running' ||
    raw === 'paused' ||
    raw === 'finished'
  ) {
    return raw;
  }
  return null;
}

export class LessonTimerWsAdapter {
  private ws: WebSocket | null = null;
  private callbacks: TimerCallbacks = {};
  private lessonId: number | null = null;
  private role: LessonMediaWsRole | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;
  private connectionGen = 0;
  private clockOffsetMs = 0;
  private timerState: LessonTimerState = IDLE_LESSON_TIMER;

  setCallbacks(callbacks: TimerCallbacks) {
    this.callbacks = callbacks;
  }

  getTimerState() {
    return this.timerState;
  }

  getClockOffsetMs() {
    return this.clockOffsetMs;
  }

  async connect(lessonId: number, role: LessonMediaWsRole = 'student') {
    this.disconnect(false);
    this.lessonId = lessonId;
    this.role = role;
    this.shouldReconnect = true;
    this.connectionGen += 1;
    await this.open(this.connectionGen);
  }

  disconnect(clearLesson = true) {
    this.shouldReconnect = false;
    this.connectionGen += 1;
    this.clearTimers();
    const ws = this.ws;
    this.ws = null;
    if (ws && ws.readyState < WebSocket.CLOSING) {
      ws.close();
    }
    if (clearLesson) {
      this.lessonId = null;
      this.role = null;
      // Keep last timer until a new lesson connects; reload restore uses HTTP/WS.
      this.timerState = IDLE_LESSON_TIMER;
    }
    this.callbacks.onConnectionChange?.(false);
  }

  /** Restore from GET /lesson-focus after app/screen reload. */
  applyTimerSnapshot(raw: {
    command_id?: number;
    status?: string;
    duration_sec?: number;
    ends_at_ms?: number | null;
    remaining_ms?: number | null;
    updated_at_ms?: number;
    server_time_ms?: number;
  } | null) {
    if (!raw) {
      if (this.timerState.status !== 'idle') {
        this.timerState = {
          ...IDLE_LESSON_TIMER,
          clockOffsetMs: this.clockOffsetMs,
          serverTimeMs: Date.now() + this.clockOffsetMs,
        };
        this.callbacks.onTimer?.(this.timerState);
      }
      return;
    }
    if (raw.server_time_ms) {
      this.clockOffsetMs = Number(raw.server_time_ms) - Date.now();
    }
    this.applyTimer({
      type: 'timer',
      ...raw,
      server_time_ms: raw.server_time_ms || Date.now() + this.clockOffsetMs,
    });
  }

  startTimer(durationSec: number) {
    this.send({type: 'timer_start', duration_sec: durationSec});
  }

  pauseTimer() {
    this.send({type: 'timer_pause'});
  }

  resumeTimer() {
    this.send({type: 'timer_resume'});
  }

  resetTimer() {
    this.send({type: 'timer_reset'});
  }

  private send(payload: Record<string, unknown>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.callbacks.onError?.('not_connected');
      return;
    }
    this.ws.send(JSON.stringify(payload));
  }

  private clearTimers() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private async open(gen: number) {
    if (!this.lessonId || gen !== this.connectionGen) return;
    const url = await getTimerWsUrl(this.lessonId);
    if (gen !== this.connectionGen) return;

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      if (gen !== this.connectionGen || this.ws !== ws) {
        ws.close();
        return;
      }
      this.startPing(gen);
    };

    ws.onmessage = event => {
      if (gen !== this.connectionGen || this.ws !== ws) return;
      let msg: WsIncoming | null = null;
      try {
        msg = JSON.parse(String(event.data)) as WsIncoming;
      } catch {
        return;
      }
      if (!msg?.type) return;

      if ((msg.type === 'hello' || msg.type === 'pong') && msg.server_time_ms) {
        this.clockOffsetMs = Number(msg.server_time_ms) - Date.now();
      }

      if (msg.type === 'hello') {
        this.callbacks.onConnectionChange?.(true);
        return;
      }

      if (msg.type === 'timer') {
        this.applyTimer(msg);
        return;
      }

      if (msg.type === 'play' && this.role === 'student') {
        this.applyPlay(msg);
        return;
      }

      if (msg.type === 'error' && typeof msg.message === 'string') {
        this.callbacks.onError?.(msg.message);
      }
    };

    ws.onclose = () => {
      if (gen !== this.connectionGen) return;
      this.clearTimers();
      this.callbacks.onConnectionChange?.(false);
      if (!this.shouldReconnect) return;
      this.reconnectTimer = setTimeout(() => {
        void this.open(gen);
      }, LESSON_TIMER_RECONNECT_MS);
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  private applyTimer(msg: WsIncoming) {
    const status = parseStatus(msg.status);
    if (!status) return;
    const serverTimeMs = Number(msg.server_time_ms || Date.now());
    this.timerState = {
      commandId: Number(msg.command_id || 0),
      status,
      durationSec: Math.max(0, Number(msg.duration_sec || 0)),
      endsAtMs:
        msg.ends_at_ms == null || msg.ends_at_ms === undefined
          ? null
          : Number(msg.ends_at_ms),
      remainingMs:
        msg.remaining_ms == null || msg.remaining_ms === undefined
          ? null
          : Number(msg.remaining_ms),
      updatedAtMs: Number(msg.updated_at_ms || serverTimeMs),
      serverTimeMs,
      clockOffsetMs: this.clockOffsetMs,
    };
    this.callbacks.onTimer?.(this.timerState);
  }

  private applyPlay(msg: WsIncoming) {
    const kind =
      msg.kind === 'video' ? 'video' : msg.kind === 'audio' ? 'audio' : null;
    const serverTimeMs = Number(msg.server_time_ms || 0);
    const commandId = Number(msg.command_id || 0);
    const exId = Number(msg.ex_id || 0);
    if (!kind || !commandId || !exId || !serverTimeMs) {
      return;
    }
    if (
      Date.now() + this.clockOffsetMs - serverTimeMs >
      LESSON_MEDIA_CATCH_UP_MS
    ) {
      return;
    }
    this.callbacks.onPlay?.({
      commandId,
      exId,
      kind,
      mediaIndex: Number(msg.media_index || 0),
      positionSec: Number(msg.position_sec || 0),
      serverTimeMs,
      clockOffsetMs: this.clockOffsetMs,
      action: msg.action === 'pause' ? 'pause' : 'play',
      scroll: msg.scroll !== false,
    });
  }

  private startPing(gen: number) {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => {
      if (gen !== this.connectionGen || this.ws?.readyState !== WebSocket.OPEN) {
        return;
      }
      this.ws.send(JSON.stringify({type: 'ping'}));
    }, LESSON_TIMER_PING_MS);
  }
}
