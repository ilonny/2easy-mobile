import {useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Video from 'react-native-video';

import {colors, radii} from '../../../../shared/config/theme';
import {getImageUrl} from '../../lib/getImageUrl';
import {ExHeader} from '../ExHeader';
import {HtmlContent} from '../HtmlContent';
import {ImageGallery} from '../ImageGallery';

type Props = {data: any};

function extractAudioSrcFromHtml(html?: string) {
  if (!html || typeof html !== 'string') return '';
  const m = html.match(/<audio\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i);
  return m?.[1]?.trim() || '';
}

export function AudioExView({data}: Props) {
  const [showScript, setShowScript] = useState(false);
  const [paused, setPaused] = useState(true);
  const bgImages = data?.images?.length ? [data.images[0]] : [];
  const attachment = data?.editorImages?.[0];

  const audioSrc = useMemo(() => {
    if (attachment?.dataURL) return attachment.dataURL;
    if (typeof attachment?.path === 'string' && attachment.path) {
      return getImageUrl(attachment.path);
    }
    return extractAudioSrcFromHtml(data?.description);
  }, [attachment, data?.description]);

  return (
    <View style={styles.root}>
      <ExHeader
        title={data?.title}
        titleColor={data?.titleColor}
        subtitle={data?.subtitle}
        description={data?.description}
      />
      {!!bgImages.length && (
        <ImageGallery images={bgImages} viewType="carousel" />
      )}
      {!!audioSrc && (
        <View style={styles.card}>
          <Text style={styles.audioTitle}>
            {data?.audioTitle || 'Аудио'}
          </Text>
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
            <Text style={styles.playText}>{paused ? '▶ Play' : '⏸ Pause'}</Text>
          </Pressable>
          {!!data?.audioDescription && (
            <>
              <Pressable onPress={() => setShowScript(s => !s)}>
                <Text style={styles.scriptToggle}>
                  {showScript ? 'Hide script' : 'Show script'}
                </Text>
              </Pressable>
              {showScript ? (
                <View style={styles.script}>
                  <Text style={styles.scriptText}>{data.audioDescription}</Text>
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
  audioTitle: {
    textAlign: 'center',
    fontWeight: '600',
    color: colors.primary,
    fontSize: 16,
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
  scriptText: {color: colors.text, lineHeight: 22},
});
