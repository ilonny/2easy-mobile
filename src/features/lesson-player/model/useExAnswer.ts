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

  const getAnswers = useCallback(async () => {
    if (!lessonId || !exId) {
      return {};
    }
    const rows = await fetchAnswers(
      lessonId,
      exId,
      targetStudentId || undefined,
    );
    const map = toAnswersMap(rows);
    if (mountedRef.current) {
      setAnswers(map);
    }
    return map;
  }, [lessonId, exId, targetStudentId]);

  const writeAnswer = useCallback(
    async (q_id: number | string, answer: string) => {
      if (!targetStudentId || !lessonId || !exId) {
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
    [lessonId, exId, targetStudentId],
  );

  useEffect(() => {
    mountedRef.current = true;
    void getAnswers();
    return () => {
      mountedRef.current = false;
    };
  }, [getAnswers]);

  useEffect(() => {
    if (!enablePolling || !targetStudentId) {
      return;
    }
    const timer = setInterval(() => {
      void getAnswers();
    }, pollMs);
    return () => clearInterval(timer);
  }, [enablePolling, getAnswers, pollMs, targetStudentId]);

  return {answers, setAnswers, getAnswers, writeAnswer, targetStudentId};
}
