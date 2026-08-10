import {ImageBackground, StyleSheet, Text, View} from 'react-native';

import {useAuth} from '../../../entities/session';
import {useI18n} from '../../../shared/i18n';
import {tariffs} from '../model/data';
import {PillCta} from './PillCta';

export type TariffOption = (typeof tariffs)[number];

type Props = {
  onStartFree: () => void;
  onSubscribe: (tariff: TariffOption) => void;
  hasPaidTariff?: boolean;
  subscribeTypeId?: number;
  /** Hide title/description when page already shows them. */
  hideIntro?: boolean;
};

const INCLUDES = [
  'subscription.constructorAccess',
  'subscription.allLessonPlans',
  'subscription.allGames',
  'subscription.newMaterials',
  'subscription.grammarSection',
] as const;

export function SubscribeSection({
  onStartFree,
  onSubscribe,
  hasPaidTariff = false,
  subscribeTypeId,
  hideIntro = false,
}: Props) {
  const {t} = useI18n();
  const {isAuthorized, profile} = useAuth();
  const showFreeTrial = !profile?.login;
  const visibleTariffs = hasPaidTariff
    ? tariffs.filter(item => item.id === subscribeTypeId)
    : tariffs;

  return (
    <View style={styles.root}>
      {!hideIntro ? (
        <>
          <Text style={styles.heading}>{t('subscription.title')}</Text>
          <Text style={styles.sub}>{t('subscription.description')}</Text>
        </>
      ) : null}

      <ImageBackground
        source={require('../../../shared/assets/home/subscribe_purple.png')}
        style={styles.purple}
        imageStyle={styles.panelImage}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t('subscription.subscriptionBadge')}</Text>
        </View>
        <Text style={styles.purpleTitle}>{t('subscription.tariffIncludes')}</Text>
        <View style={styles.divider} />
        {INCLUDES.map(key => (
          <View key={key} style={styles.includeRow}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.includeText}>{t(key)}</Text>
          </View>
        ))}
      </ImageBackground>

      {showFreeTrial ? (
        <ImageBackground
          source={require('../../../shared/assets/home/subscribe_green.png')}
          style={styles.green}
          imageStyle={styles.panelImage}>
          <Text style={styles.greenTitle}>{t('subscription.notUsedYet')}</Text>
          <Text style={styles.greenBody}>{t('subscription.startFreeTrial')}</Text>
          <Text style={styles.greenBody}>{t('subscription.freeTrialDesc')}</Text>
          <View style={styles.greenFooter}>
            <View style={styles.noCard}>
              <Text style={styles.noCardText}>
                {t('subscription.noCardRequired')}
              </Text>
            </View>
            <View style={styles.greenCta}>
              <PillCta
                title={t('subscription.startFree')}
                onPress={onStartFree}
                variant="lime"
              />
            </View>
          </View>
        </ImageBackground>
      ) : null}

      <Text style={styles.heading}>
        {hasPaidTariff ? t('subscription.yourTariff') : t('subscription.tariffs')}
      </Text>

      <View style={styles.tariffs}>
        {visibleTariffs.map(tariff => (
          <View key={tariff.id} style={styles.tariffCard}>
            <View style={styles.tariffTitleWrap}>
              <View
                style={[styles.tariffHighlight, {backgroundColor: tariff.color}]}
              />
              <Text style={styles.tariffTitle}>{t(tariff.titleKey)}</Text>
            </View>
            <View style={styles.priceRow}>
              {'oldPrice' in tariff && tariff.oldPrice ? (
                <Text style={styles.oldPrice}>{tariff.oldPrice} ₽</Text>
              ) : null}
              <Text style={styles.price}>{tariff.price} ₽</Text>
              <Text style={styles.period}>{t(tariff.periodKey)}</Text>
            </View>
            {!hasPaidTariff ? (
              <PillCta
                title={t('subscription.subscribe')}
                onPress={
                  isAuthorized ? () => onSubscribe(tariff) : onStartFree
                }
              />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1A1A1A',
    lineHeight: 30,
  },
  sub: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    color: '#2D2D2D',
    marginBottom: 8,
  },
  purple: {
    borderRadius: 20,
    overflow: 'hidden',
    padding: 20,
    minHeight: 280,
  },
  green: {
    borderRadius: 20,
    overflow: 'hidden',
    padding: 20,
    minHeight: 260,
    gap: 8,
  },
  panelImage: {
    borderRadius: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgb(107, 97, 205)',
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
  },
  badgeText: {
    color: '#D2FF88',
    fontSize: 13,
    fontWeight: '600',
  },
  purpleTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
    marginBottom: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginBottom: 12,
  },
  includeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  check: {
    color: '#D2FF88',
    fontWeight: '700',
  },
  includeText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  greenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#292929',
    lineHeight: 26,
  },
  greenBody: {
    fontSize: 14,
    lineHeight: 20,
    color: '#292929',
  },
  greenFooter: {
    marginTop: 12,
    gap: 12,
  },
  noCard: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  noCardText: {
    fontSize: 13,
    color: '#292929',
  },
  greenCta: {
    width: '100%',
  },
  tariffs: {
    gap: 14,
  },
  tariffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 12,
    shadowColor: '#9089A4',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
    elevation: 3,
  },
  tariffTitleWrap: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  tariffHighlight: {
    position: 'absolute',
    right: -8,
    top: 2,
    height: 26,
    width: '70%',
    zIndex: 0,
  },
  tariffTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    zIndex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    flexWrap: 'wrap',
  },
  oldPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ACACAC',
    textDecorationLine: 'line-through',
  },
  price: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  period: {
    fontSize: 14,
    color: '#787878',
    marginBottom: 4,
  },
});
