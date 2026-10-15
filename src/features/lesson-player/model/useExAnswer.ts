import {useCallback, useEffect, useRef, useState} from 'react';
import {AppState, type AppStateStatus} from 'react-native';

import {fetchAnswers, writeAnswerApi} from '../api/lessonApi';

type Params = {
  lessonId: number;
  exId: number;
  studentId?: number;
  activeStudentId?: number;
  isTeacher?: boolean;
  enablePolling?: boolean;
  pollMs?: number;
  /**
   * When true, student poll also pushes remote answers into React state
   * (e.g. free-input live teacher corrections). Callers must ignore updates
   * while the field is focused.
   */
  syncRemoteToStudent?: boolean;
};

export type AnswerRow = {
  q_id?: string | number;
  answer?: string;
  [key: string]: unknown;
};

export type ExAnswersResetDetail = {
  lesson_id: number;
  ex_id: number;
  student_id: number;
  sync_v?: number;
};

/** Reserved backend q_id for reset fence — never treat as exercise answer. */
export const ANSWER_SYNC_Q_ID = '__sync__';

/** Teachers need live sync; students need timely reset detection. */
export const DEFAULT_TEACHER_POLL_MS = 5000;
export const DEFAULT_STUDENT_POLL_MS = 7000;

type ResetListener = (detail: ExAnswersResetDetail) => void;
const resetListeners = new Set<ResetListener>();

export function subscribeAnswersReset(listener: ResetListener) {
  resetListeners.add(listener);
  return () => {
    resetListeners.delete(listener);
  };
}

/**
 * Push empty answers locally after a successful /answer/reset
 * so UI clears without waiting for the next poll.
 */
export function notifyLocalAnswersReset(detail: ExAnswersResetDetail) {
  resetListeners.forEach(listener => {
    try {
      listener(detail);
    } catch {
      // ignore listener errors
    }
  });
}

/** Backend rejects NaN / missing ids (`Unknown column 'NaN'`). */
function isPositiveId(value: unknown): value is number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0;
}

function parseSyncVersion(raw: unknown): number {
  if (raw == null) {
    return 0;
  }
  try {
    const parsed =
      typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw as {v?: number});
    const v = Number(parsed?.v);
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch {
    return 0;
  }
}

function splitAnswerRows(data: unknown[]) {
  const answersMap: Record<string, AnswerRow> = {};
  let sync_v = 0;
  (data || []).forEach((obj: any) => {
    if (obj == null || obj.q_id == null) {
      return;
    }
    if (String(obj.q_id) === ANSWER_SYNC_Q_ID) {
      sync_v = Math.max(sync_v, parseSyncVersion(obj.answer));
      return;
    }
    answersMap[String(obj.q_id)] = obj;
  });
  return {answersMap, sync_v};
}

function answersSignature(answersMap: Record<string, AnswerRow>, sync_v: number) {
  const keys = Object.keys(answersMap).sort();
  const body = keys
    .map(k => `${k}:${answersMap[k]?.answer ?? ''}`)
    .join('|');
  return `v${sync_v}|${body}`;
}

type SharedPollListener = {
  id: number;
  isTeacher: boolean;
  syncRemoteToStudent: boolean;
  intervalMs: number;
  onTick: (
    answersMap: Record<string, AnswerRow>,
    targetStudentId: number,
    sync_v: number,
  ) => void;
};

type SharedPoller = {
  key: string;
  lessonId: number;
  exId: number;
  targetStudentId: number;
  listeners: Map<number, SharedPollListener>;
  cancelled: boolean;
  gen: number;
  appActive: boolean;
};

const sharedPollers = new Map<string, SharedPoller>();
const inflightFetches = new Map<
  string,
  Promise<{answersMap: Record<string, AnswerRow>; sync_v: number}>
>();
let listenerIdSeq = 0;
let appStateActive = AppState.currentState === 'active';
let appStateSubscribed = false;

function ensureAppStateBridge() {
  if (appStateSubscribed) {
    return;
  }
  appStateSubscribed = true;
  AppState.addEventListener('change', (next: AppStateStatus) => {
    appStateActive = next === 'active';
    sharedPollers.forEach(poller => {
      poller.appActive = appStateActive;
    });
  });
}

function pollerKey(lessonId: number, exId: number, targetStudentId: number) {
  return `${lessonId}:${exId}:${targetStudentId}`;
}

async function fetchAnswersMapShared(
  lessonId: number,
  exId: number,
  targetStudentId: number,
) {
  const key = pollerKey(lessonId, exId, targetStudentId);
  const existing = inflightFetches.get(key);
  if (existing) {
    return existing;
  }
  const promise = (async () => {
    const rows = await fetchAnswers(lessonId, exId, targetStudentId);
    return splitAnswerRows(rows);
  })().finally(() => {
    inflightFetches.delete(key);
  });
  inflightFetches.set(key, promise);
  return promise;
}

function minListenerInterval(poller: SharedPoller) {
  let min = Number.POSITIVE_INFINITY;
  poller.listeners.forEach(l => {
    if (l.intervalMs < min) {
      min = l.intervalMs;
    }
  });
  return Number.isFinite(min) ? min : DEFAULT_STUDENT_POLL_MS;
}

function ensurePollLoop(poller: SharedPoller) {
  const myGen = ++poller.gen;
  const loop = async () => {
    while (!poller.cancelled && poller.gen === myGen) {
      if (poller.appActive && poller.listeners.size > 0) {
        try {
          const {answersMap, sync_v} = await fetchAnswersMapShared(
            poller.lessonId,
            poller.exId,
            poller.targetStudentId,
          );
          if (poller.cancelled || poller.gen !== myGen) {
            return;
          }
          poller.listeners.forEach(listener => {
            try {
              listener.onTick(answersMap, poller.targetStudentId, sync_v);
            } catch {
              // ignore listener errors
            }
          });
        } catch {
          // ignore poll errors
        }
      }
      const delay = Math.max(1000, minListenerInterval(poller));
      await new Promise(r => setTimeout(r, delay));
    }
  };
  void loop();
}

function subscribeSharedPoller(params: {
  lessonId: number;
  exId: number;
  targetStudentId: number;
  isTeacher: boolean;
  syncRemoteToStudent: boolean;
  intervalMs: number;
  onTick: SharedPollListener['onTick'];
}) {
  ensureAppStateBridge();
  const key = pollerKey(
    params.lessonId,
    params.exId,
    params.targetStudentId,
  );
  let poller = sharedPollers.get(key);
  if (!poller) {
    poller = {
      key,
      lessonId: params.lessonId,
      exId: params.exId,
      targetStudentId: params.targetStudentId,
      listeners: new Map(),
      cancelled: false,
      gen: 0,
      appActive: appStateActive,
    };
    sharedPollers.set(key, poller);
    ensurePollLoop(poller);
  }

  const id = ++listenerIdSeq;
  poller.listeners.set(id, {
    id,
    isTeacher: params.isTeacher,
    syncRemoteToStudent: params.syncRemoteToStudent,
    intervalMs: params.intervalMs,
    onTick: params.onTick,
  });

  return () => {
    const current = sharedPollers.get(key);
    if (!current) {
      return;
    }
    current.listeners.delete(id);
    if (current.listeners.size === 0) {
      current.cancelled = true;
      current.gen += 1;
      sharedPollers.delete(key);
    }
  };
}

export function useExAnswer({
  lessonId,
  exId,
  studentId,
  activeStudentId,
  isTeacher,
  enablePolling = true,
  pollMs,
  syncRemoteToStudent = false,
}: Params) {
  const [answers, setAnswers] = useState<Record<string, AnswerRow>>({});
  const [resetSeq, setResetSeq] = useState(0);
  const mountedRef = useRef(true);
  const writeChainRef = useRef<Promise<unknown>>(Promise.resolve());
  const writeGenRef = useRef(0);
  const lastSignatureRef = useRef<string | null>(null);
  const lastTargetRef = useRef(0);
  const lastSyncVRef = useRef(0);
  const syncVersionRef = useRef(0);

  const targetStudentId = Number(
    isTeacher ? activeStudentId || 0 : studentId || 0,
  );

  const canFetch =
    isPositiveId(lessonId) &&
    isPositiveId(exId) &&
    isPositiveId(targetStudentId);

  const intervalMs =
    pollMs ||
    (isTeacher ? DEFAULT_TEACHER_POLL_MS : DEFAULT_STUDENT_POLL_MS);

  const bumpWriteGen = useCallback(() => {
    writeGenRef.current += 1;
  }, []);

  const applyAnswers = useCallback(
    (
      answersMap: Record<string, AnswerRow>,
      sid: number,
      sync_v: number,
      options?: {updateState?: boolean; detectReset?: boolean},
    ) => {
      if (!mountedRef.current) {
        return answersMap;
      }

      const updateState = options?.updateState !== false;
      const detectReset = options?.detectReset !== false;
      const nextSig = answersSignature(answersMap, sync_v);
      const prevSig = lastSignatureRef.current;
      const sameTarget = lastTargetRef.current === sid;
      const prevSync = lastSyncVRef.current;
      const syncBumped = sync_v > 0 && sync_v !== prevSync && sameTarget;

      if (!sameTarget) {
        lastTargetRef.current = sid;
        lastSignatureRef.current = nextSig;
        lastSyncVRef.current = sync_v;
        syncVersionRef.current = sync_v;
        if (updateState) {
          setAnswers(answersMap);
        }
        return answersMap;
      }

      if (prevSig === nextSig && !syncBumped) {
        return answersMap;
      }

      const prevBody = (prevSig || '').split('|').slice(1).join('|');
      const prevHadRealAnswers = !!prevBody;
      const nextHasAnswers = Object.keys(answersMap).length > 0;
      lastSignatureRef.current = nextSig;
      lastSyncVRef.current = sync_v;
      syncVersionRef.current = sync_v;

      if (updateState) {
        setAnswers(answersMap);
      }

      if (
        detectReset &&
        sid &&
        (syncBumped || (prevHadRealAnswers && !nextHasAnswers))
      ) {
        if (!updateState) {
          setAnswers({});
        }
        bumpWriteGen();
        setResetSeq(n => n + 1);
        notifyLocalAnswersReset({
          ex_id: Number(exId),
          student_id: sid,
          lesson_id: Number(lessonId),
          sync_v,
        });
      }

      return answersMap;
    },
    [exId, lessonId, bumpWriteGen],
  );

  const fetchAnswersMap = useCallback(async () => {
    if (!canFetch) {
      return {answersMap: {} as Record<string, AnswerRow>, sid: 0, sync_v: 0};
    }
    const {answersMap, sync_v} = await fetchAnswersMapShared(
      lessonId,
      exId,
      targetStudentId,
    );
    return {answersMap, sid: targetStudentId, sync_v};
  }, [canFetch, lessonId, exId, targetStudentId]);

  const getAnswers = useCallback(async () => {
    const {answersMap, sid, sync_v} = await fetchAnswersMap();
    if (!mountedRef.current) {
      return answersMap;
    }
    return applyAnswers(answersMap, sid, sync_v, {
      updateState: true,
      detectReset: false,
    });
  }, [fetchAnswersMap, applyAnswers]);

  const writeAnswer = useCallback(
    async (q_id: number | string, answer: string) => {
      if (!canFetch) {
        return {ok: false as const, stale: false};
      }
      if (String(q_id) === ANSWER_SYNC_Q_ID) {
        return {ok: false as const, stale: false};
      }

      const genAtStart = writeGenRef.current;
      const sync_v = syncVersionRef.current;

      const job = writeChainRef.current.then(async () => {
        const res = await writeAnswerApi({
          lesson_id: lessonId,
          ex_id: exId,
          q_id,
          answer,
          student_id: targetStudentId,
          sync_v,
        });
        return res;
      });
      writeChainRef.current = job.catch(() => undefined);

      try {
        const res = (await job) as
          | {success?: boolean; stale?: boolean; sync_v?: number}
          | undefined;

        if (!mountedRef.current || writeGenRef.current !== genAtStart) {
          return {ok: false as const, stale: true};
        }

        if (res?.stale || (res as {status?: number})?.status === 409) {
          const nextSync =
            Number(res?.sync_v) > 0
              ? Number(res.sync_v)
              : syncVersionRef.current;
          syncVersionRef.current = nextSync;
          lastSyncVRef.current = nextSync;
          lastSignatureRef.current = answersSignature({}, nextSync);
          setAnswers({});
          bumpWriteGen();
          setResetSeq(n => n + 1);
          notifyLocalAnswersReset({
            ex_id: Number(exId),
            student_id: targetStudentId,
            lesson_id: Number(lessonId),
            sync_v: nextSync,
          });
          return {ok: false as const, stale: true};
        }

        if (mountedRef.current && writeGenRef.current === genAtStart) {
          setAnswers(prev => {
            const next = {
              ...prev,
              [String(q_id)]: {...(prev[String(q_id)] || {}), q_id, answer},
            };
            lastSignatureRef.current = answersSignature(
              next,
              syncVersionRef.current,
            );
            return next;
          });
        }
        return {ok: true as const, stale: false};
      } catch {
        return {ok: false as const, stale: false};
      }
    },
    [canFetch, lessonId, exId, targetStudentId, bumpWriteGen],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      bumpWriteGen();
    };
  }, [bumpWriteGen]);

  useEffect(() => {
    return subscribeAnswersReset(detail => {
      if (
        Number(detail.ex_id) === Number(exId) &&
        Number(detail.student_id) === Number(targetStudentId) &&
        Number(detail.lesson_id) === Number(lessonId)
      ) {
        const nextSync =
          detail.sync_v && detail.sync_v > 0
            ? detail.sync_v
            : syncVersionRef.current;
        bumpWriteGen();
        syncVersionRef.current = nextSync;
        lastSyncVRef.current = nextSync;
        lastSignatureRef.current = answersSignature({}, nextSync);
        setAnswers({});
        setResetSeq(n => n + 1);
      }
    });
  }, [exId, lessonId, targetStudentId, bumpWriteGen]);

  useEffect(() => {
    if (lastTargetRef.current && lastTargetRef.current !== targetStudentId) {
      lastSignatureRef.current = null;
      lastSyncVRef.current = 0;
      syncVersionRef.current = 0;
      setAnswers({});
      bumpWriteGen();
    }
    if (!canFetch) {
      lastTargetRef.current = 0;
      lastSignatureRef.current = null;
      lastSyncVRef.current = 0;
      syncVersionRef.current = 0;
      setAnswers({});
      return;
    }

    if (!enablePolling) {
      void getAnswers();
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const {answersMap, sid, sync_v} = await fetchAnswersMap();
        if (cancelled || !mountedRef.current) {
          return;
        }
        applyAnswers(answersMap, sid, sync_v, {
          updateState: true,
          detectReset: false,
        });
      } catch {
        // ignore initial hydrate errors
      }
    })();

    const unsubscribe = subscribeSharedPoller({
      lessonId,
      exId,
      targetStudentId,
      isTeacher: !!isTeacher,
      syncRemoteToStudent,
      intervalMs,
      onTick: (answersMap, sid, sync_v) => {
        if (cancelled || !mountedRef.current) {
          return;
        }
        if (isTeacher) {
          applyAnswers(answersMap, sid, sync_v, {
            updateState: true,
            detectReset: true,
          });
        } else {
          applyAnswers(answersMap, sid, sync_v, {
            updateState: syncRemoteToStudent,
            detectReset: true,
          });
        }
      },
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [
    canFetch,
    enablePolling,
    isTeacher,
    syncRemoteToStudent,
    intervalMs,
    targetStudentId,
    lessonId,
    exId,
    fetchAnswersMap,
    applyAnswers,
    getAnswers,
    bumpWriteGen,
  ]);

  return {
    answers,
    setAnswers,
    getAnswers,
    writeAnswer,
    targetStudentId,
    resetSeq,
  };
}
