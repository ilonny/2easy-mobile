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
import {useLayout} from '../../../shared/lib/layout';
import {AppDialog, Button} from '../../../shared/ui';
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

type Props = {
  disableUppercase?: boolean;
};

export function SubscribeCancelButton({disableUppercase}: Props) {
  const {t} = useI18n();
  const {hasPaidTariff, reload} = useSubscription();
  const {isTablet, authFormMaxWidth, pageGutter} = useLayout();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const [otherText, setOtherText] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
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
      : selected || t('subscriptionCancel.reasonNotSpecified');
    const reasonText =
      selected === 'other'
        ? `${reasonLabel}${otherText ? `: ${otherText}` : ''}`
        : reasonLabel;

    setLoading(true);
    try {
      const res = await postJson<{
        success?: boolean;
        message?: string;
        successMessage?: string;
      }>({
        path: '/subscription/cancel',
        isSecure: true,
        data: {cancelReason: reasonText},
      });
      if (!res.success) {
        setNotice(res.message || t('subscription.serverErrorTryLater'));
        return;
      }
      await reload();
      close();
      setNotice(
        res.successMessage || t('subscriptionCancel.cancelled'),
      );
    } catch {
      setNotice(t('subscription.serverErrorTryLater'));
    } finally {
      setLoading(false);
    }
  };

  if (!hasPaidTariff) {
    return null;
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={8}>
        <Text
          style={[
            styles.link,
            disableUppercase ? null : styles.linkUpper,
          ]}>
          {t('subscriptionCancel.cancelButton')}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable
          style={[
            styles.backdrop,
            {
              paddingHorizontal: isTablet ? pageGutter : 16,
              paddingBottom: keyboardHeight,
            },
          ]}
          onPress={close}>
          <Pressable
            style={[
              styles.card,
              isTablet && styles.cardTablet,
              {maxWidth: authFormMaxWidth, width: '100%'},
            ]}
            onPress={e => e.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.title, isTablet && styles.titleTablet]}>
                {t('subscriptionCancel.shareWhyTitle')}
              </Text>
              <Text style={[styles.sub, isTablet && styles.subTablet]}>
                {t('subscriptionCancel.itsValuable')}
              </Text>
              {REASON_KEYS.map(reason => {
                const active = selected === reason.id;
                return (
                  <Pressable
                    key={reason.id}
                    onPress={() => setSelected(reason.id)}
                    style={[
                      styles.reason,
                      isTablet && styles.reasonTablet,
                      active && styles.reasonActive,
                    ]}>
                    <Text style={[styles.reasonText, isTablet && styles.reasonTextTablet]}>
                      {t(reason.labelKey)}
                    </Text>
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
                  style={[styles.other, isTablet && styles.otherTablet]}
                />
              ) : null}
              <View style={[styles.actions, isTablet && styles.actionsTablet]}>
                <View style={styles.actionHalf}>
                  <Button
                    title={t('subscriptionCancel.cancelButton')}
                    onPress={() => {
                      void onCancel();
                    }}
                    loading={loading}
                    style={styles.cancelBtn}
                  />
                </View>
                <View style={styles.actionHalf}>
                  <Button
                    title={t('subscriptionCancel.stayWith2Easy')}
                    onPress={close}
                  />
                </View>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <AppDialog
        visible={!!notice}
        message={notice || undefined}
        onClose={() => setNotice(null)}
        actions={[
          {
            label: t('common.close'),
            variant: 'primary',
            onPress: () => setNotice(null),
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  link: {
    color: '#C9C9C9',
    fontSize: 14,
    letterSpacing: 0.4,
    marginTop: 8,
    paddingVertical: 8,
  },
  linkUpper: {
    textTransform: 'uppercase',
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.modalBackdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: 20,
    maxHeight: '90%',
  },
  cardTablet: {
    padding: 28,
    borderRadius: 24,
    maxHeight: '84%',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.text,
    marginBottom: 6,
  },
  titleTablet: {
    fontSize: 24,
    lineHeight: 30,
    marginBottom: 10,
  },
  sub: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 16,
  },
  subTablet: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
  },
  reason: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  reasonTablet: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 56,
    marginBottom: 10,
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
  reasonTextTablet: {
    fontSize: 17,
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
  otherTablet: {
    minHeight: 100,
    fontSize: 17,
    padding: 16,
  },
  actions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  actionsTablet: {
    marginTop: 20,
    gap: 12,
  },
  actionHalf: {
    flex: 1,
  },
  cancelBtn: {
    backgroundColor: '#6B7280',
  },
});
