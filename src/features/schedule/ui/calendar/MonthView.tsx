import {Pressable, StyleSheet, Text, View} from 'react-native';

import {useI18n} from '../../../../shared/i18n';
import {eventsOnDay, formatHm, isSameDay, monthMatrix} from '../../lib/date';
import {eventChipText} from '../../lib/eventUi';
import {
  backgroundForColors,
  colorsForEvent,
  type ScheduleEvent,
} from '../../model/types';

const APPLE_BLUE = '#007AFF';

type Props = {
  cursor: Date;
  events: ScheduleEvent[];
  detailed?: boolean;
  nameById?: Map<number, string>;
  weekdayLabels: string[];
  onDayClick: (day: Date) => void;
  onEventClick: (event: ScheduleEvent) => void;
};

export function MonthView({
  cursor,
  events,
  detailed,
  nameById,
  weekdayLabels,
  onDayClick,
  onEventClick,
}: Props) {
  const {t} = useI18n();
  const weeks = monthMatrix(cursor);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const chipOpts = {
    detailed,
    nameById,
    defaultLessonTitle: t('schedule.defaultLessonTitle'),
    paymentMarker: t('schedule.paymentMarker'),
    paymentOverdueShort: t('schedule.paymentOverdueShort'),
    askForPayment: t('schedule.askForPayment'),
  };

  return (
    <View style={styles.root}>
      <View style={styles.weekdayRow}>
        {weekdayLabels.map(label => (
          <Text key={label} style={styles.weekday}>
            {label}
          </Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map(day => {
            const dayEvents = eventsOnDay(events, day);
            const inMonth = day.getMonth() === cursor.getMonth();
            const isToday = isSameDay(day, today);
            return (
              <Pressable
                key={day.toISOString()}
                style={[
                  styles.cell,
                  !inMonth && styles.cellOut,
                ]}
                onPress={() => onDayClick(day)}>
                <View
                  style={[styles.dayCircle, isToday && styles.dayCircleToday]}>
                  <Text
                    style={[
                      styles.dayNum,
                      !inMonth && styles.dayNumOut,
                      isToday && styles.dayNumToday,
                    ]}>
                    {day.getDate()}
                  </Text>
                </View>
                <View style={styles.chips}>
                  {dayEvents.slice(0, 3).map(event => {
                    const chip = eventChipText(event, {
                      ...chipOpts,
                      time: formatHm(new Date(event.starts_at)),
                    });
                    const bg = backgroundForColors(colorsForEvent(event));
                    return (
                      <Pressable
                        key={String(event.id)}
                        style={[styles.chip, {backgroundColor: bg}]}
                        onPress={() => onEventClick(event)}>
                        <Text style={styles.chipText} numberOfLines={1}>
                          {chip.primary}
                          {detailed && chip.secondary
                            ? ` · ${chip.secondary}`
                            : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <Text style={styles.more}>+{dayEvents.length - 3}</Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#fff',
    minHeight: 420,
  },
  weekdayRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8e8ed',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    color: '#86868b',
  },
  weekRow: {
    flexDirection: 'row',
    minHeight: 84,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f5',
  },
  cell: {
    flex: 1,
    minWidth: 0,
    padding: 4,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#f0f0f5',
    backgroundColor: '#fff',
  },
  cellOut: {backgroundColor: '#fafafa'},
  dayCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dayCircleToday: {backgroundColor: APPLE_BLUE},
  dayNum: {fontSize: 12, fontWeight: '600', color: '#1d1d1f'},
  dayNumOut: {color: '#aeaeb2'},
  dayNumToday: {color: '#fff'},
  chips: {gap: 2},
  chip: {
    borderRadius: 5,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  chipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  more: {
    fontSize: 10,
    color: '#86868b',
    paddingHorizontal: 2,
  },
});
