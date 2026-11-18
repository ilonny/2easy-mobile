import {useCallback, useEffect, useRef, useState} from 'react';

import {
  lessonMediaWsClient,
  type LessonMediaWsRole,
} from '../lib/lessonTimerWs';
import {newClientEventId} from '../lib/miniGameLiveUtils';
import type {MiniGameLiveState} from '../../lesson-editor/ui/editors/miniGameTypes';

type Args = {
  lessonId: number;
  exId: number;
  enabled: boolean;
  role: LessonMediaWsRole;
};

/**
 * Shared realtime mini-game state over the lesson media WebSocket.
 */
export function useMiniGameLiveSync({
  lessonId,
  exId,
  enabled,
  role,
}: Args) {
  const [state, setState] = useState<MiniGameLiveState>({});
  const [version, setVersion] = useState(0);
  const stateRef = useRef<MiniGameLiveState>({});
  const revisionRef = useRef(0);
  const pendingEchoRef = useRef(new Set<string>());

  const applyState = useCallback((next: MiniGameLiveState) => {
    stateRef.current = next;
    setState(next);
    setVersion(v => v + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !lessonId || !exId) {
      revisionRef.current = 0;
      pendingEchoRef.current.clear();
      applyState({});
      return;
    }

    void lessonMediaWsClient.connect(lessonId, role);

    revisionRef.current = 0;
    pendingEchoRef.current.clear();

    const cached = lessonMediaWsClient.getLastMiniGame(exId);
    if (cached) {
      revisionRef.current = cached.revision;
      applyState(
        cached.state && typeof cached.state === 'object'
          ? (cached.state as MiniGameLiveState)
          : {},
      );
    } else {
      applyState({});
    }

    const unsub = lessonMediaWsClient.subscribeMiniGame(detail => {
      if (detail.exId !== exId) {
        return;
      }
      if (pendingEchoRef.current.has(detail.clientEventId)) {
        pendingEchoRef.current.delete(detail.clientEventId);
        revisionRef.current = Math.max(revisionRef.current, detail.revision);
        return;
      }
      if (detail.revision <= revisionRef.current) {
        return;
      }
      revisionRef.current = detail.revision;
      const next =
        detail.state && typeof detail.state === 'object'
          ? (detail.state as MiniGameLiveState)
          : {};
      applyState(next);
    });

    return () => {
      unsub();
    };
  }, [applyState, enabled, exId, lessonId, role]);

  const patchState = useCallback(
    (
      patch:
        | Partial<MiniGameLiveState>
        | ((prev: MiniGameLiveState) => MiniGameLiveState),
    ) => {
      if (!enabled) {
        return;
      }
      const prev = stateRef.current;
      const next =
        typeof patch === 'function' ? patch(prev) : {...prev, ...patch};
      applyState(next);

      const clientEventId = newClientEventId();
      pendingEchoRef.current.add(clientEventId);
      const sent = lessonMediaWsClient.sendMiniGame({
        exId,
        clientEventId,
        state: next as Record<string, unknown>,
      });
      if (!sent) {
        setTimeout(() => {
          pendingEchoRef.current.delete(clientEventId);
        }, 8000);
      }
    },
    [applyState, enabled, exId],
  );

  return {
    isLive: enabled,
    state,
    version,
    patchState,
  };
}
