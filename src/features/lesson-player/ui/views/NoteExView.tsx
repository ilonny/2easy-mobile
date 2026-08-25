import {StyleSheet, Text, View} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {HtmlContent} from '../HtmlContent';

type Props = {data: any};

export function NoteExView({data}: Props) {
  const desc = data?.description || '';

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.icon}>ℹ</Text>
        <Text style={styles.title}>{data?.title}</Text>
      </View>
      {!!desc && (
        <HtmlContent
          html={desc}
          baseStyle={{color: '#8580A1', fontSize: 16, lineHeight: 22}}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    padding: 20,
    gap: 8,
  },
  head: {flexDirection: 'row', alignItems: 'center', gap: 12},
  icon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: 'center',
    lineHeight: 28,
    backgroundColor: '#D8D2FF',
    color: '#8580A1',
    fontWeight: '800',
    overflow: 'hidden',
  },
  title: {
    flex: 1,
    fontWeight: '700',
    fontSize: 18,
    color: '#8580A1',
  },
});
