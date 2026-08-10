import {useMemo, useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {WebView} from 'react-native-webview';

import {useAuth} from '../../../entities/session';
import {getJson, postJson} from '../../../shared/api';
import {useI18n} from '../../../shared/i18n';
import {colors} from '../../../shared/config/theme';
import {AppDialog, Button, TextField} from '../../../shared/ui';
import {useSubscription} from '../../home/model/useSubscription';
import type {TariffOption} from '../../home/ui/SubscribeSection';

type Props = {
  visible: boolean;
  tariff: TariffOption | null;
  onClose: () => void;
};

type CreatePaymentResponse = {
  success?: boolean;
  message?: string;
  id?: number | string;
  publicId?: string;
  amount?: number;
  email?: string;
  user_id?: number | string;
  paymentModel?: {phone?: string};
};

export function PaymentModal({visible, tariff, onClose}: Props) {
  const {t} = useI18n();
  const {profile} = useAuth();
  const {reload} = useSubscription();
  const [phone, setPhone] = useState(profile?.phone || '');
  const [promocode, setPromocode] = useState('');
  const [loading, setLoading] = useState(false);
  const [widgetHtml, setWidgetHtml] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const periodType = useMemo(() => tariff?.type ?? 'month', [tariff]);

  const close = () => {
    setWidgetHtml(null);
    onClose();
  };

  const onPay = async () => {
    if (!tariff) {
      return;
    }
    setLoading(true);
    try {
      const response = await postJson<CreatePaymentResponse>({
        path: '/payment/create-payment',
        isSecure: true,
        data: {
          type: periodType,
          phone,
          promocode,
          email: profile?.login,
        },
      });

      if (!response.success || !response.id) {
        setNotice(response.message || 'Error');
        return;
      }

      const bill = await getJson<{payment_link?: string}>({
        path: `/payment/createPayTodayBill?paymentId=${response.id}`,
        isSecure: true,
      });
      if (bill.payment_link) {
        setWidgetHtml(
          `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body style="font-family:sans-serif;padding:24px;text-align:center"><p>Loading…</p><script>location.href=${JSON.stringify(bill.payment_link)}</script></body></html>`,
        );
        return;
      }

      if (response.publicId) {
        const amount = Number(response.amount ?? tariff.price);
        const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"/><script src="https://widget.cloudpayments.ru/bundles/cloudpayments.js"></script></head><body style="font-family:sans-serif;padding:16px"><p>Loading payment…</p><script>
          var cp = new cp.CloudPayments();
          cp.start({
            publicId: ${JSON.stringify(response.publicId)},
            description: ${JSON.stringify('2EASY subscription')},
            amount: ${amount},
            currency: 'RUB',
            email: ${JSON.stringify(response.email || profile?.login || '')},
            externalId: ${JSON.stringify(String(response.id))},
            accountId: ${JSON.stringify(String(response.user_id || profile?.id || ''))},
          }).then(function(r){
            if (r && r.status === 'success') {
              window.ReactNativeWebView.postMessage('success');
            } else {
              window.ReactNativeWebView.postMessage('close');
            }
          }).catch(function(){ window.ReactNativeWebView.postMessage('close'); });
        </script></body></html>`;
        setWidgetHtml(html);
        return;
      }

      await reload();
      close();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={close}>
        <View style={styles.root}>
          {widgetHtml ? (
            <WebView
              source={{html: widgetHtml}}
              onMessage={async event => {
                if (event.nativeEvent.data === 'success') {
                  await reload();
                }
                close();
              }}
              style={{flex: 1}}
            />
          ) : (
            <View style={styles.form}>
              <Text style={styles.title}>{t('subscription.subscribe')}</Text>
              {tariff ? (
                <Text style={styles.sub}>
                  {t(tariff.titleKey)} — {tariff.price} ₽
                </Text>
              ) : null}
              <TextField
                label={t('auth.phoneLabel')}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <TextField
                label="Promocode"
                value={promocode}
                onChangeText={setPromocode}
                autoCapitalize="characters"
              />
              <Button
                title={t('subscription.subscribe')}
                onPress={onPay}
                loading={loading}
              />
              <Pressable onPress={close} style={styles.cancel}>
                <Text style={styles.cancelText}>{t('common.back')}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>

      <AppDialog
        visible={!!notice}
        message={notice || undefined}
        onClose={() => setNotice(null)}
        actions={[
          {
            label: t('common.back'),
            variant: 'primary',
            onPress: () => setNotice(null),
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.white},
  form: {flex: 1, padding: 20, paddingTop: 64, gap: 8},
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  sub: {textAlign: 'center', color: colors.muted, marginBottom: 12},
  cancel: {alignItems: 'center', marginTop: 16},
  cancelText: {color: colors.muted, fontWeight: '600'},
});
