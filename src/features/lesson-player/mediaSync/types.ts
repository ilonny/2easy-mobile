export const LESSON_MEDIA_CATCH_UP_MS = 90_000;

export type LessonMediaKind = 'audio' | 'video';
export type LessonMediaAction = 'play' | 'pause';

export type LessonMediaPlayDetail = {
  commandId: number;
  exId: number;
  kind: LessonMediaKind;
  mediaIndex: number;
  positionSec: number;
  serverTimeMs: number;
  clockOffsetMs: number;
  action: LessonMediaAction;
  /** When false, students only follow playback (no scroll). */
  scroll: boolean;
};

export type LessonMediaPlayRequest = {
  lesson_id: number;
  ex_id: number;
  kind: LessonMediaKind;
  media_index: number;
  position_sec: number;
  action: LessonMediaAction;
  scroll: boolean;
};

export type ActiveMediaSync = {
  lessonId: number;
  exId: number;
  kind: LessonMediaKind;
  mediaIndex: number;
};

export function syncedPositionSec(detail: LessonMediaPlayDetail): number {
  if (detail.action === 'pause') {
    return Math.max(0, detail.positionSec);
  }
  const elapsedSec =
    (Date.now() + detail.clockOffsetMs - detail.serverTimeMs) / 1000;
  return Math.max(0, detail.positionSec + Math.max(0, elapsedSec));
}
