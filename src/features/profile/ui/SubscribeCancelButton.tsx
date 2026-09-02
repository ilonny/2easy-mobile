import {useCallback, useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {postJson} from '../../../shared/api';
import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {useKeyboardBottomOffset} from '../../../shared/lib/useKeyboardBottomOffset';
import {Button} from '../../../shared/ui';
import {useSubscription} from '../../home/model/useSubscription';

const REASON_KEYS = [
  {
    id: 'other_platforms',
    labelKey: 'subscriptionCancel.reasonOtherPlatforms',
  },
  {
    id: 'few_materials',
    labelKey: 'subscriptionCancel.reasonFewMaterials',
  },
  {
    id: 'inconvenient',
    labelKey: 'subscriptionCancel.reasonInconvenient',
  },
  {
    id: 'quality',
    labelKey: 'subscriptionCancel.reasonQuality',
  },
  {
    id: 'expensive',
    labelKey: 'subscriptionCancel.reasonExpensive',
  },
  {
    id: 'other',
    labelKey: 'subscriptionCancel.reasonOther',
  },
] as const;

export function SubscribeCancelButton() {
  const {t} = useI18n();
  const {reload} = useSubscription();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const [otherText, setOtherText] = useState('');
  const [loading, setLoading] = useState(false);
  const keyboardHeight = useKeyboardBottomOffset(open);

  const close = useCallback(() => {
    setOpen(false);
    setSelected('');
    setOtherText('');
  }, []);

  const onCancel = async () => {
    const reasonMeta = REASON_KEYS.find(r => r.id === selected);
    const reasonLabel = reasonMeta
      ? t(reasonMeta.labelKey)
      : t('subscriptionCancel.reasonNotSpecified');
    const reasonText =
      selected === 'other'
        ? `${reasonLabel}${otherText ? `: ${otherText}` : ''}`
        : reasonLabel;

    setLoading(true);
    try {
      await postJson({
        path: '/subscription/cancel',
        isSecure: true,
        data: {cancelReason: reasonText},
      });
      await reload();
      close();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={8}>
        <Text style={styles.link}>{t('subscriptionCancel.cancelButton')}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable
          style={[styles.backdrop, {paddingBottom: keyboardHeight}]}
          onPress={close}>
          <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>
                {t('subscriptionCancel.shareWhyTitle')}
              </Text>
              <Text style={styles.sub}>{t('subscriptionCancel.itsValuable')}</Text>
              {REASON_KEYS.map(reason => {
                const active = selected === reason.id;
                return (
                  <Pressable
                    key={reason.id}
                    onPress={() => setSelected(reason.id)}
                    style={[styles.reason, active && styles.reasonActive]}>
                    <Text style={styles.reasonText}>{t(reason.labelKey)}</Text>
                  </Pressable>
                );
              })}
              {selected === 'other' ? (
                <TextInput
                  value={otherText}
                  onChangeText={setOtherText}
                  placeholder={t('subscriptionCancel.placeholderOther')}
                  placeholderTextColor={colors.muted}
                  multiline
                  style={styles.other}
                />
              ) : null}
              <View style={styles.actions}>
                <View style={styles.actionHalf}>
                  <Button
                    title={t('subscriptionCancel.cancelButton')}
                    onPress={onCancel}
                    loading={loading}
                    disabled={!selected}
                  />
                </View>
                <Pressable style={styles.stay} onPress={close}>
                  <Text style={styles.stayText}>
                    {t('subscriptionCancel.stayWith2Easy')}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  link: {
    color: '#C9C9C9',
    fontSize: 14,
    letterSpacing: 0.4,
    marginTop: 8,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.modalBackdrop,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: 20,
    maxHeight: '90%',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.text,
    marginBottom: 6,
  },
  sub: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 16,
  },
  reason: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 8,
  },
  reasonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  reasonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  other: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 12,
    marginTop: 4,
    marginBottom: 8,
    textAlignVertical: 'top',
    color: colors.text,
  },
  actions: {
    marginTop: 12,
    gap: 10,
  },
  actionHalf: {
    width: '100%',
  },
  stay: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
  },
  stayText: {
    color: colors.white,
    fontWeight: '700',
  },
});
