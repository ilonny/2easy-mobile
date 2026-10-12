import {useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useAuth} from '../../../../entities/session';
import {useI18n} from '../../../../shared/i18n';
import {useLayout} from '../../../../shared/lib/layout';
import type {RootStackParamList} from '../../../../shared/navigation/types';
import {heroCards} from '../../model/landingData';
import {useLandingAccess} from '../../model/useLandingTabCards';
import {LandingButton} from './LandingButton';
import {LandingLoopVideo} from './LandingLoopVideo';
import {useLandingScroll} from './LandingScrollContext';
import {landing} from './landingTheme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  onChooseTariff: () => void;
};

export function LandingHero({onChooseTariff}: Props) {
  const {t} = useI18n();
  const navigation = useNavigation<Nav>();
  const {profile} = useAuth();
  const access = useLandingAccess();
  const {isTablet, pageGutter} = useLayout();
  const {reduceMotion} = useLandingScroll();
  const cardWidth = isTablet ? 280 : 230;
  const cardHeight = isTablet ? 360 : 282;
  const gap = 20;
  const step = cardWidth + gap;
  // Odd count → duplicate set so zigzag seams stay even (same as site).
  const ribbon = useMemo(
    () => (heroCards.length % 2 ? [...heroCards, ...heroCards] : [...heroCards]),
    [],
  );
  const ribbonWidth = ribbon.length * step;
  const translateX = useRef(new Animated.Value(0)).current;
  const [marqueeReady, setMarqueeReady] = useState(false);

  useEffect(() => {
    if (reduceMotion || !marqueeReady) {
      translateX.setValue(0);
      return;
    }
    translateX.setValue(0);
    const anim = Animated.loop(
      Animated.timing(translateX, {
        toValue: -ribbonWidth,
        duration: isTablet ? 90000 : 64000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [reduceMotion, marqueeReady, ribbonWidth, isTablet, translateX]);

  const renderCta = () => {
    if (access === 'loading') {
      return <View style={styles.ctaSkeleton} />;
    }
    if (access === 'guest') {
      return (
        <View style={styles.ctaBlock}>
          <LandingButton
            title={t('header.tryFree')}
            chip={t('landing.hero.trialChip')}
            onPress={() => navigation.navigate('Registration')}
          />
          <Text style={styles.noCard}>{t('landing.hero.noCard')}</Text>
        </View>
      );
    }
    if (access === 'noSubscription') {
      return (
        <LandingButton
          title={t('header.chooseTariff')}
          onPress={onChooseTariff}
        />
      );
    }
    if (access === 'student') {
      return (
        <LandingButton
          title={t('landing.hero.goToLessons')}
          onPress={() =>
            navigation.navigate('MainTabs', {
              screen: 'Students',
              params: {
                screen: 'StudentCabinet',
                params: {studentId: Number(profile?.studentId)},
              },
            } as never)
          }
        />
      );
    }
    return (
      <LandingButton
        title={t('landing.hero.goToLessons')}
        onPress={() =>
          navigation.navigate('MainTabs', {
            screen: 'Lessons',
            params: {screen: 'LessonPlans'},
          } as never)
        }
      />
    );
  };

  const renderCard = (
    card: (typeof heroCards)[number],
    index: number,
    keyPrefix: string,
    enableVideo: boolean,
  ) => {
    const video =
      enableVideo && 'video' in card && card.video ? card.video : undefined;
    return (
      <View
        key={`${keyPrefix}-${card.titleKey}-${index}`}
        style={[styles.heroCardWrap, index % 2 === 1 && styles.heroCardShift]}>
        <View
          style={[
            styles.heroCard,
            {
              width: cardWidth,
              height: cardHeight,
              borderRadius: isTablet ? 30 : 20,
            },
          ]}>
          {/*
            Media must be edge-to-edge. RN absoluteFill is inset by parent
            padding (unlike CSS), which left gray gutters + white titles on gray.
          */}
          <Image
            source={card.image}
            style={styles.heroCardImage}
            resizeMode="cover"
          />
          {video ? (
            <LandingLoopVideo
              source={video}
              poster={card.image}
              showPoster={false}
              eager
            />
          ) : null}
          <Text
            style={[
              styles.heroCardTitle,
              isTablet && styles.heroCardTitleTablet,
              card.lightText && styles.heroCardTitleLight,
            ]}>
            {t(card.titleKey)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <View style={[styles.copy, {paddingHorizontal: pageGutter}]}>
        <View style={styles.badgeRow}>
          <Text style={styles.badgeIcon}>👤</Text>
          <Text style={styles.badge}>{t('landing.hero.badge')}</Text>
        </View>
        <Text style={[styles.title, isTablet && styles.titleTablet]}>
          {t('landing.hero.title')}
        </Text>
        <Text style={[styles.subtitle, isTablet && styles.subtitleTablet]}>
          {t('landing.hero.subtitle')}
        </Text>
        {renderCta()}
      </View>

      {reduceMotion ? (
        <ScrollView
          horizontal
          nestedScrollEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.ribbon,
            {paddingLeft: pageGutter, paddingRight: pageGutter - 8},
          ]}>
          {heroCards.map((card, index) =>
            renderCard(card, index, 'static', true),
          )}
        </ScrollView>
      ) : (
        <View
          style={[styles.marqueeClip, {paddingLeft: pageGutter}]}
          onLayout={() => setMarqueeReady(true)}>
          <Animated.View
            style={[
              styles.marqueeTrack,
              {width: ribbonWidth * 2, transform: [{translateX}]},
            ]}>
            {/* Videos only on the first unique pass — duplicate track is posters only (FPS). */}
            {ribbon.map((card, index) =>
              renderCard(card, index, 'a', index < heroCards.length),
            )}
            {ribbon.map((card, index) =>
              renderCard(card, index, 'b', false),
            )}
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 0,
    backgroundColor: landing.white,
    paddingTop: 24,
  },
  copy: {
    alignItems: 'center',
    gap: 20,
    maxWidth: 630,
    alignSelf: 'center',
    width: '100%',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  badgeIcon: {
    fontSize: 13,
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    color: landing.black,
    letterSpacing: -0.1,
    textAlign: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 32,
    color: landing.black,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  titleTablet: {
    fontSize: 44,
    lineHeight: 46,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    color: landing.black,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  subtitleTablet: {
    fontSize: 16,
    lineHeight: 21,
    maxWidth: 495,
  },
  ctaSkeleton: {
    width: 200,
    height: 46,
    borderRadius: 14,
    backgroundColor: landing.gray,
    alignSelf: 'center',
  },
  ctaBlock: {
    alignItems: 'center',
    gap: 12,
  },
  noCard: {
    fontSize: 12,
    fontWeight: '700',
    color: landing.black,
    letterSpacing: -0.1,
  },
  ribbon: {
    marginTop: 48,
    paddingTop: 12,
    paddingBottom: 12,
  },
  marqueeClip: {
    overflow: 'hidden',
    marginTop: 48,
    paddingTop: 12,
    paddingBottom: 28,
  },
  marqueeTrack: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  heroCardWrap: {
    paddingRight: 20,
  },
  heroCardShift: {
    paddingTop: 20,
  },
  heroCard: {
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: landing.gray,
  },
  heroCardImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  heroCardTitle: {
    position: 'relative',
    zIndex: 2,
    padding: 25,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    color: landing.black,
    letterSpacing: -0.1,
  },
  heroCardTitleTablet: {
    fontSize: 20,
    lineHeight: 24,
    padding: 30,
  },
  heroCardTitleLight: {
    color: landing.white,
  },
});
