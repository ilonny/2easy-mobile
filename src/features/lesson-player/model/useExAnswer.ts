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
};

export type AnswerRow = {
  q_id?: string | number;
  answer?: string;
  [key: string]: unknown;
};

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

export function useExAnswer({
  lessonId,
  exId,
  studentId,
  activeStudentId,
  isTeacher,
  enablePolling = true,
  pollMs = 7000,
}: Params) {
  const [answers, setAnswers] = useState<Record<string, AnswerRow>>({});
  const mountedRef = useRef(true);
  const queueRef = useRef<Promise<unknown>[]>([]);

  const targetStudentId = Number(
    isTeacher ? activeStudentId || 0 : studentId || 0,
  );

  const canFetch =
    isPositiveId(lessonId) &&
    isPositiveId(exId) &&
    isPositiveId(targetStudentId);

  const getAnswers = useCallback(async () => {
    if (!canFetch) {
      return {};
    }
    const rows = await fetchAnswers(lessonId, exId, targetStudentId);
    const map = toAnswersMap(rows);
    if (mountedRef.current) {
      setAnswers(map);
    }
    return map;
  }, [canFetch, lessonId, exId, targetStudentId]);

  const writeAnswer = useCallback(
    async (q_id: number | string, answer: string) => {
      if (!canFetch) {
        return;
      }
      const job = writeAnswerApi({
        lesson_id: lessonId,
        ex_id: exId,
        q_id,
        answer,
        student_id: targetStudentId,
      });
      queueRef.current.push(job);
      await Promise.all(queueRef.current);
      setAnswers(prev => ({
        ...prev,
        [String(q_id)]: {...(prev[String(q_id)] || {}), q_id, answer},
      }));
    },
    [canFetch, lessonId, exId, targetStudentId],
  );

  useEffect(() => {
    mountedRef.current = true;
    if (!canFetch) {
      setAnswers({});
      return () => {
        mountedRef.current = false;
      };
    }
    void getAnswers();
    return () => {
      mountedRef.current = false;
    };
  }, [canFetch, getAnswers]);

  useEffect(() => {
    if (!enablePolling || !canFetch) {
      return;
    }
    const timer = setInterval(() => {
      void getAnswers();
    }, pollMs);
    return () => clearInterval(timer);
  }, [enablePolling, canFetch, getAnswers, pollMs]);

  return {answers, setAnswers, getAnswers, writeAnswer, targetStudentId};
}
