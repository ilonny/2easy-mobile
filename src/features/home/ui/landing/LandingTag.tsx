import type {ReactNode} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {
  landing,
  tagToneStyles,
  type LandingTagTone,
} from './landingTheme';

type Props = {
  children: string;
  tone?: LandingTagTone;
  icon?: ReactNode;
};

export function LandingTag({children, tone = 'violet', icon}: Props) {
  const colors = tagToneStyles[tone];
  return (
    <View style={[styles.tag, {backgroundColor: colors.bg}]}>
      {icon}
      <Text style={[styles.text, {color: colors.text}]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

export function LevelDot() {
  return <View style={styles.levelDot} />;
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
    maxWidth: '100%',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
    letterSpacing: -0.1,
  },
  levelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: landing.violetTag,
  },
});
