import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuth} from '../../../entities/session';
import {isTeacherLessonAccessBlocked, type Lesson} from '../../../entities/lesson';
import {getJson} from '../../../shared/api';
import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {catalogTileWidth, useLayout} from '../../../shared/lib/layout';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {goHome} from '../../../shared/navigation/resetToLessonPlans';
import {Breadcrumbs, Button} from '../../../shared/ui';
import {AppHeader} from '../../app-shell';
import {LessonCard} from '../../lesson-plans/ui/LessonCard';
import {useSubscription} from '../../home/model/useSubscription';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type GrammarResponse = {
  lessons?: Lesson[];
};

export function GrammarScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const {t} = useI18n();
  const {isAuthorized, profile} = useAuth();
  const {hasSubscription, subscription, loading: subLoading} = useSubscription();
  const {isTablet, pageGutter, pageContentMaxWidth, catalogRowWidth} =
    useLayout();

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!hasSubscription) {
      setLessons([]);
      return;
    }
    setLoading(true);
    try {
      const res = await getJson<GrammarResponse>({
        path: '/lessons/grammar',
        isSecure: true,
      });
      setLessons(res.lessons ?? []);
    } catch {
      setLessons([]);
    } finally {
      setLoading(false);
    }
  }, [hasSubscription]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return lessons;
    }
    return lessons.filter(l => l.title?.toLowerCase().includes(q));
  }, [lessons, search]);

  const gap = isTablet ? 16 : 12;
  const tileWidth = catalogTileWidth(catalogRowWidth, 2, gap);
  const canBrowse = isAuthorized && hasSubscription;

  const header = (
    <View style={styles.intro}>
      <Breadcrumbs
        items={[
          {
            label: t('editor.home'),
            onPress: () => goHome(navigation, isAuthorized),
          },
          {label: t('grammarPage.breadcrumb')},
        ]}
      />
      <Text style={styles.title}>{t('grammarPage.title')}</Text>
      <Text style={styles.subtitle}>{t('grammarPage.subtitle')}</Text>
      {!subLoading && !canBrowse ? (
        <View style={styles.gate}>
          <Text style={styles.gateText}>{t('grammarPage.needSubscription')}</Text>
          <Button
            title={t('header.subscription')}
            onPress={() => navigation.navigate('Subscription')}
          />
        </View>
      ) : null}
      {canBrowse ? (
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('lessonPlans.searchPlaceholder')}
          placeholderTextColor={colors.muted}
          style={styles.search}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      ) : null}
    </View>
  );

  if (!canBrowse) {
    return (
      <View style={styles.root}>
        <View style={[styles.topHeader, {paddingTop: insets.top + 8}]}>
          <AppHeader />
        </View>
        <View
          style={[
            styles.gatedBody,
            {
              paddingHorizontal: pageGutter,
              maxWidth: pageContentMaxWidth,
              width: '100%',
              alignSelf: 'center',
            },
          ]}>
          {header}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.topHeader, {paddingTop: insets.top + 8}]}>
        <AppHeader />
      </View>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          ListHeaderComponent={header}
          contentContainerStyle={{
            paddingHorizontal: pageGutter,
            paddingBottom: insets.bottom + 40,
            maxWidth: pageContentMaxWidth,
            width: '100%',
            alignSelf: 'center',
          }}
          columnWrapperStyle={{gap}}
          renderItem={({item}) => (
            <View style={{width: tileWidth, marginBottom: gap}}>
              <LessonCard
                item={item}
                locked={isTeacherLessonAccessBlocked(item, {
                  isStudent: !!profile?.isStudent,
                  hasSubscription,
                  isFreeTariff: subscription?.subscribe_type_id === 1,
                })}
                onPress={() => {
                  if (
                    isTeacherLessonAccessBlocked(item, {
                      isStudent: !!profile?.isStudent,
                      hasSubscription,
                      isFreeTariff: subscription?.subscribe_type_id === 1,
                    })
                  ) {
                    navigation.navigate('Subscription');
                    return;
                  }
                  navigation.navigate('LessonViewer', {
                    lessonId: item.id,
                    from: 'Grammar',
                  });
                }}
              />
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>{t('lessonPlans.empty')}</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  topHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  gatedBody: {
    paddingTop: 24,
  },
  intro: {
    marginBottom: 20,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#3f28c6',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D2D2D',
    textAlign: 'center',
    lineHeight: 24,
    alignSelf: 'center',
    maxWidth: 600,
  },
  gate: {
    marginTop: 16,
    gap: 12,
    alignItems: 'center',
  },
  gateText: {
    fontSize: 15,
    color: '#2D2D2D',
    textAlign: 'center',
    lineHeight: 22,
  },
  search: {
    marginTop: 8,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    textAlign: 'center',
    color: colors.muted,
    marginTop: 24,
  },
});
