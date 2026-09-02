import {useState} from 'react';
import {Image, StyleSheet, View} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {useLayout} from '../../../../shared/lib/layout';
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
  const [colW, setColW] = useState(0);
  return (
    <View
      style={styles.col}
      onLayout={e => {
        const w = Math.floor(e.nativeEvent.layout.width);
        if (w > 0 && w !== colW) {
          setColW(w);
        }
      }}>
      {!!image?.dataURL && (
        <Image
          source={{uri: image.dataURL}}
          style={styles.editorImg}
          resizeMode="contain"
        />
      )}
      <HtmlContent html={html} contentWidth={colW > 0 ? colW : undefined} />
    </View>
  );
}

export function Text2ColExView({data}: Props) {
  const {isTablet, isLandscape} = useLayout();
  const sideBySide = isTablet || isLandscape;
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
      <View style={[styles.cols, sideBySide && styles.colsRow]}>
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
  cols: {gap: 12, width: '100%'},
  colsRow: {flexDirection: 'row', alignItems: 'flex-start', width: '100%'},
  col: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 14,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  editorImg: {
    width: '100%',
    height: 140,
    marginBottom: 10,
    borderRadius: radii.md,
  },
});
