import {StyleSheet, Text, View} from 'react-native';
import {WebView} from 'react-native-webview';

import {colors, radii} from '../../../../shared/config/theme';
import {getImageUrl} from '../../lib/getImageUrl';
import {ExHeader} from '../ExHeader';
import {ImageGallery} from '../ImageGallery';

type Props = {data: any};

function videoHtml(src: string) {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><style>html,body{margin:0;padding:0;background:#000;height:100%}video,iframe{width:100%;height:100%;border:0;display:block}</style></head><body><video src="${src}" controls playsinline webkit-playsinline></video></body></html>`;
}

function wrapEmbed(html: string) {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><style>html,body{margin:0;padding:0;background:#000;height:100%}iframe,video{width:100%;height:100%;border:0;display:block}</style></head><body>${html}</body></html>`;
}

function VideoItem({video}: {video: any}) {
  const attachment = video?.attachment;
  const fileSrc =
    attachment?.dataURL ||
    (attachment?.path ? getImageUrl(attachment.path) : '');
  const isFile =
    video?.source === 'file' ||
    !!attachment?.file ||
    !!attachment?.path ||
    !!attachment?.dataURL;

  const html = isFile && fileSrc
    ? videoHtml(fileSrc)
    : video?.content
      ? wrapEmbed(video.content)
      : '';

  if (!html) return null;

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

export function VideoExView({data}: Props) {
  const bgImages = data?.images?.length ? [data.images[0]] : [];
  const videos: any[] = data?.videos || [];

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
          <VideoItem key={index} video={video} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {gap: 12},
  list: {gap: 16},
  item: {gap: 8},
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
