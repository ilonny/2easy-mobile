import {postJson} from '../../../shared/api';
import type {LessonMediaPlayRequest} from './types';

export async function requestSyncedPlay(
  getPayload: () => LessonMediaPlayRequest,
): Promise<boolean> {
  const payload = getPayload();
  try {
    const res = await postJson<{success?: boolean}>({
      path: '/lesson-focus',
      isSecure: true,
      data: {
        lesson_id: payload.lesson_id,
        ex_id: payload.ex_id,
        kind: payload.kind,
        media_index: payload.media_index,
        position_sec: payload.position_sec,
        action: payload.action,
        scroll: payload.scroll,
      },
    });
    return !!res?.success;
  } catch {
    return false;
  }
}
