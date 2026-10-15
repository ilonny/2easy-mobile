import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useAuth} from '../../../entities/session';
import {useI18n} from '../../../shared/i18n';
import {colors} from '../../../shared/config/theme';
import {useLayout} from '../../../shared/lib/layout';
import {Breadcrumbs} from '../../../shared/ui';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {goHome} from '../../../shared/navigation/resetToLessonPlans';
import {AppHeader} from '../../app-shell';
import {useSubscription} from '../../home/model/useSubscription';
import {fetchStudents, type Student} from '../../students/api/studentsApi';
import {fetchSecureLessons} from '../../lesson-plans/api/lessonsApi';
import {
  createPaymentPlan,
  createScheduleEvent,
  deletePaymentPlan,
  deleteScheduleEvent,
  emailScheduleEvent,
  fetchPaymentPlans,
  fetchPaymentStats,
  fetchScheduleEvents,
  recordPayment,
  updatePaymentPlan,
  updateScheduleEvent,
  type LoadStatsParams,
} from '../api/scheduleApi';
import {
  addDays,
  addMonths,
  formatTitle,
  formatYmd,
  getLocalTimeZone,
  rangeForView,
  startOfDay,
} from '../lib/date';
import {
  colorForStudent,
  eventStudentIds,
  type EventFormValues,
  type PaymentPlan,
  type PaymentStats,
  type ScheduleEvent,
  type ScheduleView,
} from '../model/types';
import {DayView} from './calendar/DayView';
import {MonthView} from './calendar/MonthView';
import {WeekView} from './calendar/WeekView';
import {EventFormModal} from './EventFormModal';
import {PaymentsTab} from './PaymentsTab';

type LessonOption = {id: number; title?: string; user_id?: number};

export function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {profile, isAuthorized} = useAuth();
  const {t, language} = useI18n();
  const {pageGutter, pageContentMaxWidth, isTablet} = useLayout();
  const {hasSubscription, loading: subLoading} = useSubscription();

  const isStudent = !!profile?.isStudent;
  const isTeacher = !isStudent;

  const [tab, setTab] = useState<'calendar' | 'payments'>('calendar');
  const [view, setView] = useState<ScheduleView>('day');
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<LessonOption[]>([]);
  const [filterStudentId, setFilterStudentId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(
    null,
  );
  const [defaults, setDefaults] = useState<Partial<EventFormValues>>({});

  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  const teacherAllowed = !isTeacher || hasSubscription;
  const tzLabel = getLocalTimeZone();

  const refreshRange = useCallback(async () => {
    const {from, to} = rangeForView(cursor, view);
    setLoading(true);
    try {
      const list = await fetchScheduleEvents(from, to);
      setEvents(list);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [cursor, view]);

  useEffect(() => {
    if (isTeacher && !teacherAllowed) {
      return;
    }
    void refreshRange();
  }, [refreshRange, teacherAllowed, isTeacher]);

  useEffect(() => {
    if (!isTeacher || !teacherAllowed) {
      return;
    }
    void (async () => {
      try {
        setStudents(await fetchStudents());
      } catch {
        setStudents([]);
      }
    })();
  }, [isTeacher, teacherAllowed]);

  useEffect(() => {
    if (!isTeacher || !teacherAllowed) {
      return;
    }
    void (async () => {
      try {
        const res = await fetchSecureLessons();
        const list = Array.isArray(res?.lessons) ? res.lessons : [];
        setLessons(
          list
            .filter(l => l?.id)
            .map(l => ({
              id: l.id,
              title: l.title,
              user_id: l.user_id,
            })),
        );
      } catch {
        setLessons([]);
      }
    })();
  }, [isTeacher, teacherAllowed]);

  const studentNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const s of students) {
      const id = Number(s?.id);
      const name = String(s?.name || '').trim();
      if (id > 0 && name) {
        map.set(id, name);
      }
    }
    return map;
  }, [students]);

  const visibleEvents = useMemo(() => {
    if (!filterStudentId) {
      return events;
    }
    return events.filter(e => eventStudentIds(e).includes(filterStudentId));
  }, [events, filterStudentId]);

  const openCreate = (day: Date, hour?: number) => {
    if (!isTeacher) {
      return;
    }
    const startHour = hour ?? Math.max(new Date().getHours(), 9);
    setSelectedEvent(null);
    setDefaults({
      date: formatYmd(day),
      start_time: `${String(startHour).padStart(2, '0')}:00`,
      end_time: `${String(startHour + 1).padStart(2, '0')}:00`,
      student_ids: filterStudentId ? [filterStudentId] : [],
      location_type: 'lesson',
      lesson_source: 'mine',
    });
    setModalOpen(true);
  };

  const openEvent = (event: ScheduleEvent) => {
    setSelectedEvent(event);
    setDefaults({});
    setModalOpen(true);
  };

  const titleLabel = formatTitle(cursor, view, language);

  const viewLabel =
    view === 'day'
      ? t('schedule.viewDay')
      : view === 'week'
        ? t('schedule.viewWeek')
        : t('schedule.viewMonth');

  const shift = (dir: -1 | 1) => {
    if (view === 'month') {
      setCursor(c => startOfDay(addMonths(c, dir)));
    } else if (view === 'week') {
      setCursor(c => startOfDay(addDays(c, dir * 7)));
    } else {
      setCursor(c => startOfDay(addDays(c, dir)));
    }
  };

  const loadPlans = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      setPlans(await fetchPaymentPlans());
    } catch {
      setPlans([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  const loadStats = useCallback(async (params: LoadStatsParams) => {
    setStatsLoading(true);
    try {
      setStats(await fetchPaymentStats(params));
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  if (isTeacher && (subLoading || !teacherAllowed)) {
    return (
      <View style={styles.root}>
        <View style={[styles.header, {paddingTop: insets.top + 8}]}>
          <AppHeader />
        </View>
        <View style={styles.centered}>
          {subLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.subRequired}>
              {t('lessons.needSubscriptionToStart')}
            </Text>
          )}
        </View>
      </View>
    );
  }

  const weekdayLabels = [
    t('schedule.weekdayMon'),
    t('schedule.weekdayTue'),
    t('schedule.weekdayWed'),
    t('schedule.weekdayThu'),
    t('schedule.weekdayFri'),
    t('schedule.weekdaySat'),
    t('schedule.weekdaySun'),
  ];

  return (
    <View style={styles.root}>
      <View style={[styles.header, {paddingTop: insets.top + 8}]}>
        <AppHeader />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: pageGutter,
            paddingBottom: 32,
            maxWidth: pageContentMaxWidth,
            width: '100%',
            alignSelf: 'center',
            flexGrow: 1,
          },
        ]}>
        <Breadcrumbs
          items={[
            {
              label: t('editor.home'),
              onPress: () => goHome(navigation, isAuthorized, profile),
            },
            {label: t('schedule.titlePage')},
          ]}
        />
        <Text style={styles.pageTitle}>{t('schedule.titlePage')}</Text>
        <Text style={styles.intro}>
          {isStudent
            ? t('schedule.studentSubtitle')
            : t('schedule.teacherSubtitle')}
        </Text>

        {isTeacher && (
          <View style={styles.tabRow}>
            <Pressable
              style={[styles.tabPill, tab === 'calendar' && styles.tabPillOn]}
              onPress={() => setTab('calendar')}>
              <Text
                style={[
                  styles.tabPillText,
                  tab === 'calendar' && styles.tabPillTextOn,
                ]}>
                {t('schedule.tabCalendar')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabPill, tab === 'payments' && styles.tabPillOn]}
              onPress={() => setTab('payments')}>
              <Text
                style={[
                  styles.tabPillText,
                  tab === 'payments' && styles.tabPillTextOn,
                ]}>
                {t('schedule.tabPayments')}
              </Text>
            </Pressable>
          </View>
        )}

        {tab === 'payments' && isTeacher ? (
          <PaymentsTab
            plans={plans}
            stats={stats}
            loading={paymentsLoading}
            statsLoading={statsLoading}
            students={students}
            onRefreshPlans={loadPlans}
            onLoadStats={loadStats}
            onCreate={async data => {
              await createPaymentPlan(data);
            }}
            onUpdate={async (id, data) => {
              await updatePaymentPlan(id, data);
              await refreshRange();
            }}
            onRecord={async id => {
              await recordPayment(id);
              await refreshRange();
            }}
            onDeactivate={async id => {
              await deletePaymentPlan(id);
              await refreshRange();
            }}
          />
        ) : (
          <>
            {isTeacher && (
              <View style={styles.mobileBar}>
                <Pressable
                  style={styles.newLessonBtn}
                  onPress={() => openCreate(cursor)}>
                  <Text style={styles.newLessonBtnText}>
                    {t('schedule.newLesson')}
                  </Text>
                </Pressable>
              </View>
            )}

            {isTeacher && students.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}>
                <Pressable
                  style={[
                    styles.filterChip,
                    filterStudentId == null && styles.filterChipOn,
                  ]}
                  onPress={() => setFilterStudentId(null)}>
                  <View style={[styles.dot, {backgroundColor: '#86868b'}]} />
                  <Text
                    style={[
                      styles.filterChipText,
                      filterStudentId == null && styles.filterChipTextOn,
                    ]}>
                    {t('schedule.allStudents')}
                  </Text>
                </Pressable>
                {students.map(s => {
                  const on = filterStudentId === s.id;
                  const c = colorForStudent(s.id);
                  return (
                    <Pressable
                      key={s.id}
                      style={[styles.filterChip, on && styles.filterChipOn]}
                      onPress={() => setFilterStudentId(s.id)}>
                      <View style={[styles.dot, {backgroundColor: c}]} />
                      <Text
                        style={[
                          styles.filterChipText,
                          on && styles.filterChipTextOn,
                        ]}>
                        {s.name || `#${s.id}`}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <View
              style={[
                styles.calendarPane,
                {minHeight: isTablet ? 640 : 560},
              ]}>
              <View style={styles.toolbar}>
                <View style={styles.toolbarTop}>
                  <View style={styles.toolbarLeft}>
                    <Pressable
                      style={styles.todayBtn}
                      onPress={() => setCursor(startOfDay(new Date()))}>
                      <Text style={styles.todayBtnText}>
                        {t('schedule.today')}
                      </Text>
                    </Pressable>
                    <Pressable style={styles.navBtn} onPress={() => shift(-1)}>
                      <Text style={styles.navBtnText}>‹</Text>
                    </Pressable>
                    <Pressable style={styles.navBtn} onPress={() => shift(1)}>
                      <Text style={styles.navBtnText}>›</Text>
                    </Pressable>
                  </View>
                  <Pressable
                    style={styles.viewTrigger}
                    onPress={() => setViewMenuOpen(v => !v)}>
                    <Text style={styles.viewTriggerText}>{viewLabel}</Text>
                    <Text style={styles.viewTriggerChevron}>
                      {viewMenuOpen ? '▴' : '▾'}
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.titleWrap}>
                  <Text style={styles.calTitle}>{titleLabel}</Text>
                  <Text style={styles.tzHint} numberOfLines={1}>
                    {t('schedule.localTimezoneHint').replace('{{tz}}', tzLabel)}
                  </Text>
                </View>
                {viewMenuOpen && (
                  <View style={styles.viewMenuRow}>
                    {(['day', 'week', 'month'] as const).map(v => {
                      const active = view === v;
                      const label =
                        v === 'day'
                          ? t('schedule.viewDay')
                          : v === 'week'
                            ? t('schedule.viewWeek')
                            : t('schedule.viewMonth');
                      return (
                        <Pressable
                          key={v}
                          style={[
                            styles.viewMenuItem,
                            active && styles.viewMenuItemActive,
                          ]}
                          onPress={() => {
                            setView(v);
                            setViewMenuOpen(false);
                          }}>
                          <Text
                            style={[
                              styles.viewMenuItemText,
                              active && styles.viewMenuItemTextActive,
                            ]}>
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

              <View style={styles.viewBody}>
                {loading ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : view === 'month' ? (
                  <MonthView
                    cursor={cursor}
                    events={visibleEvents}
                    detailed={isTeacher}
                    nameById={studentNameById}
                    weekdayLabels={weekdayLabels}
                    onDayClick={day => {
                      setCursor(startOfDay(day));
                      if (isTeacher) {
                        openCreate(day);
                      } else {
                        setView('day');
                      }
                    }}
                    onEventClick={openEvent}
                  />
                ) : view === 'week' ? (
                  <WeekView
                    cursor={cursor}
                    events={visibleEvents}
                    detailed={isTeacher}
                    nameById={studentNameById}
                    onSlotClick={openCreate}
                    onEventClick={openEvent}
                  />
                ) : (
                  <DayView
                    cursor={cursor}
                    events={visibleEvents}
                    nameById={studentNameById}
                    onSlotClick={openCreate}
                    onEventClick={openEvent}
                  />
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <EventFormModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        readOnly={!isTeacher}
        event={selectedEvent}
        defaults={defaults}
        students={students}
        lessons={lessons}
        defaultEmail={profile?.login || profile?.email || ''}
        onSave={async (payload, editingId) => {
          if (editingId) {
            await updateScheduleEvent(editingId, payload);
          } else {
            await createScheduleEvent(payload);
          }
          await refreshRange();
        }}
        onDelete={async (id, scope) => {
          await deleteScheduleEvent(id, scope);
          await refreshRange();
        }}
        onEmail={async (id, email) => {
          await emailScheduleEvent(id, email);
        }}
        onRecordPayment={async planId => {
          await recordPayment(planId);
          await refreshRange();
          await loadPlans();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F9F9F9'},
  header: {
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ececf0',
  },
  content: {paddingTop: 12},
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
  },
  intro: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 16,
  },
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  subRequired: {
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  tabRow: {flexDirection: 'row', gap: 8, marginBottom: 16},
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#ECECF0',
  },
  tabPillOn: {backgroundColor: colors.primary},
  tabPillText: {fontWeight: '700', fontSize: 13, color: colors.text},
  tabPillTextOn: {color: colors.white},
  mobileBar: {marginBottom: 10},
  newLessonBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  newLessonBtnText: {color: colors.white, fontWeight: '700', fontSize: 12},
  filterRow: {gap: 8, paddingBottom: 12, alignItems: 'center'},
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f1f1f4',
  },
  filterChipOn: {backgroundColor: '#f0edfd'},
  filterChipText: {fontSize: 13, fontWeight: '700', color: '#181818'},
  filterChipTextOn: {color: colors.primary},
  dot: {width: 10, height: 10, borderRadius: 5},
  calendarPane: {
    backgroundColor: '#f1f1f4',
    borderRadius: 20,
    overflow: 'hidden',
    flex: 1,
  },
  toolbar: {
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(24,24,24,0.06)',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  toolbarTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayBtn: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#181818',
  },
  navBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: {fontSize: 16, color: '#181818', fontWeight: '600'},
  titleWrap: {
    paddingRight: 4,
  },
  calTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: '#181818',
    textTransform: 'capitalize',
  },
  tzHint: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '500',
    color: '#86868b',
  },
  viewTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  viewTriggerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#181818',
  },
  viewTriggerChevron: {
    fontSize: 11,
    color: '#86868b',
    fontWeight: '700',
  },
  viewMenuRow: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
  },
  viewMenuItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewMenuItemActive: {
    backgroundColor: colors.primary,
  },
  viewMenuItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#181818',
  },
  viewMenuItemTextActive: {
    color: '#fff',
  },
  viewBody: {
    flex: 1,
    backgroundColor: '#fff',
    minHeight: 480,
  },
  loadingBox: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
