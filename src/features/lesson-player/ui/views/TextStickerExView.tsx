import {StyleSheet, Text, View} from 'react-native';

import {radii} from '../../../../shared/config/theme';
import {useLayout} from '../../../../shared/lib/layout';
import {ExHeader} from '../ExHeader';
import {HtmlContent, looksLikeHtml} from '../HtmlContent';
import {ImageGallery} from '../ImageGallery';

type Props = {data: any};

export function TextStickerExView({data}: Props) {
  const {isTablet, isLandscape} = useLayout();
  const multiCol = isTablet || isLandscape;
  const bgImages = data?.images?.length ? [data.images[0]] : [];
  const stickers: string[] = data?.stickers || [];

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
      <View style={[styles.grid, multiCol && styles.gridMulti]}>
        {stickers.map((sticker, index) => (
          <View
            key={`${index}-${sticker}`}
            style={[
              styles.card,
              multiCol && styles.cardHalf,
              {backgroundColor: data?.stickerBgColor || '#fff'},
            ]}>
            <Text style={styles.pin}>📌</Text>
            {looksLikeHtml(sticker) ? (
              <HtmlContent
                html={sticker}
                baseStyle={{
                  color: data?.stickerTextColor || '#000',
                  textTransform: 'uppercase',
                  fontWeight: '500',
                  fontSize: 15,
                  textAlign: 'center',
                  lineHeight: 20,
                }}
              />
            ) : (
              <Text
                style={[
                  styles.text,
                  {color: data?.stickerTextColor || '#000'},
                ]}>
                {sticker}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {gap: 12},
  grid: {gap: 10},
  gridMulti: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    minHeight: 120,
    borderRadius: radii.md,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardHalf: {
    width: '48%',
    flexGrow: 1,
  },
  pin: {
    position: 'absolute',
    left: 8,
    top: -10,
    fontSize: 22,
  },
  text: {
    textTransform: 'uppercase',
    fontWeight: '500',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
});
