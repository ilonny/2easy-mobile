import {StyleSheet, View} from 'react-native';
import {WebView} from 'react-native-webview';

import {radii} from '../../../../shared/config/theme';
import {ExHeader} from '../ExHeader';
import {ImageGallery} from '../ImageGallery';

type Props = {data: any};

function wrapIframe(html?: string) {
  const body = html?.trim() || '';
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><style>html,body{margin:0;padding:0;height:100%}iframe{width:100%;height:100%;border:0;display:block}</style></head><body>${body}</body></html>`;
}

export function IntExView({data}: Props) {
  const bgImages = data?.images?.length ? [data.images[0]] : [];

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
      {!!data?.iframe && (
        <WebView
          source={{html: wrapIframe(data.iframe)}}
          style={styles.webview}
          javaScriptEnabled
          originWhitelist={['*']}
          allowsFullscreenVideo
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {gap: 12},
  webview: {
    width: '100%',
    height: 360,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
});
