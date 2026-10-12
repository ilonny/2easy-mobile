import {Image, Pressable, StyleSheet, Text, View} from 'react-native';

import {useI18n} from '../../../../shared/i18n';
import {useLayout} from '../../../../shared/lib/layout';
import {SmartImage} from '../../../../shared/ui';
import type {LandingCard} from '../../model/landingData';
import {LandingTag, LevelDot} from './LandingTag';
import {interpolate, landing} from './landingTheme';

type Props = {
  card: LandingCard;
  width: number;
  onPress: () => void;
};

export function LandingGameCard({card, width, onPress}: Props) {
  const {t} = useI18n();
  const {isTablet} = useLayout();
  const title = card.titleKey ? t(card.titleKey) : card.title ?? '';
  const description = card.descriptionKey
    ? t(card.descriptionKey)
    : card.description;
  const countLabel =
    card.countKey && card.count != null
      ? interpolate(t(card.countKey), {
          n: card.count,
          count: card.count,
        })
      : null;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [styles.card, {width}, pressed && styles.pressed]}>
      <View style={[styles.cover, {borderRadius: isTablet ? 30 : 20}]}>
        {card.image ? (
          typeof card.image === 'object' && 'uri' in card.image ? (
            <SmartImage source={card.image} style={styles.image} resizeMode="cover" />
          ) : (
            <Image source={card.image} style={styles.image} resizeMode="cover" />
          )
        ) : null}
      </View>
      <View style={styles.meta}>
        <View style={styles.tags}>
          {countLabel ? (
            <LandingTag tone="violet">
              {card.isVideo ? `▶ ${countLabel}` : countLabel}
            </LandingTag>
          ) : null}
          {card.level ? (
            <LandingTag tone={card.levelTone ?? 'green'} icon={<LevelDot />}>
              {card.level}
            </LandingTag>
          ) : null}
          {card.topic ? (
            <LandingTag tone="violet">{card.topic}</LandingTag>
          ) : null}
        </View>
        <Text
          style={[styles.title, isTablet && styles.titleTablet]}
          numberOfLines={2}>
          {title}
        </Text>
        {description ? (
          <Text
            style={[styles.desc, isTablet && styles.descTablet]}
            numberOfLines={isTablet ? 3 : 2}>
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
  },
  pressed: {
    opacity: 0.92,
  },
  cover: {
    aspectRatio: 1,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: landing.gray,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  meta: {
    gap: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    color: landing.black,
    letterSpacing: -0.1,
  },
  titleTablet: {
    fontSize: 16,
    lineHeight: 22,
  },
  desc: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    color: landing.grayFont,
    letterSpacing: -0.1,
  },
  descTablet: {
    lineHeight: 19,
  },
});
