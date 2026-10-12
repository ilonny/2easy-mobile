import {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
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
import {
  contentCategories,
  tryFreeImages,
  tryFreeTitleKeys,
  type ContentTab,
  type LandingCard,
} from '../../model/landingData';
import {
  useLandingTabCards,
  type LandingAccess,
} from '../../model/useLandingTabCards';
import {useSubscription} from '../../model/useSubscription';
import {LandingGameCard} from './LandingGameCard';
import {useLandingScroll} from './LandingScrollContext';
import {LandingTag} from './LandingTag';
import {landing} from './landingTheme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function TryFreeCard({
  tab,
  width,
  tablet,
  access,
  onPress,
}: {
  tab: ContentTab;
  width: number;
  tablet?: boolean;
  access: LandingAccess;
  onPress: () => void;
}) {
  const {t} = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.tryCard,
        {
          width,
          borderRadius: tablet ? 30 : 20,
        },
      ]}>
      <Image
        source={tryFreeImages[tab]}
        style={styles.tryImage}
        resizeMode="cover"
      />
      <View style={styles.tryBody}>
        <Text style={styles.tryTitle}>{t(tryFreeTitleKeys[tab])}</Text>
        <View style={styles.tryTags}>
          <LandingTag tone="white">{t('landing.content.tagFree')}</LandingTag>
          <LandingTag tone="white">{t('landing.content.tagDays')}</LandingTag>
          <LandingTag tone="white">{t('landing.content.tagNoCard')}</LandingTag>
        </View>
        <View style={styles.tryButton}>
          <Text style={styles.tryButtonText}>
            {access === 'guest'
              ? t('landing.content.tryButton')
              : t('header.chooseTariff')}
          </Text>
          <Text style={styles.tryFire}>🔥</Text>
        </View>
      </View>
    </Pressable>
  );
}

const stackStyles = [
  {
    left: 51,
    top: 5,
    rotate: '11.7deg',
  },
  {
    left: 30,
    top: 5,
    rotate: '-4.1deg',
  },
  {
    left: 9,
    top: 11,
    rotate: '-22.88deg',
  },
] as const;

export function LandingContent() {
  const {t} = useI18n();
  const navigation = useNavigation<Nav>();
  const {isAuthorized, profile} = useAuth();
  const {hasSubscription} = useSubscription();
  const {isTablet, pageGutter, catalogColumns, catalogRowWidth} = useLayout();
  const {reduceMotion} = useLandingScroll();
  const [tab, setTab] = useState<ContentTab>('speaking');
  const {cards, loading, error, access} = useLandingTabCards(tab);
  const showTry = access === 'guest' || access === 'noSubscription';
  const contentAnim = useRef(new Animated.Value(1)).current;
  const cardWidth = isTablet
    ? Math.floor(
        (catalogRowWidth - (catalogColumns - 1) * 16) / Math.min(catalogColumns, 3),
      )
    : 230;

  useEffect(() => {
    if (reduceMotion) {
      contentAnim.setValue(1);
      return;
    }
    contentAnim.setValue(0);
    Animated.timing(contentAnim, {
      toValue: 1,
      duration: 450,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [tab, contentAnim, reduceMotion]);

  const openCard = (card: LandingCard) => {
    if (access === 'guest') {
      navigation.navigate('Registration');
      return;
    }
    if (access === 'noSubscription' || card.locked) {
      navigation.navigate('MainTabs', {
        screen: 'Lessons',
        params: {screen: 'Subscription'},
      } as never);
      return;
    }
    if (card.slug) {
      if (!hasSubscription) {
        navigation.navigate('MainTabs', {
          screen: 'Lessons',
          params: {screen: 'Subscription'},
        } as never);
        return;
      }
      navigation.navigate('MainTabs', {
        screen: 'Lessons',
        params: {screen: 'ContentPlayer', params: {slug: card.slug}},
      } as never);
      return;
    }
    if (card.courseId) {
      navigation.navigate('MainTabs', {
        screen: 'Lessons',
        params: {screen: 'Course', params: {courseId: card.courseId}},
      } as never);
      return;
    }
    if (card.lessonId) {
      const isTeacher = profile?.role_id === 1 || profile?.role_id === 2;
      navigation.navigate('MainTabs', {
        screen: 'Lessons',
        params: {
          screen: isTeacher ? 'LessonEditor' : 'LessonViewer',
          params: isTeacher
            ? {lessonId: card.lessonId}
            : {lessonId: card.lessonId, from: 'Lessons'},
        },
      } as never);
    }
  };

  const openTry = () => {
    if (!isAuthorized) {
      navigation.navigate('Registration');
      return;
    }
    navigation.navigate('MainTabs', {
      screen: 'Lessons',
      params: {screen: 'Subscription'},
    } as never);
  };

  return (
    <View style={[styles.root, {paddingHorizontal: pageGutter}]}>
      <Text style={[styles.title, isTablet && styles.titleTablet]}>
        {t('landing.content.title')}
      </Text>

      <ScrollView
        horizontal
        nestedScrollEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}>
        {contentCategories.map(category => {
          const selected = category.tab === tab;
          return (
            <Pressable
              key={category.tab}
              accessibilityRole="button"
              onPress={() => setTab(category.tab)}
              style={[styles.category, selected && styles.categorySelected]}>
              <View style={styles.stack}>
                {category.images.map((image, index) => (
                  <Image
                    key={`${category.tab}-${index}`}
                    source={image}
                    style={[
                      styles.stackCard,
                      {
                        left: stackStyles[index].left * 0.85,
                        top: stackStyles[index].top * 0.85,
                        transform: [{rotate: stackStyles[index].rotate}],
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.categoryLabel}>{t(category.titleKey)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={landing.violet} />
        </View>
      ) : error && cards.length === 0 ? (
        <Text style={styles.error}>{t('landing.content.loadError')}</Text>
      ) : (
        <Animated.View
          style={{
            // Fixed min height so tab swaps / card loads don't collapse the parent ScrollView.
            minHeight: isTablet ? 360 : 340,
            opacity: contentAnim,
            transform: [
              {
                translateY: contentAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
            ],
          }}>
          {isTablet ? (
            <View style={[styles.cardsRow, styles.cardsGrid]}>
              {cards.map(card => (
                <LandingGameCard
                  key={card.id}
                  card={card}
                  width={cardWidth}
                  onPress={() => openCard(card)}
                />
              ))}
              {showTry ? (
                <TryFreeCard
                  tab={tab}
                  width={cardWidth}
                  tablet
                  access={access}
                  onPress={openTry}
                />
              ) : null}
            </View>
          ) : (
            <ScrollView
              horizontal
              nestedScrollEnabled
              directionalLockEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardsRow}>
              {cards.map(card => (
                <LandingGameCard
                  key={card.id}
                  card={card}
                  width={cardWidth}
                  onPress={() => openCard(card)}
                />
              ))}
              {showTry ? (
                <TryFreeCard
                  tab={tab}
                  width={260}
                  access={access}
                  onPress={openTry}
                />
              ) : null}
            </ScrollView>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 30,
  },
  title: {
    textAlign: 'center',
    fontSize: 25,
    fontWeight: '700',
    lineHeight: 28,
    color: landing.black,
    letterSpacing: -0.25,
    maxWidth: 440,
    alignSelf: 'center',
  },
  titleTablet: {
    fontSize: 36,
    lineHeight: 40,
    maxWidth: 550,
  },
  categories: {
    gap: 10,
    paddingVertical: 12,
    alignItems: 'flex-end',
  },
  category: {
    width: 100,
    alignItems: 'center',
    gap: 12,
  },
  categorySelected: {
    opacity: 0.35,
  },
  stack: {
    width: 99,
    height: 70,
  },
  stackCard: {
    position: 'absolute',
    width: 51,
    height: 52,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: landing.white,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: landing.black,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  loading: {
    // Keep height stable while cards fetch — collapsing this jumps parent scroll to 0 on Android.
    minHeight: 340,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    textAlign: 'center',
    color: landing.grayFont,
    fontWeight: '700',
    fontSize: 14,
    paddingVertical: 40,
  },
  cardsRow: {
    gap: 20,
    paddingBottom: 4,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 30,
    columnGap: 16,
  },
  tryCard: {
    backgroundColor: landing.grayAlt,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    minHeight: 320,
    padding: 15,
  },
  tryImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '55%',
  },
  tryBody: {
    gap: 15,
  },
  tryTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    color: landing.black,
  },
  tryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: landing.violet,
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 7,
    paddingVertical: 7,
  },
  tryButtonText: {
    color: landing.white,
    fontSize: 12,
    fontWeight: '700',
  },
  tryFire: {
    fontSize: 22,
  },
});
