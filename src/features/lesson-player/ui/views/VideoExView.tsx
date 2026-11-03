import {useCallback, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Video, {type OnProgressData, type VideoRef} from 'react-native-video';
import {WebView} from 'react-native-webview';

import {rewriteSiteUrl} from '../../../../shared/config';
import {useI18n} from '../../../../shared/i18n';
import {colors, radii} from '../../../../shared/config/theme';
import {
  SyncWithStudentsButton,
  useSyncedMediaPlayer,
  useTeacherMediaSync,
  type SyncedMediaControls,
} from '../../mediaSync';
import {useLessonPlayer} from '../../model/LessonPlayerContext';
import {getImageUrl} from '../../lib/getImageUrl';
import {ExHeader} from '../ExHeader';
import {ImageGallery} from '../ImageGallery';

type Props = {data: any};

function wrapEmbed(html: string) {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><style>html,body{margin:0;padding:0;background:#000;height:100%}iframe,video{width:100%;height:100%;border:0;display:block}</style></head><body>${html}</body></html>`;
}

function FileVideoItem({
  video,
  mediaIndex,
  exId,
}: {
  video: any;
  mediaIndex: number;
  exId: number;
}) {
  const {t} = useI18n();
  const {lessonId, isTeacher} = useLessonPlayer();
  const attachment = video?.attachment;
  const fileSrc = rewriteSiteUrl(
    attachment?.dataURL ||
      (attachment?.path ? getImageUrl(attachment.path) : ''),
  );
  const [paused, setPaused] = useState(true);
  const videoRef = useRef<VideoRef>(null);
  const positionRef = useRef(0);
  const pausedRef = useRef(true);

  const getControls = useCallback((): SyncedMediaControls | null => {
    if (!fileSrc) {
      return null;
    }
    return {
      seek: (sec: number) => {
        videoRef.current?.seek(Math.max(0, sec));
        positionRef.current = Math.max(0, sec);
      },
      play: () => {
        pausedRef.current = false;
        setPaused(false);
      },
      pause: () => {
        pausedRef.current = true;
        setPaused(true);
      },
      getPositionSec: () => positionRef.current,
      isPaused: () => pausedRef.current,
    };
  }, [fileSrc]);

  useSyncedMediaPlayer({
    enabled: !isTeacher && !!exId && !!fileSrc,
    exId,
    kind: 'video',
    mediaIndex,
    getControls,
  });

  const {active: syncOn, toggleSync, notifyPlaybackChange} =
    useTeacherMediaSync({
      enabled: !!isTeacher && !!lessonId && !!exId && !!fileSrc,
      lessonId,
      exId,
      kind: 'video',
      mediaIndex,
      getControls,
    });

  if (!fileSrc) {
    return null;
  }

  const togglePlay = () => {
    const next = !paused;
    pausedRef.current = next;
    setPaused(next);
    notifyPlaybackChange(next, positionRef.current);
  };

  return (
    <View style={styles.item}>
      <View style={styles.playerWrap}>
        <Video
          ref={videoRef}
          source={{uri: fileSrc}}
          style={styles.nativeVideo}
          paused={paused}
          resizeMode="contain"
          controls={false}
          onProgress={(meta: OnProgressData) => {
            positionRef.current = meta.currentTime || 0;
          }}
          progressUpdateInterval={250}
          onEnd={() => {
            pausedRef.current = true;
            setPaused(true);
            notifyPlaybackChange(true, positionRef.current);
          }}
          ignoreSilentSwitch="ignore"
        />
        <View style={styles.videoOverlay}>
          <Pressable style={styles.videoPlayBtn} onPress={togglePlay}>
            <Text style={styles.videoPlayText}>
              {paused ? `▶ ${t('common.play')}` : `⏸ ${t('common.pause')}`}
            </Text>
          </Pressable>
          {isTeacher ? (
            <SyncWithStudentsButton
              active={syncOn}
              onPress={() => {
                void toggleSync();
              }}
            />
          ) : null}
        </View>
      </View>
      {!!video?.title && <Text style={styles.caption}>{video.title}</Text>}
    </View>
  );
}

function EmbedVideoItem({video}: {video: any}) {
  const html = video?.content
    ? rewriteSiteUrl(wrapEmbed(video.content))
    : '';
  if (!html) {
    return null;
  }
  return (
    <View style={styles.item}>
      <WebView
        source={{html}}
        style={styles.webview}
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction
        javaScriptEnabled
        originWhitelist={['*']}
      />
      {!!video?.title && <Text style={styles.caption}>{video.title}</Text>}
    </View>
  );
}

function VideoItem({
  video,
  mediaIndex,
  exId,
}: {
  video: any;
  mediaIndex: number;
  exId: number;
}) {
  const attachment = video?.attachment;
  const isFile =
    video?.source === 'file' ||
    !!attachment?.file ||
    !!attachment?.path ||
    !!attachment?.dataURL;

  if (isFile) {
    return <FileVideoItem video={video} mediaIndex={mediaIndex} exId={exId} />;
  }
  return <EmbedVideoItem video={video} />;
}

export function VideoExView({data}: Props) {
  const bgImages = data?.images?.length ? [data.images[0]] : [];
  const videos: any[] = data?.videos || [];
  const exId = Number(data?.id || 0);

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
      <View style={styles.list}>
        {videos.map((video, index) => (
          <VideoItem
            key={index}
            video={video}
            mediaIndex={index}
            exId={exId}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {gap: 12},
  list: {gap: 16},
  item: {gap: 8},
  playerWrap: {
    width: '100%',
    height: 220,
    borderRadius: radii.md,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  nativeVideo: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  videoPlayBtn: {
    flex: 1,
    backgroundColor: 'rgba(63,40,198,0.92)',
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  videoPlayText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  webview: {
    width: '100%',
    height: 220,
    borderRadius: radii.md,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  caption: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
    color: colors.text,
  },
});
