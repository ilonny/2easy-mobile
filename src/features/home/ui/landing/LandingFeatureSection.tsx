import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

import {useI18n} from '../../../../shared/i18n';
import {useLayout} from '../../../../shared/lib/layout';
import {LandingLoopVideo} from './LandingLoopVideo';
import {LandingSectionHeading} from './LandingSectionHeading';
import {landing} from './landingTheme';

type Feature = {
  titleKey: string;
  descKey?: string;
  image: ImageSourcePropType;
  video?: number;
};

type Props = {
  labelKey: string;
  titleKey: string;
  icon?: string;
  features: readonly Feature[];
  /** Horizontal scroll on phone (delivery). */
  horizontalOnPhone?: boolean;
  tall?: boolean;
};

export function LandingFeatureSection({
  labelKey,
  titleKey,
  icon,
  features,
  horizontalOnPhone,
  tall,
}: Props) {
  const {t} = useI18n();
  const {isTablet, pageGutter, catalogRowWidth} = useLayout();
  const cardWidth = isTablet
    ? Math.min(380, Math.floor((catalogRowWidth - 15) / 2))
    : horizontalOnPhone
      ? 300
      : undefined;

  const cards = features.map(feature => (
    <View
      key={feature.titleKey}
      style={[
        styles.cardWrap,
        cardWidth ? {width: cardWidth} : styles.cardFull,
      ]}>
      <View
        style={[
          styles.card,
          tall && styles.cardTall,
          {borderRadius: isTablet ? 30 : 20},
        ]}>
        <Image
          source={feature.image}
          style={styles.cardImage}
          resizeMode="cover"
        />
        {feature.video ? (
          <LandingLoopVideo
            source={feature.video}
            poster={feature.image}
            showPoster={false}
          />
        ) : null}
        <Text style={[styles.cardTitle, isTablet && styles.cardTitleTablet]}>
          {t(feature.titleKey)}
        </Text>
      </View>
      {feature.descKey ? (
        <Text style={styles.desc}>{t(feature.descKey)}</Text>
      ) : null}
    </View>
  ));

  return (
    <View style={[styles.root, {paddingHorizontal: pageGutter}]}>
      <LandingSectionHeading
        labelKey={labelKey}
        titleKey={titleKey}
        icon={icon}
      />
      {horizontalOnPhone && !isTablet ? (
        <ScrollView
          horizontal
          nestedScrollEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hRow}>
          {cards}
        </ScrollView>
      ) : (
        <View style={[styles.grid, isTablet && styles.gridTablet]}>{cards}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 30,
  },
  grid: {
    gap: 10,
  },
  gridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
  },
  hRow: {
    gap: 16,
    paddingBottom: 4,
  },
  cardWrap: {
    gap: 12,
  },
  cardFull: {
    width: '100%',
  },
  card: {
    aspectRatio: 1,
    overflow: 'hidden',
    justifyContent: 'flex-start',
    backgroundColor: landing.gray,
  },
  cardTall: {
    aspectRatio: undefined,
    height: 370,
  },
  cardImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  cardTitle: {
    position: 'relative',
    zIndex: 2,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 19,
    color: landing.black,
    letterSpacing: -0.1,
    paddingHorizontal: 25,
    paddingTop: 25,
    paddingBottom: 15,
  },
  cardTitleTablet: {
    fontSize: 20,
    lineHeight: 24,
  },
  desc: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    color: landing.grayFont,
    paddingHorizontal: 20,
  },
});
