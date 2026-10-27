import {useCallback, useEffect, useMemo, useState} from 'react';

import {readStorage, writeStorage} from '../../../shared/lib/storage';

export type CalendarHours = {start: number; end: number};

const STORAGE_KEY = 'scheduleVisibleHours';
const DEFAULT_HOURS: CalendarHours = {start: 7, end: 23};

const normalize = (value: Partial<CalendarHours> | null): CalendarHours => {
  const start = Math.max(0, Math.min(22, Number(value?.start)));
  const end = Math.max(1, Math.min(24, Number(value?.end)));
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return DEFAULT_HOURS;
  }
  return {start, end};
};

async function readHours(): Promise<CalendarHours> {
  try {
    const raw = await readStorage(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_HOURS;
    }
    return normalize(JSON.parse(raw));
  } catch {
    return DEFAULT_HOURS;
  }
}

export function hoursArray(hours: CalendarHours): number[] {
  return Array.from(
    {length: hours.end - hours.start},
    (_, index) => hours.start + index,
  );
}

export function useCalendarHours() {
  const [hours, setHoursState] = useState<CalendarHours>(DEFAULT_HOURS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await readHours();
      if (!cancelled) {
        setHoursState(next);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setHours = useCallback(async (next: CalendarHours) => {
    const normalized = normalize(next);
    setHoursState(normalized);
    await writeStorage(STORAGE_KEY, JSON.stringify(normalized));
  }, []);

  const visibleHours = useMemo(() => hoursArray(hours), [hours]);

  return {hours, setHours, visibleHours, ready};
}
