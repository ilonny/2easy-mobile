import {StyleSheet, View} from 'react-native';

import {ExHeader} from '../ExHeader';
import {ImageGallery} from '../ImageGallery';

type Props = {data: any};

export function ImageExView({data}: Props) {
  const images =
    (Array.isArray(data?.images) && data.images.length
      ? data.images
      : data?.attachments) || [];

  return (
    <View style={styles.root}>
      <ExHeader
        title={data?.title}
        titleColor={data?.titleColor}
        subtitle={data?.subtitle}
        description={data?.description}
      />
      <ImageGallery images={images} viewType={data?.viewType} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {gap: 12},
});
