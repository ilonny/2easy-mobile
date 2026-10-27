import type {LessonMediaPlayDetail} from './types';

type Listener = (detail: LessonMediaPlayDetail) => void;

const listeners = new Set<Listener>();
const applied = new Set<number>();

export function publishLessonMediaPlay(detail: LessonMediaPlayDetail) {
  if (!detail.commandId || !detail.exId || applied.has(detail.commandId)) {
    return;
  }
  if (detail.kind !== 'audio' && detail.kind !== 'video') {
    return;
  }
  applied.add(detail.commandId);
  if (applied.size > 80) {
    const oldest = applied.values().next().value;
    if (oldest != null) {
      applied.delete(oldest);
    }
  }
  listeners.forEach(listener => listener(detail));
}

export function subscribeLessonMediaPlay(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
