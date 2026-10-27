import {useCallback, useEffect, useRef} from 'react';

import {
  isActiveMediaSync,
  isTeacherSyncSuppressed,
  setActiveMediaSync,
  suppressTeacherSync,
  useIsMediaSyncActive,
} from './activeMediaSync';
import {requestSyncedPlay} from './requestSyncedPlay';
import type {ActiveMediaSync, LessonMediaKind} from './types';
import type {SyncedMediaControls} from './useSyncedMediaPlayer';

type Args = {
  enabled: boolean;
  lessonId: number;
  exId: number;
  kind: LessonMediaKind;
  mediaIndex: number;
  getControls: () => SyncedMediaControls | null;
};

/**
 * Teacher side: Sync button + publish play/pause/seek while sync is active.
 */
export function useTeacherMediaSync({
  enabled,
  lessonId,
  exId,
  kind,
  mediaIndex,
  getControls,
}: Args) {
  const target: ActiveMediaSync | null =
    enabled && lessonId && exId
      ? {lessonId, exId, kind, mediaIndex}
      : null;
  const active = useIsMediaSyncActive(target);
  const getControlsRef = useRef(getControls);
  getControlsRef.current = getControls;
  const positionRef = useRef(0);
  const pausedRef = useRef(true);

  const reportProgress = useCallback((positionSec: number, paused: boolean) => {
    positionRef.current = positionSec;
    pausedRef.current = paused;
  }, []);

  useEffect(() => {
    if (!active || !lessonId || !exId) {
      return;
    }
    const current: ActiveMediaSync = {lessonId, exId, kind, mediaIndex};
    let debounce: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      if (!isActiveMediaSync(current) || isTeacherSyncSuppressed()) {
        return;
      }
      const controls = getControlsRef.current();
      const position =
        controls?.getPositionSec() ?? positionRef.current;
      const paused = controls?.isPaused() ?? pausedRef.current;
      void requestSyncedPlay(() => ({
        lesson_id: current.lessonId,
        ex_id: current.exId,
        kind: current.kind,
        media_index: current.mediaIndex,
        position_sec: position || 0,
        action: paused ? 'pause' : 'play',
        scroll: false,
      }));
    };

    const schedule = () => {
      if (isTeacherSyncSuppressed()) {
        return;
      }
      if (debounce) {
        clearTimeout(debounce);
      }
      debounce = setTimeout(flush, 220);
    };

    // Poll while active so play/pause/seek from the UI still publishes
    // without needing DOM media events.
    const interval = setInterval(schedule, 900);
    return () => {
      if (debounce) {
        clearTimeout(debounce);
      }
      clearInterval(interval);
    };
  }, [active, exId, kind, lessonId, mediaIndex]);

  const publishNow = useCallback(
    (scroll: boolean) => {
      if (!target) {
        return;
      }
      const controls = getControlsRef.current();
      const position = controls?.getPositionSec() ?? positionRef.current;
      const paused = controls?.isPaused() ?? pausedRef.current;
      void requestSyncedPlay(() => ({
        lesson_id: target.lessonId,
        ex_id: target.exId,
        kind: target.kind,
        media_index: target.mediaIndex,
        position_sec: position || 0,
        action: paused ? 'pause' : 'play',
        scroll,
      }));
    },
    [target],
  );

  const toggleSync = useCallback(async () => {
    if (!target) {
      return;
    }
    if (isActiveMediaSync(target)) {
      setActiveMediaSync(null);
      return;
    }
    setActiveMediaSync(target);
    suppressTeacherSync(800);
    const controls = getControlsRef.current();
    if (controls) {
      if ((controls.getPositionSec() || 0) > 0 && controls.isPaused()) {
        // restart from current unless ended — keep position
      }
      controls.play();
      pausedRef.current = false;
    }
    // Let play settle, then publish with scroll so students jump here.
    setTimeout(() => {
      suppressTeacherSync(-1); // clear suppress window
      publishNow(true);
    }, 120);
  }, [publishNow, target]);

  /** Call from play/pause handlers while sync is on so students follow immediately. */
  const notifyPlaybackChange = useCallback(
    (paused: boolean, positionSec?: number) => {
      if (positionSec != null) {
        positionRef.current = positionSec;
      }
      pausedRef.current = paused;
      if (!target || !isActiveMediaSync(target) || isTeacherSyncSuppressed()) {
        return;
      }
      void requestSyncedPlay(() => ({
        lesson_id: target.lessonId,
        ex_id: target.exId,
        kind: target.kind,
        media_index: target.mediaIndex,
        position_sec: positionRef.current || 0,
        action: paused ? 'pause' : 'play',
        scroll: false,
      }));
    },
    [target],
  );

  return {active, toggleSync, reportProgress, notifyPlaybackChange};
}
