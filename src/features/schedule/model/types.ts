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

/** Distinct hues around the wheel (avoid blue-heavy clustering). */
export const STUDENT_COLORS = [
  '#00C7BE', // teal (fallback for events without a student)
  '#FF9F0A', // orange
  '#BF5AF2', // purple
  '#30D158', // green
  '#FF453A', // red
  '#FFD60A', // yellow
  '#FF375F', // rose
  '#AC8E68', // brown
  '#FF6482', // coral
  '#AF52DE', // violet
  '#34C759', // mint green
  '#FF6B00', // deep orange
];

/** Spread consecutive ids across distant palette slots. */
export const colorForStudent = (studentId: number) => {
  const n = Math.abs(Number(studentId) || 0);
  const mixed = Math.imul(n, 2654435761) >>> 0;
  return STUDENT_COLORS[mixed % STUDENT_COLORS.length];
};

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
