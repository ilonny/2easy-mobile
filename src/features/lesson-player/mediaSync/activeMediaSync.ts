import {useEffect, useState} from 'react';

import type {ActiveMediaSync} from './types';

let active: ActiveMediaSync | null = null;
let suppressUntil = 0;
const listeners = new Set<() => void>();

const sameTarget = (a: ActiveMediaSync | null, b: ActiveMediaSync | null) =>
  !!a &&
  !!b &&
  a.lessonId === b.lessonId &&
  a.exId === b.exId &&
  a.kind === b.kind &&
  a.mediaIndex === b.mediaIndex;

export function isActiveMediaSync(target: ActiveMediaSync) {
  return sameTarget(active, target);
}

export function setActiveMediaSync(next: ActiveMediaSync | null) {
  if (sameTarget(active, next) || (!active && !next)) {
    return;
  }
  active = next;
  listeners.forEach(listener => listener());
}

export function subscribeActiveMediaSync(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function suppressTeacherSync(ms: number) {
  // ms < 0 clears the suppress window immediately.
  suppressUntil = ms < 0 ? 0 : Date.now() + ms;
}

export function isTeacherSyncSuppressed() {
  return Date.now() < suppressUntil;
}

export function useIsMediaSyncActive(target: ActiveMediaSync | null) {
  const [on, setOn] = useState(() =>
    target ? isActiveMediaSync(target) : false,
  );
  const lessonId = target?.lessonId || 0;
  const exId = target?.exId || 0;
  const kind = target?.kind || 'audio';
  const mediaIndex = target?.mediaIndex || 0;

  useEffect(() => {
    const read = () =>
      setOn(
        lessonId
          ? isActiveMediaSync({lessonId, exId, kind, mediaIndex})
          : false,
      );
    read();
    return subscribeActiveMediaSync(read);
  }, [exId, kind, lessonId, mediaIndex]);

  return on;
}
