import {StyleSheet, Text, View} from 'react-native';

import {useLayout} from '../../../../shared/lib/layout';
import {ExHeader} from '../ExHeader';
import {HtmlContent, looksLikeHtml} from '../HtmlContent';
import {ImageGallery} from '../ImageGallery';

type Props = {data: any};

/** Same alternating tilt as site `card-rotate` nth-child rules. */
const STICKER_ROTATIONS = ['1deg', '-2deg', '-1deg', '1deg'] as const;

export function TextStickerExView({data}: Props) {
  const {width, isTablet, isLandscape} = useLayout();
  // Site: 2 cols from ~820px. On mobile allow 2 cols earlier so stickers sit side by side.
  const multiCol = isTablet || isLandscape || width >= 520;
  const bgImages = data?.images?.length ? [data.images[0]] : [];
  const stickers: string[] = data?.stickers || [];
  const count = stickers.length;
  const bg = data?.stickerBgColor || '#fff';
  const textColor = data?.stickerTextColor || '#000';

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
        {stickers.map((sticker, index) => {
          const isLoneLast =
            multiCol && count % 2 === 1 && index === count - 1;
          const rotate = STICKER_ROTATIONS[index % STICKER_ROTATIONS.length];
          return (
            <View
              key={`${index}-${sticker}`}
              style={[
                styles.cell,
                multiCol && !isLoneLast && styles.cellHalf,
                isLoneLast && styles.cellLone,
              ]}>
              <View
                style={[
                  styles.sticker,
                  isLoneLast && styles.stickerLone,
                  {
                    backgroundColor: bg,
                    transform: [{rotate}],
                  },
                ]}>
                <Text style={styles.pin} accessible={false}>
                  📌
                </Text>
                {looksLikeHtml(sticker) ? (
                  <HtmlContent
                    html={sticker}
                    baseStyle={{
                      color: textColor,
                      textTransform: 'uppercase',
                      fontWeight: '500',
                      fontSize: multiCol ? 15 : 14,
                      textAlign: 'center',
                      lineHeight: multiCol ? 20 : 18,
                    }}
                  />
                ) : (
                  <Text
                    style={[
                      styles.text,
                      multiCol && styles.textWide,
                      {color: textColor},
                    ]}>
                    {sticker}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {gap: 12},
  grid: {
    paddingVertical: 8,
  },
  gridMulti: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '100%',
    padding: 8,
    overflow: 'visible',
  },
  /**
   * Exactly half row — no columnGap on parent (50%+50%+gap would wrap).
   * Spacing comes from cell padding only.
   */
  cellHalf: {
    width: '50%',
    maxWidth: '50%',
    flexGrow: 0,
    flexShrink: 0,
  },
  /** Odd last sticker: full row, sticker centered at half width (site). */
  cellLone: {
    width: '100%',
    alignItems: 'center',
  },
  stickerLone: {
    width: '50%',
  },
  sticker: {
    minHeight: 140,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: {width: 1, height: 3},
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  pin: {
    position: 'absolute',
    left: 6,
    top: -14,
    fontSize: 24,
    lineHeight: 28,
    zIndex: 2,
  },
  text: {
    textTransform: 'uppercase',
    fontWeight: '500',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 18,
  },
  textWide: {
    fontSize: 15,
    lineHeight: 20,
  },
});
