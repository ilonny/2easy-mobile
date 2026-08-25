import {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Video from 'react-native-video';

import {useI18n} from '../../../../shared/i18n';
import {colors, radii} from '../../../../shared/config/theme';
import {getImageUrl} from '../../lib/getImageUrl';
import {ExHeader} from '../ExHeader';
import {HtmlContent} from '../HtmlContent';
import {ImageGallery} from '../ImageGallery';

type Props = {data: any};

function extractAudioSrcFromHtml(html?: string) {
  if (!html || typeof html !== 'string') {
    return '';
  }
  const m = html.match(/<audio\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i);
  return m?.[1]?.trim() || '';
}

function nameFromPath(path?: string) {
  if (!path) {
    return '';
  }
  const parts = String(path).split('/');
  return parts[parts.length - 1] || 'audio.mp3';
}

function ensureAudioFilename(name: string) {
  const base = String(name || 'audio').trim() || 'audio';
  if (/\.(mp3|m4a|mpeg|wav|aac|ogg)$/i.test(base)) {
    return base;
  }
  return `${base}.mp3`;
}

export function AudioExView({data}: Props) {
  const {t} = useI18n();
  const [showScript, setShowScript] = useState(false);
  const [paused, setPaused] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const bgImages = data?.images?.length ? [data.images[0]] : [];
  const attachment = data?.editorImages?.[0];

  const audioSrc = useMemo(() => {
    if (attachment?.dataURL) {
      return attachment.dataURL;
    }
    if (typeof attachment?.path === 'string' && attachment.path) {
      return getImageUrl(attachment.path);
    }
    return extractAudioSrcFromHtml(data?.description);
  }, [attachment, data?.description]);

  const fileName = ensureAudioFilename(
    attachment?.name ||
      nameFromPath(attachment?.path) ||
      data?.audioTitle ||
      'audio',
  );

  const onDownload = async () => {
    if (!audioSrc || downloading) {
      return;
    }
    setDownloading(true);
    try {
      if (Platform.OS === 'ios') {
        await Share.share({
          url: audioSrc,
          title: fileName,
        });
        return;
      }
      // Android: open the file URL so the system can download / open it.
      const canOpen = await Linking.canOpenURL(audioSrc);
      if (canOpen) {
        await Linking.openURL(audioSrc);
        return;
      }
      await Share.share({
        message: audioSrc,
        title: fileName,
      });
    } catch {
      // user cancelled share sheet or link failed — ignore
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={styles.root}>
      <ExHeader
        title={data?.title}
        titleColor={data?.titleColor}
        subtitle={data?.subtitle}
        description={
          typeof data?.description === 'string' &&
          /<audio\b/i.test(data.description)
            ? undefined
            : data?.description
        }
      />
      {!!bgImages.length && (
        <ImageGallery images={bgImages} viewType="carousel" />
      )}
      {!!audioSrc && (
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.audioTitle} numberOfLines={2}>
              {data?.audioTitle || fileName || t('templates.audio')}
            </Text>
            <Pressable
              onPress={() => {
                void onDownload();
              }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('common.download')}
              style={styles.downloadBtn}
              disabled={downloading}>
              {downloading ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Text style={styles.downloadIcon}>⬇</Text>
              )}
            </Pressable>
          </View>
          <Video
            source={{uri: audioSrc}}
            paused={paused}
            controls={false}
            style={styles.hiddenVideo}
            onEnd={() => setPaused(true)}
            ignoreSilentSwitch="ignore"
          />
          <Pressable
            style={styles.playBtn}
            onPress={() => setPaused(p => !p)}>
            <Text style={styles.playText}>
              {paused ? `▶ ${t('common.play')}` : `⏸ ${t('common.pause')}`}
            </Text>
          </Pressable>
          {!!data?.audioDescription && (
            <>
              <Pressable onPress={() => setShowScript(s => !s)}>
                <Text style={styles.scriptToggle}>
                  {showScript
                    ? t('common.hideScript')
                    : t('common.showScript')}
                </Text>
              </Pressable>
              {showScript ? (
                <View style={styles.script}>
                  <HtmlContent html={data.audioDescription} />
                </View>
              ) : null}
            </>
          )}
          {!!data?.content && <HtmlContent html={data.content} />}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {gap: 12},
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: 16,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 28,
    paddingHorizontal: 28,
  },
  audioTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
    color: colors.primary,
    fontSize: 16,
  },
  downloadBtn: {
    position: 'absolute',
    right: 0,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadIcon: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '700',
  },
  hiddenVideo: {width: 0, height: 0},
  playBtn: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  playText: {color: colors.primary, fontWeight: '700', fontSize: 16},
  scriptToggle: {
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  script: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.md,
    padding: 12,
  },
});
