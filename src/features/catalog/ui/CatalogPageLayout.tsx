import type {PropsWithChildren, ReactNode} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuth} from '../../../entities/session';
import {useI18n} from '../../../shared/i18n';
import {useLayout} from '../../../shared/lib/layout';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {goHome} from '../../../shared/navigation/resetToLessonPlans';
import {Breadcrumbs, type BreadcrumbCrumb} from '../../../shared/ui';
import {AppHeader} from '../../app-shell';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  /** Current section label (last crumb). Home is prepended automatically. */
  sectionLabel: string;
  /** Extra crumbs between Home and section, or replace default trail. */
  breadcrumbs?: BreadcrumbCrumb[];
  footer?: ReactNode;
}>;

export function CatalogPageLayout({
  title,
  subtitle,
  sectionLabel,
  breadcrumbs,
  footer,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const {isAuthorized} = useAuth();
  const {t} = useI18n();
  const {pageGutter, pageContentMaxWidth} = useLayout();

  const crumbs: BreadcrumbCrumb[] = breadcrumbs ?? [
    {
      label: t('editor.home'),
      onPress: () => goHome(navigation, isAuthorized),
    },
    {label: sectionLabel},
  ];

  return (
    <View style={styles.root}>
      <View style={[styles.header, {paddingTop: insets.top + 8}]}>
        <AppHeader />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: pageGutter,
            paddingBottom: insets.bottom + 40,
            maxWidth: pageContentMaxWidth,
            width: '100%',
            alignSelf: 'center',
          },
        ]}>
        <Breadcrumbs items={crumbs} />
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <View style={styles.body}>{children}</View>
        {footer}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  content: {
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#3f28c6',
    textAlign: 'center',
    lineHeight: 34,
    marginTop: 16,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D2D2D',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    alignSelf: 'center',
    maxWidth: 675,
  },
  body: {
    gap: 16,
  },
});
