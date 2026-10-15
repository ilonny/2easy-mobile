import {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {TextField} from '../../../shared/ui';
import {
  addDays,
  addMonths,
  formatDisplayDate,
  formatMoney,
  formatYmd,
  startOfMonth,
} from '../lib/date';
import type {
  PaymentPlan,
  PaymentStats,
  PaymentStatsGranularity,
} from '../model/types';
import type {LoadStatsParams} from '../api/scheduleApi';

type StudentOption = {id: number; name?: string; email?: string};

type PlanForm = {
  student_id: number | '';
  plan_type: 'recurring' | 'package';
  amount: string;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  next_payment_date: string;
  lessons_total: string;
  lessons_remaining: string;
  notes: string;
};

type Props = {
  plans: PaymentPlan[];
  stats: PaymentStats | null;
  loading: boolean;
  statsLoading: boolean;
  students: StudentOption[];
  onRefreshPlans: () => Promise<void> | void;
  onLoadStats: (params: LoadStatsParams) => Promise<void> | void;
  onCreate: (data: Record<string, unknown>) => Promise<void>;
  onUpdate: (id: number, data: Record<string, unknown>) => Promise<void>;
  onRecord: (id: number) => Promise<void>;
  onDeactivate: (id: number) => Promise<void>;
};

const emptyPlanForm = (): PlanForm => ({
  student_id: '',
  plan_type: 'recurring',
  amount: '',
  frequency: 'monthly',
  next_payment_date: formatYmd(addDays(new Date(), 7)),
  lessons_total: '8',
  lessons_remaining: '8',
  notes: '',
});

const formFromPlan = (plan: PaymentPlan): PlanForm => ({
  student_id: plan.student_id,
  plan_type: plan.plan_type,
  amount: String(plan.amount ?? ''),
  frequency: (plan.frequency as PlanForm['frequency']) || 'monthly',
  next_payment_date: plan.next_payment_date
    ? formatYmd(new Date(plan.next_payment_date))
    : formatYmd(new Date()),
  lessons_total: String(plan.lessons_total ?? 8),
  lessons_remaining: String(
    plan.lessons_remaining ?? plan.lessons_total ?? 8,
  ),
  notes: plan.notes || '',
});

const defaultRange = (granularity: PaymentStatsGranularity) => {
  const now = new Date();
  if (granularity === 'day') {
    return {
      from: formatYmd(addDays(now, -14)),
      to: formatYmd(addDays(now, 30)),
    };
  }
  if (granularity === 'week') {
    return {
      from: formatYmd(addDays(now, -28)),
      to: formatYmd(addDays(now, 56)),
    };
  }
  return {
    from: formatYmd(addMonths(startOfMonth(now), -5)),
    to: formatYmd(addMonths(startOfMonth(now), 6)),
  };
};

const frequencyLabel = (
  frequency: string | null | undefined,
  t: (k: string) => string,
) => {
  const key = String(frequency || '')
    .trim()
    .toLowerCase();
  if (key === 'weekly') {
    return t('schedule.freqWeekly');
  }
  if (key === 'biweekly') {
    return t('schedule.freqBiweekly');
  }
  if (key === 'monthly') {
    return t('schedule.freqMonthly');
  }
  return frequency || '—';
};

export function PaymentsTab({
  plans,
  stats,
  loading,
  statsLoading,
  students,
  onRefreshPlans,
  onLoadStats,
  onCreate,
  onUpdate,
  onRecord,
  onDeactivate,
}: Props) {
  const {t} = useI18n();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentPlan | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyPlanForm());
  const [busy, setBusy] = useState(false);
  const [granularity, setGranularity] =
    useState<PaymentStatsGranularity>('month');
  const initial = defaultRange('month');
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [upcomingExpanded, setUpcomingExpanded] = useState(false);

  useEffect(() => {
    void onRefreshPlans();
  }, [onRefreshPlans]);

  useEffect(() => {
    void onLoadStats({from, to, granularity});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activePlans = useMemo(
    () => plans.filter(p => Number(p.is_active) !== 0),
    [plans],
  );

  const upcomingAll = stats?.upcoming || [];
  const upcomingVisible = upcomingExpanded
    ? upcomingAll
    : upcomingAll.slice(0, 5);
  const upcomingHiddenCount = Math.max(0, upcomingAll.length - 5);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyPlanForm());
    setOpen(true);
  };

  const openEdit = (plan: PaymentPlan) => {
    setEditing(plan);
    setForm(formFromPlan(plan));
    setOpen(true);
  };

  const applyPreset = (kind: 'past3m' | 'next3m' | 'year') => {
    const now = new Date();
    let nextFrom = from;
    let nextTo = to;
    if (kind === 'past3m') {
      nextFrom = formatYmd(addMonths(now, -3));
      nextTo = formatYmd(now);
    } else if (kind === 'next3m') {
      nextFrom = formatYmd(now);
      nextTo = formatYmd(addMonths(now, 3));
    } else {
      nextFrom = formatYmd(new Date(now.getFullYear(), 0, 1));
      nextTo = formatYmd(new Date(now.getFullYear(), 11, 31));
    }
    setFrom(nextFrom);
    setTo(nextTo);
    void onLoadStats({from: nextFrom, to: nextTo, granularity});
  };

  const handleSave = async () => {
    if (!form.student_id || !form.amount) {
      Alert.alert('', t('schedule.fillRequired'));
      return;
    }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        student_id: Number(form.student_id),
        plan_type: form.plan_type,
        amount: Number(form.amount),
        currency: 'RUB',
        notes: form.notes || null,
      };
      if (form.plan_type === 'recurring') {
        payload.frequency = form.frequency;
        payload.next_payment_date = form.next_payment_date || null;
      } else {
        payload.lessons_total = Number(form.lessons_total) || 8;
        payload.lessons_remaining =
          Number(form.lessons_remaining) || Number(form.lessons_total) || 8;
        payload.next_payment_date = form.next_payment_date || null;
      }
      if (editing) {
        await onUpdate(editing.id, payload);
      } else {
        await onCreate(payload);
      }
      setOpen(false);
      await onRefreshPlans();
    } catch (e) {
      Alert.alert(
        '',
        e instanceof Error ? e.message : t('common.error'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <View style={styles.headRow}>
        <View style={{flex: 1}}>
          <Text style={styles.title}>{t('schedule.paymentsTitle')}</Text>
          <Text style={styles.subtitle}>{t('schedule.paymentsSubtitle')}</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>{t('schedule.addPlan')}</Text>
        </Pressable>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          label={t('schedule.earnedPast')}
          value={formatMoney(stats?.actual_past ?? stats?.actual_total ?? 0)}
        />
        <StatCard
          label={t('schedule.earnedToday')}
          value={formatMoney(stats?.actual_today ?? 0)}
        />
        <StatCard
          label={t('schedule.projected')}
          value={formatMoney(stats?.projected_total ?? 0)}
        />
        <StatCard
          label={t('schedule.expectedTotal')}
          value={formatMoney(stats?.expected_total ?? 0)}
        />
      </View>

      <View style={styles.segment}>
        {(['day', 'week', 'month'] as const).map(g => (
          <Pressable
            key={g}
            style={[styles.segmentBtn, granularity === g && styles.segmentOn]}
            onPress={() => {
              setGranularity(g);
              const range = defaultRange(g);
              setFrom(range.from);
              setTo(range.to);
              void onLoadStats({
                from: range.from,
                to: range.to,
                granularity: g,
              });
            }}>
            <Text
              style={[
                styles.segmentText,
                granularity === g && styles.segmentTextOn,
              ]}>
              {g === 'day'
                ? t('schedule.viewDay')
                : g === 'week'
                  ? t('schedule.viewWeek')
                  : t('schedule.viewMonth')}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.rowFields}>
        <View style={{flex: 1}}>
          <TextField
            label={t('schedule.dateFrom')}
            value={from}
            onChangeText={setFrom}
            autoCapitalize="none"
          />
        </View>
        <View style={{flex: 1}}>
          <TextField
            label={t('schedule.dateTo')}
            value={to}
            onChangeText={setTo}
            autoCapitalize="none"
          />
        </View>
      </View>
      <View style={styles.presetRow}>
        <Pressable
          style={styles.presetBtn}
          onPress={() =>
            void onLoadStats({from, to, granularity})
          }>
          <Text style={styles.presetText}>{t('schedule.applyRange')}</Text>
        </Pressable>
        <Pressable
          style={styles.presetBtn}
          onPress={() => applyPreset('past3m')}>
          <Text style={styles.presetText}>{t('schedule.presetPast3m')}</Text>
        </Pressable>
        <Pressable
          style={styles.presetBtn}
          onPress={() => applyPreset('next3m')}>
          <Text style={styles.presetText}>{t('schedule.presetNext3m')}</Text>
        </Pressable>
        <Pressable
          style={styles.presetBtn}
          onPress={() => applyPreset('year')}>
          <Text style={styles.presetText}>{t('schedule.presetYear')}</Text>
        </Pressable>
      </View>

      {statsLoading ? (
        <ActivityIndicator color={colors.primary} style={{marginVertical: 16}} />
      ) : (
        <>
          <Text style={styles.section}>{t('schedule.byStudent')}</Text>
          {(stats?.by_student || []).length === 0 ? (
            <Text style={styles.empty}>{t('schedule.noStatsYet')}</Text>
          ) : (
            (stats?.by_student || []).map(row => (
              <View key={row.student_id} style={styles.listCard}>
                <Text style={styles.listTitle}>
                  {row.student_name || `#${row.student_id}`}
                </Text>
                <Text style={styles.listMeta}>
                  {t('schedule.earned')}: {formatMoney(row.actual)} ·{' '}
                  {t('schedule.projected')}: {formatMoney(row.projected)}
                </Text>
              </View>
            ))
          )}

          <Text style={styles.section}>{t('schedule.upcomingPayments')}</Text>
          {upcomingAll.length === 0 ? (
            <Text style={styles.empty}>{t('schedule.noUpcoming')}</Text>
          ) : (
            <>
              {upcomingVisible.map(u => (
                <View key={`${u.plan_id}-${u.date}`} style={styles.listCard}>
                  <Text style={styles.listTitle}>
                    {u.student_name || `#${u.student_id}`}
                  </Text>
                  <Text style={styles.listMeta}>
                    {formatDisplayDate(u.date)} · {formatMoney(u.amount)} ·{' '}
                    {u.plan_type === 'package'
                      ? t('schedule.planPackage')
                      : t('schedule.planRecurring')}
                  </Text>
                </View>
              ))}
              {upcomingHiddenCount > 0 && (
                <Pressable
                  style={styles.accordionBtn}
                  onPress={() => setUpcomingExpanded(v => !v)}>
                  <Text style={styles.accordionBtnText}>
                    {upcomingExpanded
                      ? t('schedule.upcomingCollapse')
                      : t('schedule.upcomingShowMore').replace(
                          '{{n}}',
                          String(upcomingHiddenCount),
                        )}
                  </Text>
                  <Text style={styles.accordionChevron}>
                    {upcomingExpanded ? '▴' : '▾'}
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </>
      )}

      <Text style={styles.section}>{t('schedule.paymentsTitle')}</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : activePlans.length === 0 ? (
        <Text style={styles.empty}>{t('schedule.noStats')}</Text>
      ) : (
        activePlans.map(plan => (
          <View key={plan.id} style={styles.planCard}>
            <View style={{flex: 1}}>
              <Text style={styles.listTitle}>
                {plan.student_name || `#${plan.student_id}`}
              </Text>
              <Text style={styles.listMeta}>
                {plan.plan_type === 'package'
                  ? t('schedule.planPackage')
                  : t('schedule.planRecurring')}{' '}
                · {formatMoney(plan.amount, plan.currency)}
                {plan.plan_type === 'recurring'
                  ? ` · ${frequencyLabel(plan.frequency, t)}`
                  : ` · ${plan.lessons_remaining ?? 0}/${plan.lessons_total ?? 0}`}
              </Text>
              {!!plan.next_payment_date && (
                <Text style={styles.listMeta}>
                  {t('schedule.nextPayment')}:{' '}
                  {formatDisplayDate(plan.next_payment_date)}
                  {plan.is_overdue ? ` · ${t('schedule.overdueBadge')}` : ''}
                </Text>
              )}
            </View>
            <View style={styles.planActions}>
              <Pressable onPress={() => openEdit(plan)}>
                <Text style={styles.link}>{t('schedule.edit')}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void (async () => {
                    try {
                      await onRecord(plan.id);
                      await onRefreshPlans();
                    } catch (e) {
                      Alert.alert(
                        '',
                        e instanceof Error ? e.message : t('common.error'),
                      );
                    }
                  })();
                }}>
                <Text style={styles.link}>{t('schedule.markPaid')}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void (async () => {
                    try {
                      await onDeactivate(plan.id);
                      await onRefreshPlans();
                    } catch (e) {
                      Alert.alert(
                        '',
                        e instanceof Error ? e.message : t('common.error'),
                      );
                    }
                  })();
                }}>
                <Text style={[styles.link, {color: '#FF3B30'}]}>
                  {t('schedule.deactivate')}
                </Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}>
        <View style={[styles.modalRoot, {paddingTop: insets.top + 8}]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editing ? t('schedule.editPlan') : t('schedule.addPlan')}
            </Text>
            <Pressable onPress={() => setOpen(false)}>
              <Text style={styles.link}>{t('schedule.close')}</Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{
              padding: 16,
              paddingBottom: Math.max(insets.bottom, 16) + 24,
            }}
            keyboardShouldPersistTaps="handled">
            <Text style={styles.sectionLabel}>{t('schedule.student')}</Text>
            <View style={styles.chips}>
              {students.map(s => {
                const active = form.student_id === s.id;
                return (
                  <Pressable
                    key={s.id}
                    style={[styles.chip, active && styles.chipOn]}
                    onPress={() =>
                      setForm(f => ({...f, student_id: s.id}))
                    }>
                    <Text
                      style={[styles.chipText, active && styles.chipTextOn]}>
                      {s.name || `#${s.id}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.segment}>
              {(['recurring', 'package'] as const).map(key => (
                <Pressable
                  key={key}
                  style={[
                    styles.segmentBtn,
                    form.plan_type === key && styles.segmentOn,
                  ]}
                  onPress={() => setForm(f => ({...f, plan_type: key}))}>
                  <Text
                    style={[
                      styles.segmentText,
                      form.plan_type === key && styles.segmentTextOn,
                    ]}>
                    {key === 'recurring'
                      ? t('schedule.planRecurring')
                      : t('schedule.planPackage')}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextField
              label={t('schedule.amount')}
              value={form.amount}
              onChangeText={v => setForm(f => ({...f, amount: v}))}
              keyboardType="numeric"
            />
            {form.plan_type === 'recurring' ? (
              <View style={styles.chips}>
                {(['weekly', 'biweekly', 'monthly'] as const).map(key => {
                  const active = form.frequency === key;
                  return (
                    <Pressable
                      key={key}
                      style={[styles.chip, active && styles.chipOn]}
                      onPress={() =>
                        setForm(f => ({...f, frequency: key}))
                      }>
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextOn,
                        ]}>
                        {frequencyLabel(key, t)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={styles.rowFields}>
                <View style={{flex: 1}}>
                  <TextField
                    label={t('schedule.lessonsInPackage')}
                    value={form.lessons_total}
                    onChangeText={v =>
                      setForm(f => ({...f, lessons_total: v}))
                    }
                    keyboardType="numeric"
                  />
                </View>
                <View style={{flex: 1}}>
                  <TextField
                    label={t('schedule.lessonsRemaining')}
                    value={form.lessons_remaining}
                    onChangeText={v =>
                      setForm(f => ({...f, lessons_remaining: v}))
                    }
                    keyboardType="numeric"
                  />
                </View>
              </View>
            )}
            <TextField
              label={t('schedule.nextPayment')}
              value={form.next_payment_date}
              onChangeText={v =>
                setForm(f => ({...f, next_payment_date: v}))
              }
              autoCapitalize="none"
              placeholder="YYYY-MM-DD"
            />
            <TextField
              label={t('schedule.notes')}
              value={form.notes}
              onChangeText={v => setForm(f => ({...f, notes: v}))}
              multiline
            />
            <Pressable
              style={styles.saveBtn}
              disabled={busy}
              onPress={() => void handleSave()}>
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.saveBtnText}>{t('schedule.save')}</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function StatCard({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  title: {fontSize: 18, fontWeight: '700', color: colors.text},
  subtitle: {fontSize: 13, color: colors.textSecondary, marginTop: 4},
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addBtnText: {color: colors.white, fontWeight: '700', fontSize: 13},
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(63,40,198,0.12)',
    padding: 12,
  },
  statLabel: {fontSize: 12, color: colors.textSecondary, marginBottom: 4},
  statValue: {fontSize: 16, fontWeight: '700', color: colors.text},
  segment: {flexDirection: 'row', gap: 8, marginBottom: 12},
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(63,40,198,0.2)',
    alignItems: 'center',
  },
  segmentOn: {backgroundColor: colors.primary, borderColor: colors.primary},
  segmentText: {fontSize: 13, fontWeight: '700', color: colors.primary},
  segmentTextOn: {color: colors.white},
  rowFields: {flexDirection: 'row', gap: 10},
  presetRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16},
  presetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  presetText: {fontSize: 12, fontWeight: '700', color: colors.primary},
  section: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
    marginBottom: 10,
  },
  empty: {color: colors.textSecondary, marginBottom: 12},
  accordionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  accordionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  accordionChevron: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  listCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(63,40,198,0.1)',
    padding: 12,
    marginBottom: 8,
  },
  listTitle: {fontWeight: '700', color: colors.text, fontSize: 15},
  listMeta: {color: colors.textSecondary, fontSize: 13, marginTop: 4},
  planCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(63,40,198,0.12)',
    padding: 12,
    marginBottom: 10,
  },
  planActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 10,
  },
  link: {color: colors.primary, fontWeight: '700', fontSize: 13},
  modalRoot: {flex: 1, backgroundColor: colors.white},
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8e8ed',
  },
  modalTitle: {fontSize: 18, fontWeight: '700', color: colors.text},
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12},
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(63,40,198,0.25)',
    backgroundColor: colors.primarySoft,
  },
  chipOn: {backgroundColor: colors.primary, borderColor: colors.primary},
  chipText: {fontSize: 13, fontWeight: '600', color: colors.primary},
  chipTextOn: {color: colors.white},
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {color: colors.white, fontWeight: '700', fontSize: 15},
});
