import {useEffect, useMemo, useRef, useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import {useI18n} from '../../../../shared/i18n';
import {
  eventsOnDay,
  formatHm,
  HOURS,
  isSameDay,
  nowScrollTop,
  weekdayLong,
} from '../../lib/date';
import {eventChipText, eventMinHeight} from '../../lib/eventUi';
import {
  backgroundForColors,
  colorsForEvent,
  type ScheduleEvent,
} from '../../model/types';

const APPLE_BLUE = '#007AFF';
const HOUR_HEIGHT = 60;
const LABEL_W = 56;
const GRID_HEIGHT = HOURS.length * HOUR_HEIGHT;

type Props = {
  cursor: Date;
  events: ScheduleEvent[];
  nameById?: Map<number, string>;
  onSlotClick: (day: Date, hour: number) => void;
  onEventClick: (event: ScheduleEvent) => void;
};

export function DayView({
  cursor,
  events,
  nameById,
  onSlotClick,
  onEventClick,
}: Props) {
  const {t, language} = useI18n();
  const scrollRef = useRef<ScrollView>(null);
  const dayEvents = eventsOnDay(events, cursor);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const isToday = isSameDay(cursor, today);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const target = isToday
      ? nowScrollTop(HOUR_HEIGHT)
      : Math.max(0, (9 - HOURS[0]) * HOUR_HEIGHT);
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({y: target, animated: false});
    }, 50);
    return () => clearTimeout(timer);
  }, [cursor, isToday]);

  const nowTop = useMemo(() => {
    if (!isToday) {
      return null;
    }
    const h = now.getHours() + now.getMinutes() / 60;
    if (h < HOURS[0] || h > HOURS[HOURS.length - 1] + 1) {
      return null;
    }
    return (h - HOURS[0]) * HOUR_HEIGHT;
  }, [now, isToday]);

  const chipOpts = {
    detailed: true as const,
    nameById,
    defaultLessonTitle: t('schedule.defaultLessonTitle'),
    paymentMarker: t('schedule.paymentMarker'),
    paymentOverdueShort: t('schedule.paymentOverdueShort'),
    askForPayment: t('schedule.askForPayment'),
  };

  return (
    <View style={styles.root}>
      <View style={styles.dayHead}>
        <Text style={[styles.weekday, isToday && styles.weekdayToday]}>
          {weekdayLong(cursor, language)}
        </Text>
        <View style={[styles.dayCircle, isToday && styles.dayCircleToday]}>
          <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>
            {cursor.getDate()}
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={(_e: NativeSyntheticEvent<NativeScrollEvent>) => undefined}
        scrollEventThrottle={16}>
        <View style={{height: GRID_HEIGHT + 20}}>
          {HOURS.map(hour => (
            <Pressable
              key={hour}
              style={[
                styles.hourRow,
                {top: (hour - HOURS[0]) * HOUR_HEIGHT, height: HOUR_HEIGHT},
              ]}
              onPress={() => onSlotClick(cursor, hour)}>
              <View style={styles.hourLabel}>
                <Text style={styles.hourText}>
                  {`${String(hour).padStart(2, '0')}:00`}
                </Text>
              </View>
              <View style={styles.hourLine} />
            </Pressable>
          ))}

          <View style={styles.eventsLayer} pointerEvents="box-none">
            {dayEvents.map(event => {
              const start = new Date(event.starts_at);
              const end = new Date(event.ends_at);
              const startHour = start.getHours() + start.getMinutes() / 60;
              const durationHours = Math.max(
                (end.getTime() - start.getTime()) / 3_600_000,
                event.type === 'payment' ? 1 : 0.45,
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
                time: `${formatHm(start)} – ${formatHm(end)}`,
              });
              const minH = eventMinHeight(event, HOUR_HEIGHT);
              const bg = backgroundForColors(colorsForEvent(event));
              return (
                <Pressable
                  key={String(event.id)}
                  style={[
                    styles.eventPlaque,
                    {
                      top: Math.max(top, 0),
                      height: Math.max(height, minH),
                      backgroundColor: bg,
                    },
                  ]}
                  onPress={() => onEventClick(event)}>
                  <Text style={styles.eventPrimary} numberOfLines={1}>
                    {chip.primary}
                  </Text>
                  {!!chip.secondary && (
                    <Text style={styles.eventSecondary} numberOfLines={1}>
                      {chip.secondary}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          {nowTop != null && (
            <View style={[styles.nowLine, {top: nowTop}]} pointerEvents="none">
              <View style={styles.nowDot} />
            </View>
          )}
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
  dayHead: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8e8ed',
  },
  weekday: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: '#86868b',
  },
  weekdayToday: {color: APPLE_BLUE},
  dayCircle: {
    marginTop: 4,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleToday: {backgroundColor: APPLE_BLUE},
  dayNum: {fontSize: 22, fontWeight: '600', color: '#1d1d1f'},
  dayNumToday: {color: '#fff'},
  scroll: {flex: 1},
  hourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f0f0f5',
  },
  hourLabel: {
    width: LABEL_W,
    paddingRight: 8,
    alignItems: 'flex-end',
  },
  hourText: {
    fontSize: 11,
    color: '#aeaeb2',
    marginTop: -7,
  },
  hourLine: {
    flex: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: '#f0f0f5',
  },
  eventsLayer: {
    position: 'absolute',
    left: LABEL_W,
    right: 0,
    top: 0,
    bottom: 0,
  },
  eventPlaque: {
    position: 'absolute',
    left: 4,
    right: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  eventPrimary: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  eventSecondary: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 2,
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
