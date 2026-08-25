import {StyleSheet, Text, View} from 'react-native';

import {colors} from '../../../shared/config/theme';
import {HtmlContent, looksLikeHtml} from './HtmlContent';

type Props = {
  title?: string;
  titleColor?: string;
  subtitle?: string;
  description?: string;
};

export function ExHeader({title, titleColor, subtitle, description}: Props) {
  return (
    <View style={styles.wrap}>
      {!!title && (
        <Text style={[styles.title, titleColor ? {color: titleColor} : null]}>
          {title}
        </Text>
      )}
      {!!subtitle &&
        (looksLikeHtml(subtitle) ? (
          <HtmlContent
            html={subtitle}
            baseStyle={styles.htmlCentered}
            contentWidth={320}
          />
        ) : (
          <Text style={styles.subtitle}>{subtitle}</Text>
        ))}
      {!!description &&
        (looksLikeHtml(description) ? (
          <HtmlContent
            html={description}
            baseStyle={styles.htmlDesc}
            contentWidth={320}
          />
        ) : (
          <Text style={styles.desc}>{description}</Text>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {gap: 6, marginBottom: 12},
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  htmlCentered: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  htmlDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
