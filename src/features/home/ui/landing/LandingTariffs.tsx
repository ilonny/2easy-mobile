import {useState} from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useI18n} from '../../../../shared/i18n';
import {useLayout} from '../../../../shared/lib/layout';
import type {RootStackParamList} from '../../../../shared/navigation/types';
import {tariffs} from '../../model/data';
import {useLandingAccess} from '../../model/useLandingTabCards';
import {useSubscription} from '../../model/useSubscription';
import type {TariffOption} from '../SubscribeSection';
import {interpolate, landing} from './landingTheme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  onSubscribe: (tariff: TariffOption) => void;
};

const periods = [
  {
    type: 'month' as const,
    labelKey: 'landing.tariffs.tabMonth',
    months: 1,
    pet: require('../../../../shared/assets/landing/tariffs/pet_cat.png'),
  },
  {
    type: '3month' as const,
    labelKey: 'landing.tariffs.tab3Months',
    months: 3,
    badge: landing.orange,
    payForKey: 'landing.tariffs.payFor3Months',
    pet: require('../../../../shared/assets/landing/tariffs/pet_dog.png'),
  },
  {
    type: 'year' as const,
    labelKey: 'landing.tariffs.tabYear',
    months: 12,
    badge: landing.violet,
    payForKey: 'landing.tariffs.payForYear',
    pet: require('../../../../shared/assets/landing/tariffs/pet_chihuahua.png'),
  },
];

const trialFeatures = [
  'landing.tariffs.featureConstructor',
  'landing.tariffs.featureTrialLessons',
  'landing.tariffs.featureGames',
  'landing.tariffs.featureCards',
  'landing.tariffs.featureGrammar',
] as const;

const fullFeatures = [
  'landing.tariffs.featureConstructor',
  'landing.tariffs.featureFullLessons',
  'landing.tariffs.featureGames',
  'landing.tariffs.featureCards',
  'landing.tariffs.featureGrammar',
  'landing.tariffs.featureNew',
] as const;

const getDiscount = (price: number, oldPrice?: number) =>
  oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;

export function LandingTariffs({onSubscribe}: Props) {
  const {t} = useI18n();
  const navigation = useNavigation<Nav>();
  const access = useLandingAccess();
  const {subscription} = useSubscription();
  const {isTablet, pageGutter} = useLayout();
  const [periodType, setPeriodType] = useState<(typeof periods)[number]['type']>(
    'month',
  );

  if (access === 'student') {
    return null;
  }

  const period = periods.find(item => item.type === periodType) ?? periods[0];
  const tariff = tariffs.find(item => item.type === periodType) ?? tariffs[0];
  const perMonth = Math.round(tariff.price / period.months);
  const discount = getDiscount(tariff.price, tariff.oldPrice);
  const isTrial = !!subscription?.success && subscription.subscribe_type_id === 1;
  const isPaid = !!subscription?.success && subscription.subscribe_type_id !== 1;

  const onPay = () => {
    if (access === 'guest') {
      navigation.navigate('Registration');
      return;
    }
    onSubscribe(tariff);
  };

  return (
    <View style={[styles.root, {paddingHorizontal: pageGutter}]}>
      <Text style={[styles.title, isTablet && styles.titleTablet]}>
        {t('landing.tariffs.title')}
      </Text>

      <View style={styles.tabs}>
        {periods.map(item => {
          const itemTariff = tariffs.find(entry => entry.type === item.type);
          const itemDiscount = getDiscount(
            itemTariff?.price ?? 0,
            itemTariff?.oldPrice,
          );
          const selected = item.type === periodType;
          return (
            <Pressable
              key={item.type}
              onPress={() => setPeriodType(item.type)}
              style={[styles.tab, selected && styles.tabSelected]}>
              <Text style={styles.tabLabel}>{t(item.labelKey)}</Text>
              {itemDiscount > 0 ? (
                <View
                  style={[
                    styles.tabBadge,
                    {backgroundColor: item.badge ?? landing.orange},
                  ]}>
                  <Text style={styles.tabBadgeText}>-{itemDiscount}%</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.cards, isTablet && styles.cardsTablet]}>
        <View style={[styles.card, styles.trialCard]}>
          <Text style={styles.cardTitle}>{t('landing.tariffs.trialTitle')}</Text>
          <View style={styles.inner}>
            <View style={styles.features}>
              {trialFeatures.map(key => (
                <Text key={key} style={styles.feature}>
                  ✓  {t(key)}
                </Text>
              ))}
              <Text style={[styles.feature, styles.featureLocked]}>
                ✓  {t('landing.tariffs.featureNew')}
              </Text>
            </View>
            <Text style={styles.price}>{t('landing.tariffs.trialPrice')}</Text>
            <View style={styles.trialTags}>
              <View style={[styles.pill, styles.pillViolet]}>
                <Text style={[styles.pillText, styles.pillTextViolet]}>
                  {t('landing.content.tagFree')}
                </Text>
              </View>
              <View style={[styles.pill, styles.pillGreen]}>
                <Text style={[styles.pillText, styles.pillTextGreen]}>
                  {t('landing.content.tagDays')}
                </Text>
              </View>
              <View style={[styles.pill, styles.pillBlue]}>
                <Text style={[styles.pillText, styles.pillTextBlue]}>
                  {t('landing.tariffs.tagNoCard')}
                </Text>
              </View>
            </View>
            {access === 'guest' ? (
              <Pressable style={styles.cta} onPress={onPay}>
                <Text style={styles.ctaText}>{t('header.tryFree')}</Text>
              </Pressable>
            ) : null}
            {isTrial ? (
              <View style={[styles.cta, styles.ctaDisabled]}>
                <Text style={styles.ctaText}>{t('landing.tariffs.current')}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <ImageBackground
          source={require('../../../../shared/assets/landing/tariffs/bg.jpg')}
          style={[styles.card, styles.fullCard]}
          imageStyle={styles.fullBg}>
          <Image source={period.pet} style={styles.pet} resizeMode="contain" />
          <Text style={[styles.cardTitle, styles.cardTitleLight]}>
            {t('landing.tariffs.fullTitle')}
          </Text>
          <View style={styles.inner}>
            <View style={styles.features}>
              {fullFeatures.map(key => (
                <Text key={key} style={styles.feature}>
                  ✓  {t(key)}
                </Text>
              ))}
            </View>
            <View style={styles.priceBlock}>
              <View style={styles.priceRow}>
                <Text style={styles.price}>
                  {interpolate(t('landing.tariffs.perMonth'), {price: perMonth})}
                </Text>
                {discount > 0 ? (
                  <View style={styles.discount}>
                    <Text style={styles.discountText}>-{discount}%</Text>
                  </View>
                ) : null}
              </View>
              {tariff.oldPrice && period.payForKey ? (
                <Text style={styles.billed}>
                  <Text style={styles.oldPrice}>{tariff.oldPrice} ₽ </Text>
                  <Text style={styles.billedAccent}>
                    {interpolate(t(period.payForKey), {price: tariff.price})}
                  </Text>
                </Text>
              ) : null}
            </View>
            <Pressable
              style={[
                styles.cta,
                (isPaid || access === 'loading') && styles.ctaDisabled,
              ]}
              disabled={isPaid || access === 'loading'}
              onPress={onPay}>
              <Text style={styles.ctaText}>
                {isPaid
                  ? t('landing.tariffs.active')
                  : interpolate(t('landing.tariffs.pay'), {price: tariff.price})}
              </Text>
            </Pressable>
          </View>
        </ImageBackground>
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
  tabs: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: landing.gray,
    borderRadius: 10,
    padding: 8,
    gap: 4,
  },
  tab: {
    minHeight: 38,
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tabSelected: {
    backgroundColor: landing.white,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: landing.black,
  },
  tabBadge: {
    borderRadius: 6,
    paddingHorizontal: 4,
    minHeight: 22,
    justifyContent: 'center',
  },
  tabBadgeText: {
    color: landing.white,
    fontSize: 10,
    fontWeight: '700',
  },
  cards: {
    gap: 20,
  },
  cardsTablet: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  card: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingTop: 15,
    paddingBottom: 10,
    gap: 10,
    flex: 1,
    minWidth: 280,
    maxWidth: 430,
  },
  trialCard: {
    backgroundColor: landing.gray,
    overflow: 'hidden',
  },
  fullCard: {
    overflow: 'visible',
  },
  fullBg: {
    borderRadius: 20,
  },
  pet: {
    position: 'absolute',
    right: 24,
    top: -36,
    width: 96,
    height: 96,
    zIndex: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: landing.black,
    paddingHorizontal: 10,
  },
  cardTitleLight: {
    color: landing.white,
  },
  inner: {
    flex: 1,
    backgroundColor: landing.white,
    borderRadius: 16,
    padding: 15,
    gap: 24,
    justifyContent: 'space-between',
  },
  features: {
    gap: 12,
  },
  feature: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    color: landing.black,
  },
  featureLocked: {
    color: '#9F9FA1',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: landing.black,
  },
  priceBlock: {
    gap: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  discount: {
    backgroundColor: landing.orange,
    borderRadius: 7,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  discountText: {
    color: landing.white,
    fontSize: 10,
    fontWeight: '700',
  },
  billed: {
    fontSize: 12,
    fontWeight: '700',
  },
  oldPrice: {
    color: landing.violet,
    textDecorationLine: 'line-through',
  },
  billedAccent: {
    color: landing.orange,
  },
  trialTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  pill: {
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  pillViolet: {
    backgroundColor: landing.violetSoft,
  },
  pillTextViolet: {
    color: landing.violet,
  },
  pillGreen: {
    backgroundColor: landing.greenSoft,
  },
  pillTextGreen: {
    color: landing.greenTag,
  },
  pillBlue: {
    backgroundColor: landing.blueSoft,
  },
  pillTextBlue: {
    color: landing.blueTag,
  },
  cta: {
    minHeight: 45,
    borderRadius: 14,
    backgroundColor: landing.violet,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    color: landing.white,
    fontSize: 12,
    fontWeight: '700',
  },
});
