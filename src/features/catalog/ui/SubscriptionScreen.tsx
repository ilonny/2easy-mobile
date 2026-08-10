import {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useI18n} from '../../../shared/i18n';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {useSubscription} from '../../home/model/useSubscription';
import {
  SubscribeSection,
  type TariffOption,
} from '../../home/ui/SubscribeSection';
import {CatalogPageLayout} from './CatalogPageLayout';
import {PaymentModal} from './PaymentModal';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SubscriptionScreen() {
  const navigation = useNavigation<Nav>();
  const {t} = useI18n();
  const {hasPaidTariff, subscription} = useSubscription();
  const [paymentTariff, setPaymentTariff] = useState<TariffOption | null>(null);

  return (
    <>
      <CatalogPageLayout
        title={t('subscription.title')}
        subtitle={t('subscription.page.subtitle')}
        sectionLabel={t('header.subscription')}>
        <Text style={styles.desc}>{t('subscription.page.description1')}</Text>
        <Text style={styles.desc}>{t('subscription.page.description2')}</Text>
        <View style={styles.tariffs}>
          <SubscribeSection
            hideIntro
            hasPaidTariff={hasPaidTariff}
            subscribeTypeId={subscription?.subscribe_type_id}
            onStartFree={() => navigation.navigate('Registration')}
            onSubscribe={tariff => setPaymentTariff(tariff)}
          />
        </View>
      </CatalogPageLayout>
      <PaymentModal
        visible={!!paymentTariff}
        tariff={paymentTariff}
        onClose={() => setPaymentTariff(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  desc: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#2D2D2D',
  },
  tariffs: {
    marginTop: 8,
  },
});
