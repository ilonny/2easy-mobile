import {StyleSheet, View} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {SmartImage} from '../../../../shared/ui';
import {resolveMediaUri} from '../../../../shared/lib/mediaUri';
import {ExHeader} from '../ExHeader';
import {HtmlContent} from '../HtmlContent';
import {ImageGallery} from '../ImageGallery';

type Props = {data: any};

export function TextDefaultExView({data}: Props) {
  const editorImage = data?.editorImages?.[0];
  const bgImages = data?.images?.length ? [data.images[0]] : [];
  const contentHtml =
    typeof data?.content === 'string'
      ? data.content
      : data?.content != null
        ? String(data.content)
        : '';

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
      <View style={styles.card}>
        {!!editorImage?.dataURL && (
          <SmartImage
            source={{uri: resolveMediaUri(editorImage.dataURL)}}
            style={styles.editorImg}
            resizeMode="contain"
          />
        )}
        <HtmlContent html={contentHtml} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {gap: 12},
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 16,
  },
  editorImg: {
    width: '100%',
    height: 180,
    marginBottom: 12,
    borderRadius: radii.md,
  },
});
