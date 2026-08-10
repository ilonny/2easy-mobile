import type {ReactNode} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useAuth} from '../../../entities/session';
import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {openSectionRoute} from '../../../shared/navigation/resetToLessonPlans';
import {Button} from '../../../shared/ui';
import {useSubscription} from '../../home/model/useSubscription';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function formatDate(value?: string) {
  if (!value) {
    return '';
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return value;
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function ProfileSubscribeInformer() {
  const {t} = useI18n();
  const navigation = useNavigation<Nav>();
  const {isAuthorized} = useAuth();
  const {subscription, hasSubscription} = useSubscription();
  const typeId = subscription?.subscribe_type_id;
  const end = formatDate(subscription?.dateEnd);

  const goSubscription = () =>
    openSectionRoute(navigation, 'Subscription', isAuthorized);

  let body: ReactNode;
  if (!hasSubscription || !typeId) {
    body = (
      <View style={styles.gap}>
        <Text style={styles.strong}>
          {t('subscriptionStatus.noActiveSubscription')}
        </Text>
        <Text style={styles.text}>
          {t('subscriptionStatus.subscribeToContinue')}
        </Text>
        <Button title={t('lessons.chooseTariff')} onPress={goSubscription} />
      </View>
    );
  } else if (typeId === 1) {
    body = (
      <View style={styles.gap}>
        <Text style={styles.text}>
          {t('subscriptionStatus.trialUntil')} {end}
        </Text>
        <Text onPress={goSubscription} style={styles.link}>
          {t('lessons.chooseTariff')}
        </Text>
      </View>
    );
  } else {
    body = (
      <Text style={styles.text}>
        {t('subscriptionStatus.activeUntil')} {end}
      </Text>
    );
  }

  return <View style={styles.card}>{body}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gap: {
    gap: 8,
  },
  strong: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
    fontWeight: '600',
    fontSize: 14,
  },
});
