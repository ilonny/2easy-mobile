import {deleteJson, getJson, patchJson, postJson} from '../../../shared/api';
import type {
  PaymentPlan,
  PaymentStats,
  PaymentStatsGranularity,
  ScheduleEvent,
} from '../model/types';

export type LoadStatsParams = {
  from: string;
  to: string;
  granularity: PaymentStatsGranularity;
};

export async function fetchScheduleEvents(from: string, to: string) {
  const res = await getJson<{
    success?: boolean;
    events?: ScheduleEvent[];
    message?: string;
  }>({
    path: `/schedule/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    isSecure: true,
  });
  if (res.success === false) {
    throw new Error(res.message || 'Failed to load events');
  }
  return (res.events || []) as ScheduleEvent[];
}

function assertOk(
  res: {success?: boolean; message?: string},
  fallback: string,
) {
  if (res.success === false) {
    throw new Error(res.message || fallback);
  }
  return res;
}

export async function createScheduleEvent(data: Record<string, unknown>) {
  return assertOk(
    await postJson({path: '/schedule/events', isSecure: true, data}),
    'Failed to create event',
  );
}

export async function updateScheduleEvent(
  id: number,
  data: Record<string, unknown>,
) {
  return assertOk(
    await patchJson({path: `/schedule/events/${id}`, isSecure: true, data}),
    'Failed to update event',
  );
}

export async function deleteScheduleEvent(id: number, scope: string) {
  return assertOk(
    await deleteJson({
      path: `/schedule/events/${id}?scope=${encodeURIComponent(scope)}`,
      isSecure: true,
    }),
    'Failed to delete event',
  );
}

export async function emailScheduleEvent(id: number, email: string) {
  return assertOk(
    await postJson({
      path: `/schedule/events/${id}/email`,
      isSecure: true,
      data: {email},
    }),
    'Failed to send email',
  );
}

export async function fetchPaymentPlans() {
  const res = await getJson<{
    success?: boolean;
    plans?: PaymentPlan[];
    message?: string;
  }>({
    path: '/schedule/payments/plans',
    isSecure: true,
  });
  if (res.success === false) {
    throw new Error(res.message || 'Failed to load plans');
  }
  return (res.plans || []) as PaymentPlan[];
}

export async function fetchPaymentStats(params?: LoadStatsParams) {
  const qs = new URLSearchParams();
  if (params?.from) {
    qs.set('from', params.from);
  }
  if (params?.to) {
    qs.set('to', params.to);
  }
  if (params?.granularity) {
    qs.set('granularity', params.granularity);
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const res = await getJson<{
    success?: boolean;
    stats?: PaymentStats;
    message?: string;
  }>({
    path: `/schedule/payments/stats${suffix}`,
    isSecure: true,
  });
  if (res.success === false) {
    throw new Error(res.message || 'Failed to load stats');
  }
  return (res.stats || null) as PaymentStats | null;
}

export async function createPaymentPlan(data: Record<string, unknown>) {
  return assertOk(
    await postJson({path: '/schedule/payments/plans', isSecure: true, data}),
    'Failed to create plan',
  );
}

export async function updatePaymentPlan(
  id: number,
  data: Record<string, unknown>,
) {
  return assertOk(
    await patchJson({
      path: `/schedule/payments/plans/${id}`,
      isSecure: true,
      data,
    }),
    'Failed to update plan',
  );
}

export async function deletePaymentPlan(id: number) {
  return assertOk(
    await deleteJson({
      path: `/schedule/payments/plans/${id}`,
      isSecure: true,
    }),
    'Failed to deactivate plan',
  );
}

export async function recordPayment(
  id: number,
  data?: Record<string, unknown>,
) {
  return assertOk(
    await postJson({
      path: `/schedule/payments/plans/${id}/record`,
      isSecure: true,
      data: data || {},
    }),
    'Failed to record payment',
  );
}
