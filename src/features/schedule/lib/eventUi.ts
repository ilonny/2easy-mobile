import {formatMoney} from './date';
import {eventStudentIds, type ScheduleEvent} from '../model/types';

export const isPlaceholderStudentName = (name?: string | null) => {
  const t = String(name || '').trim();
  if (!t) {
    return true;
  }
  return /^(ученик|student)\s*#?\s*\d+$/i.test(t) || /^#\d+$/.test(t);
};

export const eventStudentLabel = (
  event: ScheduleEvent,
  nameById?: Map<number, string>,
) => {
  const ids = eventStudentIds(event);

  if (nameById?.size && ids.length) {
    const resolved = ids
      .map(id => {
        const fromMap = String(nameById.get(Number(id)) || '').trim();
        if (fromMap && !isPlaceholderStudentName(fromMap)) {
          return fromMap;
        }
        return '';
      })
      .filter(Boolean);
    if (resolved.length) {
      return resolved.join(', ');
    }
  }

  return (
    event.student_names
      ?.filter(n => !isPlaceholderStudentName(n))
      .join(', ') ||
    (isPlaceholderStudentName(event.student_name) ? '' : event.student_name) ||
    ''
  ).trim();
};

export const eventPlaceLabel = (event: ScheduleEvent) => {
  if (event.type === 'payment') {
    return '';
  }
  if (event.location_type === 'lesson') {
    return String(event.lesson_title || '').trim();
  }
  return String(event.location_text || '').trim();
};

const isGenericTitle = (title: string, defaultTitle: string) => {
  const t = title.trim();
  if (!t) {
    return true;
  }
  return (
    t === defaultTitle || /^Занятие$/i.test(t) || /^Lesson$/i.test(t)
  );
};

export const eventChipText = (
  event: ScheduleEvent,
  opts: {
    detailed?: boolean;
    time?: string;
    nameById?: Map<number, string>;
    defaultLessonTitle: string;
    paymentMarker: string;
    paymentOverdueShort: string;
    askForPayment: string;
  },
) => {
  const time = opts.time || '';
  if (event.type === 'payment') {
    const student = eventStudentLabel(event, opts.nameById);
    const amount =
      event.amount != null
        ? formatMoney(Number(event.amount), event.currency || 'RUB')
        : '';
    const prefix = event.is_overdue
      ? opts.paymentOverdueShort
      : opts.paymentMarker;
    const primary = student ? `${prefix}: ${student}` : prefix;
    const secondary = [
      time,
      amount,
      event.is_overdue ? opts.askForPayment : '',
    ]
      .filter(Boolean)
      .join(' · ');
    return {primary, secondary};
  }

  const students = eventStudentLabel(event, opts.nameById);
  const rawTitle = String(event.title || '').trim();
  const customTitle =
    isGenericTitle(rawTitle, opts.defaultLessonTitle) ||
    isPlaceholderStudentName(rawTitle) ||
    (students && rawTitle.toLowerCase() === students.toLowerCase())
      ? ''
      : rawTitle;
  const place = eventPlaceLabel(event);
  const nameOrTitle =
    students || customTitle || opts.defaultLessonTitle;

  if (!opts.detailed) {
    const primary = [time, nameOrTitle].filter(Boolean).join(' ');
    return {primary, secondary: ''};
  }

  const primary = [time, nameOrTitle].filter(Boolean).join(' ');
  const secondary = [students ? customTitle : '', place]
    .filter(Boolean)
    .join(' · ');
  return {primary, secondary};
};

export const eventMinHeight = (event: ScheduleEvent, hourHeight: number) => {
  if (event.type === 'payment') {
    return Math.max(52, Math.round(hourHeight * 0.85));
  }
  return 34;
};
