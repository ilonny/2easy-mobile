import {Pressable, StyleSheet, Text, View} from 'react-native';

import {colors, radii} from '../config/theme';
import {useI18n, type AppLanguage} from '../i18n';
import {hapticLight} from '../lib/haptics';

const LANGUAGES: {code: AppLanguage; label: string}[] = [
  {code: 'ru', label: 'RU'},
  {code: 'en', label: 'EN'},
];

export function LanguageSwitcher() {
  const {language, setLanguage} = useI18n();

  return (
    <View style={styles.group}>
      {LANGUAGES.map(({code, label}) => {
        const active = language === code;
        return (
          <Pressable
            key={code}
            accessibilityRole="button"
            accessibilityState={{selected: active}}
            onPress={() => {
              hapticLight();
              setLanguage(code);
            }}
            style={[styles.button, active && styles.buttonActive]}>
            <Text style={[styles.label, active && styles.labelActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: radii.sm,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  button: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  buttonActive: {
    backgroundColor: colors.white,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  labelActive: {
    color: colors.primary,
  },
});
