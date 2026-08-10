import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';

export type BreadcrumbCrumb = {
  label: string;
  /** Omit onPress for the current (last) crumb. */
  onPress?: () => void;
};

type Props = {
  items: BreadcrumbCrumb[];
};

/**
 * Site-style trail: Home → Section → Item.
 * Horizontally scrollable (swipe) when the trail overflows.
 * Tappable ancestors navigate back / to that section.
 */
export function Breadcrumbs({items}: Props) {
  if (!items.length) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const clickable = !!item.onPress && !isLast;

        return (
          <View key={`${item.label}-${index}`} style={styles.item}>
            {index > 0 ? <Text style={styles.sep}>/</Text> : null}
            {clickable ? (
              <Pressable
                onPress={item.onPress}
                hitSlop={8}
                style={({pressed}) => pressed && styles.pressed}>
                <Text style={styles.link} numberOfLines={1}>
                  {item.label}
                </Text>
              </Pressable>
            ) : (
              <Text
                style={[styles.current, !isLast && styles.link]}
                numberOfLines={1}>
                {item.label}
              </Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 220,
  },
  sep: {
    marginHorizontal: 8,
    color: '#9A9A9A',
    fontSize: 13,
    fontWeight: '500',
  },
  link: {
    color: '#5837dc',
    fontSize: 13,
    fontWeight: '600',
  },
  current: {
    color: '#6B6B6B',
    fontSize: 13,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
