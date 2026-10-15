import {useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';

import {useI18n} from '../../../../shared/i18n';
import {
  eventsOnDay,
  formatHm,
  HOURS,
  isSameDay,
  nowScrollTop,
  weekDays,
  weekdayShort,
} from '../../lib/date';
import {eventChipText, eventMinHeight} from '../../lib/eventUi';
import {
  backgroundForColors,
  colorsForEvent,
  type ScheduleEvent,
} from '../../model/types';

const APPLE_BLUE = '#007AFF';
const HOUR_HEIGHT = 52;
const LABEL_W = 52;
const DAY_MIN_W = 88;
const GRID_HEIGHT = HOURS.length * HOUR_HEIGHT;

type Props = {
  cursor: Date;
  events: ScheduleEvent[];
  detailed?: boolean;
  nameById?: Map<number, string>;
  onSlotClick: (day: Date, hour: number) => void;
  onEventClick: (event: ScheduleEvent) => void;
};

export function WeekView({
  cursor,
  events,
  detailed,
  nameById,
  onSlotClick,
  onEventClick,
}: Props) {
  const {t, language} = useI18n();
  const scrollRef = useRef<ScrollView>(null);
  const days = weekDays(cursor);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const showNowLine = days.some(d => isSameDay(d, today));
  const [now, setNow] = useState(() => new Date());
  const gridWidth = LABEL_W + days.length * DAY_MIN_W;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: nowScrollTop(HOUR_HEIGHT),
        animated: false,
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [cursor]);

  const nowTop = useMemo(() => {
    if (!showNowLine) {
      return null;
    }
    const h = now.getHours() + now.getMinutes() / 60;
    if (h < HOURS[0] || h > HOURS[HOURS.length - 1] + 1) {
      return null;
    }
    return (h - HOURS[0]) * HOUR_HEIGHT;
  }, [now, showNowLine]);

  const chipOpts = {
    nameById,
    defaultLessonTitle: t('schedule.defaultLessonTitle'),
    paymentMarker: t('schedule.paymentMarker'),
    paymentOverdueShort: t('schedule.paymentOverdueShort'),
    askForPayment: t('schedule.askForPayment'),
  };

  return (
    <View style={styles.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces>
        <View style={{width: Math.max(gridWidth, 680)}}>
          <View style={styles.headRow}>
            <View style={{width: LABEL_W}} />
            {days.map(day => {
              const isToday = isSameDay(day, today);
              return (
                <View key={day.toISOString()} style={styles.headCell}>
                  <Text
                    style={[styles.headWeekday, isToday && styles.headToday]}>
                    {weekdayShort(day, language)}
                  </Text>
                  <View
                    style={[
                      styles.headCircle,
                      isToday && styles.headCircleToday,
                    ]}>
                    <Text
                      style={[
                        styles.headDayNum,
                        isToday && styles.headDayNumToday,
                      ]}>
                      {day.getDate()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.vScroll}
            showsVerticalScrollIndicator={false}>
            <View style={{height: GRID_HEIGHT + 20, width: '100%'}}>
              <View style={styles.gridRow}>
                <View style={[styles.timeCol, {height: GRID_HEIGHT}]}>
                  {HOURS.map(hour => (
                    <View
                      key={hour}
                      style={[
                        styles.timeCell,
                        {
                          top: (hour - HOURS[0]) * HOUR_HEIGHT,
                          height: HOUR_HEIGHT,
                        },
                      ]}>
                      <Text style={styles.timeText}>
                        {`${String(hour).padStart(2, '0')}:00`}
                      </Text>
                    </View>
                  ))}
                </View>

                {days.map(day => (
                  <View
                    key={day.toISOString()}
                    style={[styles.dayCol, {height: GRID_HEIGHT}]}>
                    {HOURS.map(hour => (
                      <Pressable
                        key={`${day.toISOString()}-${hour}`}
                        style={[
                          styles.slot,
                          {
                            top: (hour - HOURS[0]) * HOUR_HEIGHT,
                            height: HOUR_HEIGHT,
                          },
                        ]}
                        onPress={() => onSlotClick(day, hour)}
                      />
                    ))}
                    {eventsOnDay(events, day).map(event => {
                      const start = new Date(event.starts_at);
                      const end = new Date(event.ends_at);
                      const startHour =
                        start.getHours() + start.getMinutes() / 60;
                      const durationHours = Math.max(
                        (end.getTime() - start.getTime()) / 3_600_000,
                        event.type === 'payment' ? 1 : 0.4,
                      );
                      const top = (startHour - HOURS[0]) * HOUR_HEIGHT;
                      const height = Math.min(
                        durationHours * HOUR_HEIGHT,
                        GRID_HEIGHT - top,
                      );
                      if (top >= GRID_HEIGHT || height <= 0) {
                        return null;
                      }
                      const chip = eventChipText(event, {
                        ...chipOpts,
                        detailed: detailed || event.type === 'payment',
                        time: formatHm(start),
                      });
                      const minH = eventMinHeight(event, HOUR_HEIGHT);
                      const boxH = Math.max(height, minH);
                      const bg = backgroundForColors(colorsForEvent(event));
                      return (
                        <Pressable
                          key={String(event.id)}
                          style={[
                            styles.eventPlaque,
                            {
                              top: Math.max(top, 0),
                              height: boxH,
                              backgroundColor: bg,
                            },
                          ]}
                          onPress={() => onEventClick(event)}>
                          <Text style={styles.eventPrimary} numberOfLines={1}>
                            {chip.primary}
                          </Text>
                          {!!chip.secondary && boxH >= 32 && (
                            <Text
                              style={styles.eventSecondary}
                              numberOfLines={1}>
                              {chip.secondary}
                            </Text>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>

              {nowTop != null && showNowLine && (
                <View
                  style={[styles.nowLine, {top: nowTop}]}
                  pointerEvents="none">
                  <View style={styles.nowDot} />
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
    minHeight: 520,
  },
  headRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8e8ed',
    backgroundColor: '#fff',
  },
  headCell: {
    flex: 1,
    minWidth: DAY_MIN_W,
    alignItems: 'center',
    paddingVertical: 8,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: '#e8e8ed',
  },
  headWeekday: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#86868b',
  },
  headToday: {color: APPLE_BLUE},
  headCircle: {
    marginTop: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headCircleToday: {backgroundColor: APPLE_BLUE},
  headDayNum: {fontSize: 17, fontWeight: '600', color: '#1d1d1f'},
  headDayNumToday: {color: '#fff'},
  vScroll: {flex: 1, maxHeight: 480},
  gridRow: {flexDirection: 'row'},
  timeCol: {
    width: LABEL_W,
    position: 'relative',
  },
  timeCell: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f0f0f5',
    paddingRight: 6,
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 11,
    color: '#aeaeb2',
    marginTop: -7,
  },
  dayCol: {
    flex: 1,
    minWidth: DAY_MIN_W,
    position: 'relative',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: '#f0f0f5',
  },
  slot: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f0f0f5',
  },
  eventPlaque: {
    position: 'absolute',
    left: 2,
    right: 2,
    zIndex: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  eventPrimary: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  eventSecondary: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
  },
  nowLine: {
    position: 'absolute',
    left: LABEL_W,
    right: 0,
    height: 2,
    backgroundColor: '#f7531f',
    zIndex: 2,
  },
  nowDot: {
    position: 'absolute',
    left: -4,
    top: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f7531f',
  },
});
