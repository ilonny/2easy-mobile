import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuth} from '../../../entities/session';
import {useI18n} from '../../../shared/i18n';
import {colors} from '../../../shared/config/theme';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {goHome} from '../../../shared/navigation/resetToLessonPlans';
import {Breadcrumbs} from '../../../shared/ui';
import {AppHeader} from '../../app-shell';

export type LegalDocId = 'privacy_policy' | 'public_offer' | 'personal_agreement';

type Props = {
  docId: LegalDocId;
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

const DOCS: Record<LegalDocId, {titleKey: string; bodyKey: string}> = {
  privacy_policy: {
    titleKey: 'footer.privacyPolicy',
    bodyKey: 'legal.privacyBody',
  },
  public_offer: {
    titleKey: 'footer.publicOffer',
    bodyKey: 'legal.offerBody',
  },
  personal_agreement: {
    titleKey: 'auth.personalDataConsent',
    bodyKey: 'legal.personalBody',
  },
};

export function LegalDocumentScreen({docId}: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const {isAuthorized} = useAuth();
  const {t} = useI18n();
  const doc = DOCS[docId];

  return (
    <View style={styles.root}>
      <View style={[styles.header, {paddingTop: insets.top + 8}]}>
        <AppHeader />
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 32,
        }}>
        <Breadcrumbs
          items={[
            {
              label: t('editor.home'),
              onPress: () => goHome(navigation, isAuthorized),
            },
            {label: t(doc.titleKey)},
          ]}
        />
        <Text style={styles.title}>{t(doc.titleKey)}</Text>
        <Text style={styles.body}>{t(doc.bodyKey)}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F9F9F9'},
  header: {paddingHorizontal: 16, paddingBottom: 8},
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
  },
});
