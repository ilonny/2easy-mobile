import {useMemo, useState} from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {WebView} from 'react-native-webview';

import {useAuth} from '../../../entities/session';
import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {useLayout} from '../../../shared/lib/layout';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {
  goHome,
  goToSection,
} from '../../../shared/navigation/resetToLessonPlans';
import {Breadcrumbs, Button, ZoomableImage} from '../../../shared/ui';
import {AppHeader} from '../../app-shell';
import {useSubscription} from '../../home/model/useSubscription';
import {
  CONTENT_PACKS,
  parentSectionForSlug,
  type ContentSlug,
} from '../model/contentRegistry';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  slug: ContentSlug;
};

export function ContentPlayerScreen({slug}: Props) {
  const insets = useSafeAreaInsets();
  const {width: screenW} = useWindowDimensions();
  const {isTablet, pageGutter, pageContentMaxWidth} = useLayout();
  const navigation = useNavigation<Nav>();
  const {t} = useI18n();
  const {isAuthorized} = useAuth();
  const {hasSubscription, loading: subLoading} = useSubscription();
  const pack = CONTENT_PACKS[slug];
  const parentSection = parentSectionForSlug(slug);
  const parentLabel =
    parentSection === 'DiscussionCards'
      ? t('header.discussionCards')
      : t('header.speakingGames');

  const crumbs = [
    {
      label: t('editor.home'),
      onPress: () => goHome(navigation, isAuthorized),
    },
    {
      label: parentLabel,
      onPress: () => goToSection(navigation, parentSection, isAuthorized),
    },
    {label: t(pack.titleKey)},
  ];

  const [tabKey, setTabKey] = useState(
    pack.kind === 'cards' ? pack.tabs[0]?.key : 'clips',
  );
  const [clipIndex, setClipIndex] = useState(0);
  const [showFull, setShowFull] = useState(false);

  const allowed = isAuthorized && hasSubscription;

  const cardImages = useMemo(() => {
    if (pack.kind !== 'cards') {
      return [] as ImageSourcePropType[];
    }
    return pack.tabs.find(tab => tab.key === tabKey)?.images ?? pack.tabs[0]?.images ?? [];
  }, [pack, tabKey]);

  const contentW = Math.min(screenW, pageContentMaxWidth || screenW);
  const cardInnerW = Math.min(contentW - pageGutter * 2, isTablet ? 560 : 9999);

  if (subLoading) {
    return (
      <View style={styles.root}>
        <View
          style={[
            styles.header,
            {paddingTop: insets.top + 8, paddingHorizontal: pageGutter},
          ]}>
          <View style={{maxWidth: pageContentMaxWidth, width: '100%'}}>
            <AppHeader />
          </View>
        </View>
        <View style={[styles.crumbsPad, {paddingHorizontal: pageGutter}]}>
          <Breadcrumbs items={crumbs} />
        </View>
        <Text style={styles.loading}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!allowed) {
    return (
      <View style={styles.root}>
        <View
          style={[
            styles.header,
            {paddingTop: insets.top + 8, paddingHorizontal: pageGutter},
          ]}>
          <View style={{maxWidth: pageContentMaxWidth, width: '100%'}}>
            <AppHeader />
          </View>
        </View>
        <View style={[styles.gate, {paddingHorizontal: pageGutter}]}>
          <Breadcrumbs items={crumbs} />
          <Text style={styles.title}>{t(pack.titleKey)}</Text>
          <Text style={styles.howTo}>{t(pack.howToKey)}</Text>
          <Text style={styles.gateText}>{t('grammarPage.needSubscription')}</Text>
          <Button
            title={t('header.subscription')}
            onPress={() => navigation.navigate('Subscription')}
          />
          {!isAuthorized ? (
            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text style={styles.link}>{t('common.login')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.header,
          {paddingTop: insets.top + 8, paddingHorizontal: pageGutter},
        ]}>
        <View style={{maxWidth: pageContentMaxWidth, width: '100%'}}>
          <AppHeader />
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
          alignItems: 'center',
        }}
        showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.pageColumn,
            {maxWidth: pageContentMaxWidth, width: '100%'},
          ]}>
          <View style={[styles.crumbsPad, {paddingHorizontal: pageGutter}]}>
            <Breadcrumbs items={crumbs} />
          </View>
          <Text style={[styles.title, {marginHorizontal: pageGutter}]}>
            {t(pack.titleKey)}
          </Text>
          <Text style={[styles.howTo, {marginHorizontal: pageGutter}]}>
            {t(pack.howToKey)}
          </Text>

          {pack.kind === 'cards' ? (
            <>
              {pack.tabs.length > 1 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[
                    styles.tabs,
                    {paddingHorizontal: pageGutter},
                  ]}>
                  {pack.tabs.map(tab => {
                    const active = tab.key === tabKey;
                    return (
                      <Pressable
                        key={tab.key}
                        onPress={() => setTabKey(tab.key)}
                        style={[styles.tab, active && styles.tabActive]}>
                        <Text
                          style={[
                            styles.tabText,
                            active && styles.tabTextActive,
                          ]}>
                          {tab.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : null}
              <FlatList
                data={cardImages}
                key={`${tabKey}-${screenW}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, i) => String(i)}
                renderItem={({item, index}) => (
                  <View style={[styles.cardPage, {width: contentW}]}>
                    <ZoomableImage
                      source={item}
                      style={{
                        width: cardInnerW,
                        height: cardInnerW * 1.25,
                        backgroundColor: colors.white,
                        borderRadius: radii.lg,
                      }}
                      resizeMode="contain"
                    />
                    <Text style={styles.counter}>
                      {index + 1} / {cardImages.length}
                    </Text>
                  </View>
                )}
              />
            </>
          ) : (
            <View style={{paddingHorizontal: pageGutter}}>
              <YoutubeSection
                clips={pack.clips}
                clipIndex={clipIndex}
                setClipIndex={setClipIndex}
                showFull={showFull}
                setShowFull={setShowFull}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function YoutubeSection({
  clips,
  clipIndex,
  setClipIndex,
  showFull,
  setShowFull,
}: {
  clips: {id: number; shortId: string; fullId: string}[];
  clipIndex: number;
  setClipIndex: (n: number) => void;
  showFull: boolean;
  setShowFull: (v: boolean) => void;
}) {
  const {t} = useI18n();
  const clip = clips[clipIndex] ?? clips[0];
  if (!clip) {
    return null;
  }
  const videoId = showFull ? clip.fullId : clip.shortId;
  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"/><style>html,body{margin:0;background:#000;height:100%}iframe{width:100%;height:100%;border:0}</style></head><body><iframe src="https://www.youtube.com/embed/${videoId}?rel=0&playsinline=1" allowfullscreen allow="autoplay; encrypted-media"></iframe></body></html>`;

  return (
    <View style={styles.ytWrap}>
      <View style={styles.ytFrame}>
        <WebView
          source={{html}}
          style={styles.webview}
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction
        />
      </View>
      <View style={styles.ytControls}>
        <Pressable
          disabled={clipIndex <= 0}
          onPress={() => setClipIndex(Math.max(0, clipIndex - 1))}
          style={styles.ytBtn}>
          <Text style={styles.ytBtnText}>←</Text>
        </Pressable>
        <Text style={styles.counter}>
          {clipIndex + 1} / {clips.length}
        </Text>
        <Pressable
          disabled={clipIndex >= clips.length - 1}
          onPress={() => setClipIndex(Math.min(clips.length - 1, clipIndex + 1))}
          style={styles.ytBtn}>
          <Text style={styles.ytBtnText}>→</Text>
        </Pressable>
      </View>
      <Pressable onPress={() => setShowFull(!showFull)} style={styles.toggle}>
        <Text style={styles.toggleText}>
          {showFull ? t('games.open') : 'Full version'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F9F9F9'},
  header: {paddingBottom: 8, alignItems: 'center'},
  pageColumn: {alignSelf: 'center'},
  crumbsPad: {paddingTop: 8},
  loading: {textAlign: 'center', marginTop: 40, color: colors.muted},
  gate: {paddingVertical: 24, gap: 14, alignItems: 'center'},
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    marginTop: 8,
  },
  howTo: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  gateText: {fontSize: 15, textAlign: 'center', color: colors.muted},
  link: {color: colors.primary, fontWeight: '700', marginTop: 8},
  tabs: {gap: 8, paddingBottom: 12},
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {backgroundColor: colors.primarySoft, borderColor: colors.primary},
  tabText: {fontWeight: '700', color: colors.text, fontSize: 13},
  tabTextActive: {color: colors.primary},
  cardPage: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  counter: {
    marginTop: 10,
    color: colors.muted,
    fontWeight: '600',
  },
  ytWrap: {gap: 12},
  ytFrame: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  webview: {flex: 1, backgroundColor: '#000'},
  ytControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ytBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ytBtnText: {fontSize: 20, color: colors.primary, fontWeight: '700'},
  toggle: {alignSelf: 'center', padding: 10},
  toggleText: {color: colors.primary, fontWeight: '700'},
});
