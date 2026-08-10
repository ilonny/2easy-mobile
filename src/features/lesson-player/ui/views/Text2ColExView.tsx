import {Image, StyleSheet, View} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {ExHeader} from '../ExHeader';
import {HtmlContent} from '../HtmlContent';
import {ImageGallery} from '../ImageGallery';

type Props = {data: any};

function Col({
  html,
  image,
}: {
  html?: string;
  image?: {dataURL?: string};
}) {
  return (
    <View style={styles.col}>
      {!!image?.dataURL && (
        <Image
          source={{uri: image.dataURL}}
          style={styles.editorImg}
          resizeMode="contain"
        />
      )}
      <HtmlContent html={html} />
    </View>
  );
}

export function Text2ColExView({data}: Props) {
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
      <View style={styles.cols}>
        <Col html={data?.content} image={data?.editorImages?.[0]} />
        <Col
          html={data?.secondContent}
          image={data?.secondEditorImages?.[0]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {gap: 12},
  cols: {gap: 12},
  col: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 14,
    flex: 1,
  },
  editorImg: {
    width: '100%',
    height: 140,
    marginBottom: 10,
    borderRadius: radii.md,
  },
});
