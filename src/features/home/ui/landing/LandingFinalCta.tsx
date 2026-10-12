import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useI18n} from '../../../../shared/i18n';
import {useLayout} from '../../../../shared/lib/layout';
import type {RootStackParamList} from '../../../../shared/navigation/types';
import {useLandingAccess} from '../../model/useLandingTabCards';
import {landing} from './landingTheme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const options = [
  {
    titleKey: 'landing.finalCta.readyTitle',
    textKey: 'landing.finalCta.readyText',
    buttonKey: 'landing.finalCta.readyButton',
    image: require('../../../../shared/assets/landing/final/ready_lesson.jpg'),
    tabletImage: require('../../../../shared/assets/landing/final/ready_lesson_tablet.jpg'),
    target: 'plans' as const,
  },
  {
    titleKey: 'landing.finalCta.createTitle',
    textKey: 'landing.finalCta.createText',
    buttonKey: 'landing.finalCta.createButton',
    image: require('../../../../shared/assets/landing/final/create_lesson.jpg'),
    target: 'create' as const,
  },
];

export function LandingFinalCta() {
  const {t} = useI18n();
  const navigation = useNavigation<Nav>();
  const access = useLandingAccess();
  const {isTablet, pageGutter, catalogRowWidth} = useLayout();

  if (access === 'student') {
    return null;
  }

  const cardWidth = isTablet
    ? Math.min(420, Math.floor((catalogRowWidth - 20) / 2))
    : undefined;

  const onPress = () => {
    if (access === 'guest') {
      navigation.navigate('Registration');
      return;
    }
    navigation.navigate('MainTabs', {
      screen: 'Lessons',
      params: {screen: 'LessonPlans'},
    } as never);
  };

  return (
    <View style={[styles.root, {paddingHorizontal: pageGutter}]}>
      <Text style={[styles.title, isTablet && styles.titleTablet]}>
        {t('landing.finalCta.title')}
      </Text>
      <View style={[styles.grid, isTablet && styles.gridTablet]}>
        {options.map(option => {
          const source =
            isTablet && option.tabletImage
              ? option.tabletImage
              : option.image;
          return (
            <View
              key={option.titleKey}
              style={[
                styles.card,
                {borderRadius: isTablet ? 30 : 20},
                cardWidth ? {width: cardWidth} : styles.cardFull,
              ]}>
              <Image
                source={source}
                style={styles.cardImage}
                resizeMode="cover"
              />
              <View style={styles.body}>
                <Text
                  style={[styles.cardTitle, isTablet && styles.cardTitleTablet]}>
                  {t(option.titleKey)}
                </Text>
                <Text
                  style={[styles.cardText, isTablet && styles.cardTextTablet]}>
                  {t(option.textKey)}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={onPress}
                  style={({pressed}) => [
                    styles.button,
                    pressed && styles.pressed,
                  ]}>
                  <Text style={styles.buttonText}>{t(option.buttonKey)}</Text>
                  <Text style={styles.fire}>🔥</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
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
    maxWidth: 460,
    alignSelf: 'center',
  },
  titleTablet: {
    fontSize: 36,
    lineHeight: 40,
    maxWidth: 550,
  },
  grid: {
    gap: 20,
  },
  gridTablet: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  card: {
    overflow: 'hidden',
    backgroundColor: landing.gray,
    minHeight: 360,
  },
  cardFull: {
    width: '100%',
  },
  // Edge-to-edge fill (padding lives on body — RN absoluteFill is inset by padding).
  // Bottom bias mimics site `object-cover object-bottom`.
  cardImage: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '115%',
  },
  body: {
    position: 'relative',
    zIndex: 1,
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 25,
    paddingTop: 25,
    paddingBottom: 220,
  },
  cardTitle: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: landing.black,
  },
  cardTitleTablet: {
    fontSize: 20,
  },
  cardText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    color: landing.black,
  },
  cardTextTablet: {
    fontSize: 16,
    lineHeight: 21,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: landing.violet,
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 7,
    paddingVertical: 7,
  },
  pressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: landing.white,
    fontSize: 12,
    fontWeight: '700',
  },
  fire: {
    fontSize: 22,
  },
});
