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
  formatHm,
  formatMoney,
  formatYmd,
  getLocalTimeZone,
  localDateTimeToIso,
} from '../lib/date';
import {
  colorForStudent,
  eventStudentIds,
  type EventFormValues,
  type ScheduleEvent,
} from '../model/types';
import {packageProgressLabel} from '../lib/eventUi';
import {DEFAULT_PAYMENT_CURRENCY} from '../lib/currencies';

type StudentOption = {id: number; name?: string; email?: string};
type LessonOption = {id: number; title?: string; user_id?: number};

type Props = {
  visible: boolean;
  onClose: () => void;
  readOnly?: boolean;
  event?: ScheduleEvent | null;
  defaults?: Partial<EventFormValues>;
  students: StudentOption[];
  lessons: LessonOption[];
  defaultEmail?: string;
  onSave: (
    payload: Record<string, unknown>,
    editingId?: number,
  ) => Promise<void>;
  onDelete?: (id: number, scope: string) => Promise<void>;
  onEmail?: (id: number, email: string) => Promise<void>;
  onRecordPayment?: (planId: number) => Promise<void>;
};

const emptyForm = (defaults?: Partial<EventFormValues>): EventFormValues => ({
  student_ids: defaults?.student_ids ?? [],
  title: defaults?.title ?? '',
  date: defaults?.date ?? formatYmd(new Date()),
  start_time: defaults?.start_time ?? '10:00',
  end_time: defaults?.end_time ?? '11:00',
  location_type: defaults?.location_type ?? 'lesson',
  lesson_source: defaults?.lesson_source ?? 'mine',
  lesson_id: defaults?.lesson_id ?? '',
  location_text: defaults?.location_text ?? '',
  notes: defaults?.notes ?? '',
  recurrence: defaults?.recurrence ?? '',
});

export function EventFormModal({
  visible,
  onClose,
  readOnly,
  event,
  defaults,
  students,
  lessons,
  defaultEmail,
  onSave,
  onDelete,
  onEmail,
  onRecordPayment,
}: Props) {
  const {t} = useI18n();
  const insets = useSafeAreaInsets();
  const isPayment = event?.type === 'payment';
  const isEdit = Boolean(event && !isPayment && typeof event.id === 'number');
  const [form, setForm] = useState<EventFormValues>(emptyForm(defaults));
  const [email, setEmail] = useState(defaultEmail || '');
  const [scope, setScope] = useState<'this' | 'this_and_future'>('this');
  const [busy, setBusy] = useState(false);
  const [lessonPickerOpen, setLessonPickerOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }
    if (event && event.type === 'lesson') {
      const ids = eventStudentIds(event);
      const lesson = lessons.find(l => l.id === event.lesson_id);
      const start = new Date(event.starts_at);
      const end = new Date(event.ends_at);
      setForm({
        student_ids: ids,
        title: event.title || '',
        date: formatYmd(start),
        start_time: formatHm(start),
        end_time: formatHm(end),
        location_type: event.location_type || 'lesson',
        lesson_source: Number(lesson?.user_id) === 1 ? '2easy' : 'mine',
        lesson_id: event.lesson_id || '',
        location_text: event.location_text || '',
        notes: event.notes || '',
        recurrence: '',
      });
    } else {
      setForm(emptyForm(defaults));
    }
    setEmail(defaultEmail || '');
    setScope('this');
    setLessonPickerOpen(false);
  }, [visible, event, defaults, defaultEmail, lessons]);

  const filteredLessons = useMemo(() => {
    if (form.lesson_source === '2easy') {
      return lessons.filter(l => Number(l.user_id) === 1);
    }
    return lessons.filter(l => Number(l.user_id) !== 1);
  }, [lessons, form.lesson_source]);

  const selectedLessonLabel = useMemo(() => {
    if (!form.lesson_id) {
      return t('schedule.lessonNone');
    }
    const found = filteredLessons.find(l => l.id === form.lesson_id);
    return found?.title || `#${form.lesson_id}`;
  }, [form.lesson_id, filteredLessons, t]);

  const title = useMemo(() => {
    if (isPayment) {
      return event?.is_overdue
        ? t('schedule.paymentOverdue')
        : t('schedule.paymentMarker');
    }
    if (readOnly) {
      return t('schedule.lessonDetails');
    }
    return isEdit ? t('schedule.editLesson') : t('schedule.newLesson');
  }, [isPayment, readOnly, isEdit, event?.is_overdue, t]);

  const studentNamesLabel = useMemo(() => {
    return form.student_ids
      .map(id => {
        const s = students.find(x => Number(x.id) === Number(id));
        return String(s?.name || '').trim() || null;
      })
      .filter(Boolean)
      .join(', ');
  }, [form.student_ids, students]);

  const toggleStudent = (id: number) => {
    setForm(f => {
      const has = f.student_ids.includes(id);
      return {
        ...f,
        student_ids: has
          ? f.student_ids.filter(x => x !== id)
          : [...f.student_ids, id],
      };
    });
  };

  const handleSave = async () => {
    if (
      !form.student_ids.length ||
      !form.date ||
      !form.start_time ||
      !form.end_time
    ) {
      Alert.alert('', t('schedule.fillRequired'));
      return;
    }
    setBusy(true);
    try {
      const starts_at = localDateTimeToIso(form.date, form.start_time);
      const ends_at = localDateTimeToIso(form.date, form.end_time);
      const hasLesson =
        form.location_type === 'lesson' && Boolean(form.lesson_id);
      const eventTitle =
        form.title.trim() ||
        studentNamesLabel ||
        t('schedule.defaultLessonTitle');
      await onSave(
        {
          student_ids: form.student_ids,
          student_id: form.student_ids[0],
          title: eventTitle,
          starts_at,
          ends_at,
          timezone: getLocalTimeZone(),
          location_type: hasLesson ? 'lesson' : 'text',
          lesson_id: hasLesson ? Number(form.lesson_id) : null,
          location_text:
            !hasLesson && form.location_type === 'text'
              ? form.location_text
              : null,
          notes: form.notes || null,
          recurrence: !isEdit && form.recurrence ? form.recurrence : null,
          scope: isEdit ? scope : undefined,
        },
        isEdit ? Number(event!.id) : undefined,
      );
      onClose();
    } catch (e) {
      Alert.alert(
        '',
        e instanceof Error ? e.message : t('common.error'),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!event || typeof event.id !== 'number' || !onDelete) {
      return;
    }
    setBusy(true);
    try {
      await onDelete(event.id, scope);
      onClose();
    } catch (e) {
      Alert.alert(
        '',
        e instanceof Error ? e.message : t('common.error'),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleEmail = async () => {
    if (!event || typeof event.id !== 'number' || !onEmail) {
      return;
    }
    if (!email.trim()) {
      Alert.alert('', t('schedule.emailRequired'));
      return;
    }
    setBusy(true);
    try {
      await onEmail(event.id, email.trim());
      Alert.alert('', t('schedule.emailSent'));
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[styles.root, {paddingTop: insets.top + 8}]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.close}>{t('schedule.close')}</Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={[
            styles.body,
            {paddingBottom: Math.max(insets.bottom, 16) + 24},
          ]}
          keyboardShouldPersistTaps="handled">
          {isPayment ? (
            <View style={styles.block}>
              {event?.is_overdue ? (
                <View style={styles.overdueBanner}>
                  <Text style={styles.overdueTitle}>
                    {t('schedule.paymentOverdue')}
                  </Text>
                  <Text style={styles.overdueHint}>
                    {t('schedule.askForPayment')}
                  </Text>
                </View>
              ) : null}
              <Text style={styles.row}>
                {t('schedule.student')}:{' '}
                <Text style={styles.bold}>
                  {event?.student_name || event?.student_id}
                </Text>
              </Text>
              <Text style={styles.row}>
                {t('schedule.amount')}:{' '}
                <Text style={styles.bold}>
                  {formatMoney(
                    Number(event?.amount || 0),
                    event?.currency || DEFAULT_PAYMENT_CURRENCY,
                  )}
                </Text>
              </Text>
              {!readOnly && event?.plan_id && onRecordPayment ? (
                <Pressable
                  style={[
                    styles.primaryBtn,
                    event?.is_overdue && styles.dangerBtn,
                  ]}
                  disabled={busy}
                  onPress={() => {
                    void (async () => {
                      setBusy(true);
                      try {
                        await onRecordPayment(event.plan_id!);
                        onClose();
                      } finally {
                        setBusy(false);
                      }
                    })();
                  }}>
                  {busy ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {t('schedule.markPaid')}
                    </Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          ) : (
            <>
              {!readOnly && (
                <>
                  <Text style={styles.sectionLabel}>
                    {t('schedule.students')}
                  </Text>
                  <View style={styles.chips}>
                    {students.map(s => {
                      const active = form.student_ids.includes(s.id);
                      const c = colorForStudent(s.id);
                      return (
                        <Pressable
                          key={s.id}
                          onPress={() => toggleStudent(s.id)}
                          style={[
                            styles.chip,
                            active && {
                              backgroundColor: c,
                              borderColor: c,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.chipText,
                              active && styles.chipTextActive,
                            ]}>
                            {s.name || `#${s.id}`}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {event && packageProgressLabel(event) ? (
                    <Text style={[styles.row, styles.packageBadge, {marginBottom: 12}]}>
                      {t('schedule.planPackage')}: {packageProgressLabel(event)}
                    </Text>
                  ) : null}
                  <TextField
                    label={t('schedule.titleOptional')}
                    value={form.title}
                    onChangeText={v => setForm(f => ({...f, title: v}))}
                    placeholder={t('schedule.titleOptionalHint')}
                  />
                  <TextField
                    label={t('schedule.date')}
                    value={form.date}
                    onChangeText={v => setForm(f => ({...f, date: v}))}
                    placeholder="YYYY-MM-DD"
                    autoCapitalize="none"
                  />
                  <View style={styles.rowFields}>
                    <View style={styles.half}>
                      <TextField
                        label={t('schedule.start')}
                        value={form.start_time}
                        onChangeText={v =>
                          setForm(f => ({...f, start_time: v}))
                        }
                        placeholder="HH:mm"
                        autoCapitalize="none"
                      />
                    </View>
                    <View style={styles.half}>
                      <TextField
                        label={t('schedule.end')}
                        value={form.end_time}
                        onChangeText={v =>
                          setForm(f => ({...f, end_time: v}))
                        }
                        placeholder="HH:mm"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                  <Text style={styles.sectionLabel}>
                    {t('schedule.placeType')}
                  </Text>
                  <View style={styles.segment}>
                    {(['lesson', 'text'] as const).map(key => (
                      <Pressable
                        key={key}
                        style={[
                          styles.segmentBtn,
                          form.location_type === key && styles.segmentActive,
                        ]}
                        onPress={() =>
                          setForm(f => ({...f, location_type: key}))
                        }>
                        <Text
                          style={[
                            styles.segmentText,
                            form.location_type === key &&
                              styles.segmentTextActive,
                          ]}>
                          {key === 'lesson'
                            ? t('schedule.placeLesson')
                            : t('schedule.placeText')}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {form.location_type === 'lesson' ? (
                    <View style={styles.lessonBox}>
                      <Text style={styles.sectionLabel}>
                        {t('schedule.lessonSource')}
                      </Text>
                      <View style={styles.segment}>
                        {(['mine', '2easy'] as const).map(key => (
                          <Pressable
                            key={key}
                            style={[
                              styles.segmentBtn,
                              form.lesson_source === key &&
                                styles.segmentActive,
                            ]}
                            onPress={() =>
                              setForm(f => ({
                                ...f,
                                lesson_source: key,
                                lesson_id: '',
                              }))
                            }>
                            <Text
                              style={[
                                styles.segmentText,
                                form.lesson_source === key &&
                                  styles.segmentTextActive,
                              ]}>
                              {key === 'mine'
                                ? t('schedule.lessonSourceMine')
                                : t('schedule.lessonSource2easy')}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      <Text style={styles.selectLabel}>
                        {t('schedule.lesson')}
                      </Text>
                      <Pressable
                        style={styles.selectField}
                        onPress={() => setLessonPickerOpen(true)}>
                        <Text
                          style={styles.selectValue}
                          numberOfLines={1}>
                          {selectedLessonLabel}
                        </Text>
                        <Text style={styles.selectChevron}>▾</Text>
                      </Pressable>
                      {!filteredLessons.length && (
                        <Text style={styles.selectHint}>
                          {t('schedule.noLessonsInSource')}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <TextField
                      label={t('schedule.location')}
                      value={form.location_text}
                      onChangeText={v =>
                        setForm(f => ({...f, location_text: v}))
                      }
                    />
                  )}
                  <TextField
                    label={t('schedule.notes')}
                    value={form.notes}
                    onChangeText={v => setForm(f => ({...f, notes: v}))}
                    multiline
                  />
                  {!isEdit && (
                    <>
                      <Text style={styles.sectionLabel}>
                        {t('schedule.repeat')}
                      </Text>
                      <View style={styles.chips}>
                        {(
                          [
                            '',
                            'daily',
                            'weekly',
                            'biweekly',
                            'monthly',
                          ] as const
                        ).map(key => {
                          const active = form.recurrence === key;
                          const label =
                            key === ''
                              ? t('schedule.repeatNone')
                              : key === 'daily'
                                ? t('schedule.repeatDaily')
                                : key === 'weekly'
                                  ? t('schedule.repeatWeekly')
                                  : key === 'biweekly'
                                    ? t('schedule.repeatBiweekly')
                                    : t('schedule.repeatMonthly');
                          return (
                            <Pressable
                              key={key || 'none'}
                              style={[
                                styles.chip,
                                active && styles.chipSelected,
                              ]}
                              onPress={() =>
                                setForm(f => ({...f, recurrence: key}))
                              }>
                              <Text
                                style={[
                                  styles.chipText,
                                  active && styles.chipTextDark,
                                ]}>
                                {label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </>
                  )}
                  {isEdit && (
                    <>
                      <Text style={styles.sectionLabel}>
                        {t('schedule.seriesScope')}
                      </Text>
                      <View style={styles.segment}>
                        {(
                          [
                            ['this', t('schedule.scopeThis')],
                            ['this_and_future', t('schedule.scopeFuture')],
                          ] as const
                        ).map(([key, label]) => (
                          <Pressable
                            key={key}
                            style={[
                              styles.segmentBtn,
                              scope === key && styles.segmentActive,
                            ]}
                            onPress={() => setScope(key)}>
                            <Text
                              style={[
                                styles.segmentText,
                                scope === key && styles.segmentTextActive,
                              ]}>
                              {label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  )}
                </>
              )}
              {readOnly && (
                <View style={styles.block}>
                  <Text style={styles.row}>
                    {t('schedule.students')}:{' '}
                    <Text style={styles.bold}>
                      {studentNamesLabel ||
                        event?.student_name ||
                        t('schedule.defaultLessonTitle')}
                    </Text>
                    {event && packageProgressLabel(event) ? (
                      <Text style={styles.packageBadge}>
                        {' '}
                        {packageProgressLabel(event)}
                      </Text>
                    ) : null}
                  </Text>
                  <Text style={styles.row}>
                    {t('schedule.date')}:{' '}
                    <Text style={styles.bold}>
                      {form.date} {form.start_time}–{form.end_time}
                    </Text>
                  </Text>
                  {!!form.notes && (
                    <Text style={styles.row}>
                      {t('schedule.notes')}: {form.notes}
                    </Text>
                  )}
                </View>
              )}
              {isEdit && onEmail && (
                <View style={styles.block}>
                  <TextField
                    label={t('schedule.emailTo')}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <Pressable
                    style={styles.secondaryBtn}
                    disabled={busy}
                    onPress={() => void handleEmail()}>
                    <Text style={styles.secondaryBtnText}>
                      {t('schedule.sendCalendar')}
                    </Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </ScrollView>
        {!isPayment && !readOnly && (
          <View
            style={[
              styles.footer,
              {paddingBottom: Math.max(insets.bottom, 12)},
            ]}>
            {isEdit && onDelete ? (
              <Pressable
                style={styles.deleteBtn}
                disabled={busy}
                onPress={() => void handleDelete()}>
                <Text style={styles.deleteBtnText}>{t('schedule.delete')}</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Pressable
              style={styles.primaryBtn}
              disabled={busy}
              onPress={() => void handleSave()}>
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryBtnText}>{t('schedule.save')}</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>

      {lessonPickerOpen && (
        <View style={styles.pickerOverlay} pointerEvents="box-none">
          <View style={[styles.pickerSheet, {paddingBottom: Math.max(insets.bottom, 16)}]}>
            <View style={styles.pickerHeader}>
              <Text style={styles.headerTitle}>{t('schedule.pickLesson')}</Text>
              <Pressable onPress={() => setLessonPickerOpen(false)} hitSlop={8}>
                <Text style={styles.close}>{t('schedule.close')}</Text>
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.pickerBody}
              keyboardShouldPersistTaps="handled">
              <Pressable
                style={[
                  styles.pickerItem,
                  !form.lesson_id && styles.pickerItemActive,
                ]}
                onPress={() => {
                  setForm(f => ({...f, lesson_id: ''}));
                  setLessonPickerOpen(false);
                }}>
                <Text
                  style={[
                    styles.pickerItemText,
                    !form.lesson_id && styles.pickerItemTextActive,
                  ]}>
                  {t('schedule.lessonNone')}
                </Text>
              </Pressable>
              {filteredLessons.map(l => {
                const active = form.lesson_id === l.id;
                return (
                  <Pressable
                    key={l.id}
                    style={[
                      styles.pickerItem,
                      active && styles.pickerItemActive,
                    ]}
                    onPress={() => {
                      setForm(f => ({...f, lesson_id: l.id}));
                      setLessonPickerOpen(false);
                    }}>
                    <Text
                      style={[
                        styles.pickerItemText,
                        active && styles.pickerItemTextActive,
                      ]}
                      numberOfLines={2}>
                      {l.title || `#${l.id}`}
                    </Text>
                  </Pressable>
                );
              })}
              {!filteredLessons.length && (
                <Text style={styles.selectHint}>
                  {t('schedule.noLessonsInSource')}
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.white},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8e8ed',
  },
  headerTitle: {fontSize: 18, fontWeight: '700', color: colors.text, flex: 1},
  close: {color: colors.primary, fontWeight: '700', fontSize: 15},
  body: {padding: 16},
  block: {gap: 10, marginBottom: 12},
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12},
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(63,40,198,0.25)',
    backgroundColor: colors.primarySoft,
    maxWidth: '100%',
  },
  chipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  chipText: {fontSize: 13, fontWeight: '600', color: colors.primary},
  chipTextActive: {color: colors.white},
  chipTextDark: {color: colors.primary},
  lessonBox: {
    borderWidth: 1,
    borderColor: '#e8e8ed',
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 12,
  },
  selectLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(63,40,198,0.25)',
    borderRadius: radii.md,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  selectValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginRight: 8,
  },
  selectChevron: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
  selectHint: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    maxHeight: '78%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8e8ed',
  },
  pickerBody: {padding: 16, gap: 8},
  pickerItem: {
    borderWidth: 1,
    borderColor: 'rgba(63,40,198,0.18)',
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
  },
  pickerItemActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  pickerItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  pickerItemTextActive: {
    color: colors.primary,
  },
  rowFields: {flexDirection: 'row', gap: 10},
  half: {flex: 1},
  segment: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  segmentBtn: {
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(63,40,198,0.2)',
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentText: {fontSize: 13, fontWeight: '700', color: colors.primary},
  segmentTextActive: {color: colors.white},
  row: {fontSize: 15, color: colors.text, lineHeight: 22},
  bold: {fontWeight: '700'},
  packageBadge: {
    fontWeight: '700',
    color: colors.primary,
  },
  overdueBanner: {
    backgroundColor: 'rgba(255,59,48,0.1)',
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 8,
  },
  overdueTitle: {color: '#FF3B30', fontWeight: '700', fontSize: 15},
  overdueHint: {color: '#FF3B30', fontSize: 13, marginTop: 4, opacity: 0.9},
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e8e8ed',
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 120,
    alignItems: 'center',
  },
  dangerBtn: {backgroundColor: '#FF3B30'},
  primaryBtnText: {color: colors.white, fontWeight: '700', fontSize: 15},
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {color: colors.primary, fontWeight: '700'},
  deleteBtn: {paddingVertical: 12, paddingHorizontal: 8},
  deleteBtnText: {color: '#FF3B30', fontWeight: '700'},
});
