import {useCallback, useEffect, useState} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {colors, radii} from '../config/theme';
import {useLayout} from '../lib/layout';
import {useI18n} from '../i18n';
import {Button} from './Button';

export const DEFAULT_TITLE_COLOR = '#3F28C6';

/** Columns = hues, rows = light → dark. Tap only, no sliders. */
const PALETTE: string[][] = [
  ['#FFFFFF', '#F3F4F6', '#D1D5DB', '#6B7280', '#111827', '#000000'],
  ['#FEE2E2', '#FCA5A5', '#EF4444', '#DC2626', '#991B1B', '#7F1D1D'],
  ['#FFEDD5', '#FDBA74', '#F97316', '#EA580C', '#9A3412', '#7C2D12'],
  ['#FEF3C7', '#FCD34D', '#F59E0B', '#D97706', '#92400E', '#78350F'],
  ['#FEF9C3', '#FDE047', '#EAB308', '#CA8A04', '#A16207', '#713F12'],
  ['#DCFCE7', '#86EFAC', '#22C55E', '#16A34A', '#15803D', '#14532D'],
  ['#CFFAFE', '#67E8F9', '#06B6D4', '#0891B2', '#0E7490', '#164E63'],
  ['#DBEAFE', '#93C5FD', '#3B82F6', '#2563EB', '#1D4ED8', '#1E3A8A'],
  ['#EDE9FE', '#C4B5FD', '#8B5CF6', '#3F28C6', '#5B21B6', '#3B0764'],
  ['#FCE7F3', '#F9A8D4', '#EC4899', '#DB2777', '#BE185D', '#831843'],
];

export function normalizeHex(raw: unknown, fallback = DEFAULT_TITLE_COLOR): string {
  const s = String(raw || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) {
    return s.toUpperCase();
  }
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`.toUpperCase();
  }
  return fallback;
}

type PickerModalProps = {
  visible: boolean;
  value: string;
  onChange: (hex: string) => void;
  onClose: () => void;
};

export function ColorPickerModal({visible, value, onChange, onClose}: PickerModalProps) {
  const {t} = useI18n();
  const insets = useSafeAreaInsets();
  const {isTablet, width} = useLayout();
  const hex = normalizeHex(value);
  const [draftHex, setDraftHex] = useState(hex);

  useEffect(() => {
    if (visible) {
      setDraftHex(normalizeHex(value));
    }
  }, [visible, value]);

  const applyHex = useCallback(
    (next: string) => {
      const normalized = normalizeHex(next, draftHex);
      setDraftHex(normalized);
      onChange(normalized);
    },
    [draftHex, onChange],
  );

  const onHexTyped = (text: string) => {
    const raw = text.startsWith('#') ? text : `#${text}`;
    setDraftHex(raw.toUpperCase());
    if (/^#[0-9a-fA-F]{6}$/.test(raw) || /^#[0-9a-fA-F]{3}$/.test(raw)) {
      onChange(normalizeHex(raw));
    }
  };

  const cardWidth = Math.min(isTablet ? 440 : width - 40, width - 32);
  const selected = draftHex.toUpperCase();
  const cell = isTablet ? 36 : 30;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.card,
            {
              width: cardWidth,
              marginBottom: insets.bottom + 12,
            },
          ]}>
          <Text style={styles.title}>{t('editor.pickColor')}</Text>
          <View style={styles.previewRow}>
            <View style={[styles.previewSwatch, {backgroundColor: draftHex}]} />
            <View style={styles.hexWrap}>
              <Text style={styles.hexLabel}>{t('editor.colorHex')}</Text>
              <TextInput
                value={draftHex}
                onChangeText={onHexTyped}
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                importantForAutofill="no"
                maxLength={7}
                style={styles.hexInput}
              />
            </View>
          </View>
          <View style={styles.palette}>
            {PALETTE.map(column => (
              <View key={column.join('-')} style={styles.paletteCol}>
                {column.map(c => {
                  const active = selected === c;
                  return (
                    <Pressable
                      key={c}
                      accessibilityRole="button"
                      onPress={() => applyHex(c)}
                      style={[
                        styles.paletteCell,
                        {
                          width: cell,
                          height: cell,
                          backgroundColor: c,
                        },
                        c === '#FFFFFF' && styles.paletteCellLight,
                        active && styles.paletteCellActive,
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
          <Button title={t('common.done')} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

type SwatchProps = {
  value: string;
  onChange: (hex: string) => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function ColorSwatch({
  value,
  onChange,
  size = 32,
  style,
  accessibilityLabel,
}: SwatchProps) {
  const {t} = useI18n();
  const {isTablet} = useLayout();
  const [open, setOpen] = useState(false);
  const hex = normalizeHex(value);
  const dim = isTablet ? Math.max(size, 36) : size;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || t('editor.pickColor')}
        hitSlop={8}
        onPress={() => setOpen(true)}
        style={[
          styles.swatch,
          {
            width: dim,
            height: dim,
            backgroundColor: hex,
          },
          style,
        ]}
      />
      <ColorPickerModal
        visible={open}
        value={hex}
        onChange={onChange}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

type ColorFieldProps = {
  label: string;
  value: string;
  onChange: (hex: string) => void;
};

export function ColorField({label, value, onChange}: ColorFieldProps) {
  const {t} = useI18n();
  const {isTablet} = useLayout();
  const hex = normalizeHex(value);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(hex);

  useEffect(() => {
    setDraft(hex);
  }, [hex]);

  const commitTyped = (text: string) => {
    const raw = text.startsWith('#') ? text : `#${text}`;
    setDraft(raw.toUpperCase());
    if (/^#[0-9a-fA-F]{6}$/.test(raw) || /^#[0-9a-fA-F]{3}$/.test(raw)) {
      onChange(normalizeHex(raw));
    }
  };

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, isTablet && styles.fieldLabelTablet]}>
        {label}
      </Text>
      <View style={styles.fieldRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('editor.pickColor')}
          onPress={() => setOpen(true)}
          style={[styles.swatch, styles.fieldSwatch, {backgroundColor: hex}]}
        />
        <TextInput
          value={draft}
          onChangeText={commitTyped}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          importantForAutofill="no"
          maxLength={7}
          style={[styles.hexInput, styles.fieldHex, isTablet && styles.fieldHexTablet]}
        />
      </View>
      <ColorPickerModal
        visible={open}
        value={hex}
        onChange={next => {
          onChange(next);
          setDraft(next);
        }}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

type TitleColorFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  color: string;
  onColorChange: (hex: string) => void;
};

export function TitleColorField({
  label,
  value,
  onChangeText,
  color,
  onColorChange,
}: TitleColorFieldProps) {
  const {isTablet} = useLayout();
  const hex = normalizeHex(color);

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, isTablet && styles.fieldLabelTablet]}>
        {label}
      </Text>
      <View style={[styles.titleInputRow, isTablet && styles.titleInputRowTablet]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={colors.muted}
          style={[
            styles.titleInput,
            isTablet && styles.titleInputTablet,
            {color: hex},
          ]}
        />
        <ColorSwatch value={hex} onChange={onColorChange} size={30} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.modalBackdrop,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: 16,
    maxWidth: 440,
    zIndex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  previewSwatch: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hexWrap: {flex: 1},
  hexLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  hexInput: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
    borderRadius: radii.sm,
    minHeight: 44,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.text,
  },
  palette: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 4,
  },
  paletteCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  paletteCell: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paletteCellLight: {
    borderColor: colors.borderMuted,
  },
  paletteCellActive: {
    borderWidth: 3,
    borderColor: colors.primary,
  },
  swatch: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  fieldWrap: {
    marginBottom: 16,
  },
  fieldLabel: {
    marginBottom: 6,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  fieldLabelTablet: {
    fontSize: 14,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldSwatch: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  fieldHex: {
    flex: 1,
  },
  fieldHexTablet: {
    minHeight: 52,
    fontSize: 17,
  },
  titleInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
    borderRadius: radii.sm,
    minHeight: 48,
    paddingLeft: 14,
    paddingRight: 8,
    gap: 8,
  },
  titleInputRowTablet: {
    minHeight: 52,
    paddingLeft: 16,
  },
  titleInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
    color: colors.text,
  },
  titleInputTablet: {
    fontSize: 17,
  },
});
