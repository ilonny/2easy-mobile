import type {ScheduleEvent, ScheduleView} from '../model/types';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Full day hour labels 00:00–23:00 (site calendar). */
export const HOURS = Array.from({length: 24}, (_, i) => i);

/** Pixel offset of "now" within the hour grid; clamped to grid bounds. */
export function nowScrollTop(hourHeight: number, pad = 48) {
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  const start = HOURS[0];
  const end = HOURS[HOURS.length - 1] + 1;
  const clamped = Math.min(Math.max(h, start), end);
  return Math.max(0, (clamped - start) * hourHeight - pad);
}

export function weekdayLong(d: Date, language: string): string {
  try {
    return new Intl.DateTimeFormat(
      language.startsWith('ru') ? 'ru-RU' : 'en-US',
      {weekday: 'long'},
    ).format(d);
  } catch {
    return '';
  }
}

export function weekdayShort(d: Date, language: string): string {
  try {
    return new Intl.DateTimeFormat(
      language.startsWith('ru') ? 'ru-RU' : 'en-US',
      {weekday: 'short'},
    ).format(d);
  } catch {
    return '';
  }
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Monday-based ISO week start. */
export function startOfIsoWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

export function endOfIsoWeek(d: Date): Date {
  const start = startOfIsoWeek(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return endOfDay(end);
}

export function startOfMonth(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function endOfMonth(d: Date): Date {
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function formatHm(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function parseYmd(ymd: string): Date {
  const [y, m, day] = ymd.split('-').map(Number);
  return startOfDay(new Date(y, (m || 1) - 1, day || 1));
}

export function localDateTimeToIso(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0).toISOString();
}

export function getLocalTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function rangeForView(cursor: Date, view: ScheduleView) {
  if (view === 'month') {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    return {
      from: startOfIsoWeek(monthStart).toISOString(),
      to: endOfIsoWeek(monthEnd).toISOString(),
    };
  }
  if (view === 'week') {
    return {
      from: startOfIsoWeek(cursor).toISOString(),
      to: endOfIsoWeek(cursor).toISOString(),
    };
  }
  return {
    from: startOfDay(cursor).toISOString(),
    to: endOfDay(cursor).toISOString(),
  };
}

export function eventsOnDay(events: ScheduleEvent[], day: Date) {
  return events.filter(e => isSameDay(new Date(e.starts_at), day));
}

export function monthMatrix(cursor: Date): Date[][] {
  const start = startOfIsoWeek(startOfMonth(cursor));
  const weeks: Date[][] = [];
  let day = start;
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d++) {
      row.push(day);
      day = addDays(day, 1);
    }
    weeks.push(row);
  }
  return weeks;
}

export function weekDays(cursor: Date): Date[] {
  const start = startOfIsoWeek(cursor);
  return Array.from({length: 7}, (_, i) => addDays(start, i));
}

const MONTH_RU = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];
const MONTH_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MONTH_SHORT_RU = [
  'янв',
  'фев',
  'мар',
  'апр',
  'мая',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];
const MONTH_SHORT_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatTitle(
  cursor: Date,
  view: ScheduleView,
  locale: string,
): string {
  const ru = locale.startsWith('ru');
  const months = ru ? MONTH_RU : MONTH_EN;
  const short = ru ? MONTH_SHORT_RU : MONTH_SHORT_EN;
  if (view === 'month') {
    return `${months[cursor.getMonth()]} ${cursor.getFullYear()}`;
  }
  if (view === 'week') {
    const start = startOfIsoWeek(cursor);
    const end = endOfIsoWeek(cursor);
    return `${start.getDate()} ${short[start.getMonth()]} – ${end.getDate()} ${short[end.getMonth()]} ${end.getFullYear()}`;
  }
  return `${cursor.getDate()} ${months[cursor.getMonth()]} ${cursor.getFullYear()}`;
}

export function formatMoney(amount: number, currency = 'RUB'): string {
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  } catch {
    return `${amount || 0} ${currency}`;
  }
}

export function formatDisplayDate(isoOrYmd: string): string {
  const d = new Date(isoOrYmd.includes('T') ? isoOrYmd : `${isoOrYmd}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return isoOrYmd;
  }
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function formatDisplayDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return `${formatDisplayDate(iso)} ${formatHm(d)}`;
}
