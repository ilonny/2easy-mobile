import {useCallback, useEffect, useRef, useState} from 'react';

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
};

/** Teachers need live sync; students mainly need reset detection. */
export const DEFAULT_TEACHER_POLL_MS = 3000;
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

function toAnswersMap(data: unknown[]): Record<string, AnswerRow> {
  return (data || []).reduce((map: Record<string, AnswerRow>, obj: any) => {
    if (obj?.q_id != null) {
      map[String(obj.q_id)] = obj;
    }
    return map;
  }, {});
}

function answersSignature(answersMap: Record<string, AnswerRow>) {
  const keys = Object.keys(answersMap).sort();
  return keys
    .map(k => `${k}:${answersMap[k]?.answer ?? ''}`)
    .join('|');
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
  const mountedRef = useRef(true);
  const writeChainRef = useRef<Promise<unknown>>(Promise.resolve());
  const lastSignatureRef = useRef<string | null>(null);
  const lastTargetRef = useRef(0);

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

  const applyAnswers = useCallback(
    (
      answersMap: Record<string, AnswerRow>,
      sid: number,
      options?: {updateState?: boolean; detectReset?: boolean},
    ) => {
      if (!mountedRef.current) {
        return answersMap;
      }

      const updateState = options?.updateState !== false;
      const detectReset = options?.detectReset !== false;
      const nextSig = answersSignature(answersMap);
      const prevSig = lastSignatureRef.current;
      const sameTarget = lastTargetRef.current === sid;

      if (!sameTarget) {
        lastTargetRef.current = sid;
        lastSignatureRef.current = nextSig;
        if (updateState) {
          setAnswers(answersMap);
        }
        return answersMap;
      }

      if (prevSig === nextSig) {
        return answersMap;
      }

      const prevHadAnswers = !!prevSig;
      const nextHasAnswers = Object.keys(answersMap).length > 0;
      lastSignatureRef.current = nextSig;

      if (updateState) {
        setAnswers(answersMap);
      }

      if (
        detectReset &&
        prevHadAnswers &&
        !nextHasAnswers &&
        sid
      ) {
        if (!updateState) {
          setAnswers({});
        }
        notifyLocalAnswersReset({
          ex_id: Number(exId),
          student_id: sid,
          lesson_id: Number(lessonId),
        });
      }

      return answersMap;
    },
    [exId, lessonId],
  );

  const fetchAnswersMap = useCallback(async () => {
    if (!canFetch) {
      return {answersMap: {} as Record<string, AnswerRow>, sid: 0};
    }
    const rows = await fetchAnswers(lessonId, exId, targetStudentId);
    return {answersMap: toAnswersMap(rows), sid: targetStudentId};
  }, [canFetch, lessonId, exId, targetStudentId]);

  const getAnswers = useCallback(async () => {
    const {answersMap, sid} = await fetchAnswersMap();
    if (!mountedRef.current) {
      return answersMap;
    }
    return applyAnswers(answersMap, sid, {
      updateState: true,
      detectReset: false,
    });
  }, [fetchAnswersMap, applyAnswers]);

  const writeAnswer = useCallback(
    async (q_id: number | string, answer: string) => {
      if (!canFetch) {
        return;
      }
      const job = writeChainRef.current.then(() =>
        writeAnswerApi({
          lesson_id: lessonId,
          ex_id: exId,
          q_id,
          answer,
          student_id: targetStudentId,
        }),
      );
      writeChainRef.current = job.catch(() => undefined);
      await job;
      if (!mountedRef.current) {
        return;
      }
      setAnswers(prev => {
        const next = {
          ...prev,
          [String(q_id)]: {...(prev[String(q_id)] || {}), q_id, answer},
        };
        lastSignatureRef.current = answersSignature(next);
        return next;
      });
    },
    [canFetch, lessonId, exId, targetStudentId],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    return subscribeAnswersReset(detail => {
      if (
        Number(detail.ex_id) === Number(exId) &&
        Number(detail.student_id) === Number(targetStudentId) &&
        Number(detail.lesson_id) === Number(lessonId)
      ) {
        lastSignatureRef.current = '';
        setAnswers({});
      }
    });
  }, [exId, lessonId, targetStudentId]);

  useEffect(() => {
    if (lastTargetRef.current && lastTargetRef.current !== targetStudentId) {
      lastSignatureRef.current = null;
      setAnswers({});
    }
    if (!canFetch) {
      lastTargetRef.current = 0;
      lastSignatureRef.current = null;
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
        const {answersMap, sid} = await fetchAnswersMap();
        if (cancelled || !mountedRef.current) {
          return;
        }
        applyAnswers(answersMap, sid, {
          updateState: true,
          detectReset: false,
        });
      } catch {
        // ignore initial hydrate errors
      }
    })();

    const timer = setInterval(() => {
      void (async () => {
        try {
          const {answersMap, sid} = await fetchAnswersMap();
          if (cancelled || !mountedRef.current) {
            return;
          }
          if (isTeacher) {
            applyAnswers(answersMap, sid, {
              updateState: true,
              detectReset: true,
            });
          } else {
            // Student: by default only watch for remote reset (don't steal focus).
            applyAnswers(answersMap, sid, {
              updateState: syncRemoteToStudent,
              detectReset: true,
            });
          }
        } catch {
          // ignore poll errors
        }
      })();
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [
    canFetch,
    enablePolling,
    isTeacher,
    syncRemoteToStudent,
    intervalMs,
    targetStudentId,
    fetchAnswersMap,
    applyAnswers,
    getAnswers,
  ]);

  return {answers, setAnswers, getAnswers, writeAnswer, targetStudentId};
}
