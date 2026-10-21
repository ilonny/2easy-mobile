export type ScheduleView = 'month' | 'week' | 'day';

export type ScheduleEventType = 'lesson' | 'payment';

export type ScheduleEvent = {
  id: number | string;
  type: ScheduleEventType;
  teacher_user_id?: number;
  student_id: number;
  student_ids?: number[];
  student_name?: string | null;
  student_names?: string[] | null;
  title: string;
  starts_at: string;
  ends_at: string;
  location_type?: 'lesson' | 'text';
  lesson_id?: number | null;
  lesson_title?: string | null;
  location_text?: string | null;
  notes?: string | null;
  recurrence?: string | null;
  series_id?: string | null;
  plan_id?: number;
  amount?: number;
  currency?: string;
  plan_type?: string;
  frequency?: string;
  lessons_remaining?: number | null;
  due_date?: string | null;
  is_overdue?: boolean;
  is_payment_reminder?: boolean;
  /** Package lesson ordinals for calendar chips, e.g. 2/8 */
  package_progress?: Array<{
    student_id: number;
    plan_id: number;
    index: number;
    total: number;
  }>;
};

export type EventFormValues = {
  student_ids: number[];
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  location_type: 'lesson' | 'text';
  lesson_source: 'mine' | '2easy';
  lesson_id: number | '';
  location_text: string;
  notes: string;
  recurrence: '' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
};

export type PaymentPlan = {
  id: number;
  teacher_user_id: number;
  student_id: number;
  student_name?: string | null;
  student_email?: string | null;
  plan_type: 'recurring' | 'package';
  amount: number;
  currency: string;
  frequency?: string | null;
  next_payment_date?: string | null;
  lessons_total?: number | null;
  lessons_remaining?: number | null;
  is_active: number;
  notes?: string | null;
  anchor_event_id?: number | null;
  is_overdue?: boolean;
};

export type PaymentStatsGranularity = 'day' | 'week' | 'month';

export type MoneyByCurrency = {
  currency: string;
  amount: number;
};

export type PaymentStatsMoneyGroup = {
  actual_total?: MoneyByCurrency[];
  actual_past?: MoneyByCurrency[];
  actual_today?: MoneyByCurrency[];
  projected_total?: MoneyByCurrency[];
  expected_total?: MoneyByCurrency[];
};

export type PaymentStats = {
  granularity?: PaymentStatsGranularity;
  from?: string;
  to?: string;
  currencies?: string[];
  /** Legacy numeric totals (always numbers for old clients). */
  actual_total: number;
  actual_past?: number;
  actual_today?: number;
  projected_total: number;
  expected_total?: number;
  /** Multi-currency breakdown (new clients). */
  by_currency?: PaymentStatsMoneyGroup;
  chart: Array<{
    period?: string;
    label?: string;
    month?: string;
    actual: number;
    projected: number;
    total?: number;
    by_currency?: Record<
      string,
      {actual: number; projected: number; total?: number}
    >;
  }>;
  by_student: Array<{
    student_id: number;
    student_name?: string | null;
    student_email?: string | null;
    actual: number;
    projected: number;
    amounts?: Array<{
      currency: string;
      actual: number;
      projected: number;
    }>;
  }>;
  upcoming?: Array<{
    date: string;
    amount: number;
    currency?: string;
    student_id: number;
    student_name?: string | null;
    student_email?: string | null;
    plan_id: number;
    plan_type: string;
  }>;
};

export const STUDENT_COLORS = [
  '#0A84FF',
  '#30D158',
  '#FF9F0A',
  '#BF5AF2',
  '#FF6482',
  '#64D2FF',
  '#FFD60A',
  '#5E5CE6',
  '#AC8E68',
  '#FF453A',
];

export const colorForStudent = (studentId: number) =>
  STUDENT_COLORS[Math.abs(studentId) % STUDENT_COLORS.length];

export const eventStudentIds = (event: ScheduleEvent): number[] => {
  if (Array.isArray(event.student_ids) && event.student_ids.length) {
    return event.student_ids;
  }
  return event.student_id ? [event.student_id] : [];
};

export const colorsForEvent = (event: ScheduleEvent): string[] => {
  if (event.type === 'payment') {
    return [event.is_overdue ? '#FF3B30' : '#FF9F0A'];
  }
  const ids = eventStudentIds(event);
  if (!ids.length) {
    return [STUDENT_COLORS[0]];
  }
  return ids.map(colorForStudent);
};

/** RN has no CSS multi-stop gradient on View; use first / solid color. */
export const backgroundForColors = (eventColors: string[]) =>
  eventColors[0] || STUDENT_COLORS[0];
