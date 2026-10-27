import {useEffect, useRef} from 'react';

import {subscribeLessonMediaPlay} from './mediaPlayBus';
import {syncedPositionSec, type LessonMediaKind} from './types';

export type SyncedMediaControls = {
  seek: (sec: number) => void;
  play: () => void;
  pause: () => void;
  getPositionSec: () => number;
  isPaused: () => boolean;
};

type Args = {
  enabled: boolean;
  exId: number;
  kind: LessonMediaKind;
  mediaIndex: number;
  getControls: () => SyncedMediaControls | null;
};

/**
 * Student side: follow teacher play/pause/seek from the lesson-media WS bus.
 */
export function useSyncedMediaPlayer({
  enabled,
  exId,
  kind,
  mediaIndex,
  getControls,
}: Args) {
  const getControlsRef = useRef(getControls);
  getControlsRef.current = getControls;
  const genRef = useRef(0);

  useEffect(() => {
    if (!enabled || !exId) {
      return;
    }

    return subscribeLessonMediaPlay(detail => {
      if (
        detail.exId !== exId ||
        detail.kind !== kind ||
        Number(detail.mediaIndex) !== mediaIndex
      ) {
        return;
      }
      const token = ++genRef.current;
      const started = Date.now();

      const apply = () => {
        if (token !== genRef.current) {
          return;
        }
        const controls = getControlsRef.current();
        if (!controls) {
          if (Date.now() - started < 5000) {
            setTimeout(apply, 80);
          }
          return;
        }
        if (detail.action === 'pause') {
          controls.seek(Math.max(0, detail.positionSec));
          controls.pause();
          return;
        }
        controls.seek(syncedPositionSec(detail));
        controls.play();
        // Re-seek after a beat so late-ready buffers land near teacher time.
        setTimeout(() => {
          if (token !== genRef.current) {
            return;
          }
          const again = getControlsRef.current();
          again?.seek(syncedPositionSec(detail));
        }, 250);
      };

      apply();
    });
  }, [enabled, exId, kind, mediaIndex]);
}
