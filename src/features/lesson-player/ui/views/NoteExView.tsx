import {StyleSheet, Text, View} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {HtmlContent} from '../HtmlContent';

type Props = {data: any};

export function NoteExView({data}: Props) {
  const desc = data?.description || '';
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(desc);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.icon}>ℹ</Text>
        <Text style={styles.title}>{data?.title}</Text>
      </View>
      {looksLikeHtml ? (
        <HtmlContent html={desc} />
      ) : !!desc ? (
        <Text style={styles.desc}>{desc}</Text>
      ) : null}
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
  desc: {
    fontSize: 16,
    color: '#8580A1',
    lineHeight: 22,
  },
});
