import {useEffect, useMemo, useRef, useState} from 'react';
import {Animated, Easing, StyleSheet, Text, View} from 'react-native';

import {useLandingScroll} from './LandingScrollContext';

type Sticker = {
  emoji: string;
  left: number;
  scale: number;
  delay: number;
  duration: number;
  sway: number;
};

const EMOJIS = ['🔥', '😍'];

const random = (min: number, max: number) => min + Math.random() * (max - min);

function createStickers(count: number): Sticker[] {
  return Array.from({length: count}, () => ({
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    left: random(0, 100),
    scale: random(0.4, 1),
    delay: random(0, 1250),
    duration: random(900, 1800),
    sway: random(8, 28),
  }));
}

type Props = {
  active: boolean;
};

function StickerItem({sticker, viewportHeight}: {sticker: Sticker; viewportHeight: number}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: sticker.duration,
      delay: sticker.delay,
      easing: Easing.bezier(0.55, 0.085, 0.68, 0.53),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, sticker.delay, sticker.duration]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [viewportHeight * 0.55, -viewportHeight * 0.2],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, sticker.sway, -sticker.sway],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.1, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.Text
      style={[
        styles.sticker,
        {
          left: `${sticker.left}%`,
          fontSize: 72 * sticker.scale,
          opacity,
          transform: [{translateY}, {translateX}],
        },
      ]}>
      {sticker.emoji}
    </Animated.Text>
  );
}

/** One-shot sticker burst when the tariffs section enters the viewport. */
export function LandingStickerRain({active}: Props) {
  const {reduceMotion, viewportHeight} = useLandingScroll();
  const fired = useRef(false);
  const [stickers, setStickers] = useState<Sticker[] | null>(null);

  useEffect(() => {
    if (!active || reduceMotion || fired.current) {
      return;
    }
    fired.current = true;
    // Cap count for mobile FPS (site uses 28–50 on web CSS; RN Animated is heavier).
    const burst = createStickers(viewportHeight > 900 ? 18 : 12);
    setStickers(burst);
    const last = Math.max(...burst.map(s => s.delay + s.duration));
    const timer = setTimeout(() => setStickers(null), last + 200);
    return () => clearTimeout(timer);
  }, [active, reduceMotion, viewportHeight]);

  const items = useMemo(() => stickers, [stickers]);

  if (!items) {
    return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="none">
      {items.map((sticker, index) => (
        <StickerItem
          key={index}
          sticker={sticker}
          viewportHeight={viewportHeight}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 50,
    overflow: 'hidden',
  },
  sticker: {
    position: 'absolute',
    top: 0,
    marginLeft: -36,
  },
});
