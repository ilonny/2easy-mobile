import {useEffect, useRef} from 'react';
import {ActivityIndicator, Alert, Pressable, StyleSheet, Text} from 'react-native';

import {useI18n} from '../../../shared/i18n';
import {colors} from '../../../shared/config/theme';
import {isYandexTtsLanguageSupported} from '../lib/ttsLanguages';
import {useSpeechPlayback} from '../model/speechPlayback';

type Props = {
  id: string;
  text: string;
  languageCode?: string;
  disabled?: boolean;
};

export function SpeakWordButton({id, text, languageCode, disabled}: Props) {
  const {t} = useI18n();
  const {speak, isLoading} = useSpeechPlayback();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const loading = isLoading(id);
  const supported = isYandexTtsLanguageSupported(languageCode);
  const isDisabled = disabled || loading || !text.trim() || !supported;

  const onPress = () => {
    if (isDisabled) {
      return;
    }
    void speak(id, text, languageCode).catch(error => {
      if (!mounted.current) {
        return;
      }
      const message =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : t('dictionary.pronunciationError');
      Alert.alert(message);
    });
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={
        supported
          ? t('dictionary.playPronunciation')
          : t('dictionary.pronunciationUnavailable')
      }
      style={[styles.button, isDisabled && styles.disabled]}>
      {loading ? (
        <ActivityIndicator color={colors.primary} size="small" />
      ) : (
        <Text style={styles.icon} allowFontScaling={false}>
          🔊
        </Text>
      )}
    </Pressable>
  );
}

SpeakWordButton.displayName = 'SpeakWordButton';

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  disabled: {opacity: 0.4},
  icon: {fontSize: 20},
});
