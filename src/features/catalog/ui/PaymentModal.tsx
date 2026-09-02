import {useMemo, useRef, useState} from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {WebView, type WebViewNavigation} from 'react-native-webview';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuth} from '../../../entities/session';
import {getJson, postJson} from '../../../shared/api';
import {useI18n} from '../../../shared/i18n';
import {colors} from '../../../shared/config/theme';
import {useKeyboardBottomOffset} from '../../../shared/lib/useKeyboardBottomOffset';
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
  reason?: string;
  id?: number | string;
  publicId?: string;
  amount?: number;
  email?: string;
  user_id?: number | string;
  paymentModel?: {phone?: string};
};

function isPaymentDoneUrl(url: string) {
  const lower = url.toLowerCase();
  return (
    lower.includes('success') ||
    lower.includes('payment-success') ||
    (lower.includes('subscribe') && lower.includes('paid'))
  );
}

export function PaymentModal({visible, tariff, onClose}: Props) {
  const {t} = useI18n();
  const insets = useSafeAreaInsets();
  const {profile} = useAuth();
  const {reload} = useSubscription();
  const [phone, setPhone] = useState(profile?.phone || '');
  const [promocode, setPromocode] = useState('');
  const [loading, setLoading] = useState(false);
  const [widgetHtml, setWidgetHtml] = useState<string | null>(null);
  const [widgetUrl, setWidgetUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const finishing = useRef(false);
  const keyboardHeight = useKeyboardBottomOffset(
    visible && !widgetHtml && !widgetUrl,
  );

  const periodType = useMemo(() => tariff?.type ?? 'month', [tariff]);

  const close = () => {
    setWidgetHtml(null);
    setWidgetUrl(null);
    finishing.current = false;
    onClose();
  };

  const finishSuccess = async () => {
    if (finishing.current) {
      return;
    }
    finishing.current = true;
    await reload();
    close();
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
          promocode: promocode.trim().toLowerCase(),
          email: profile?.login,
        },
      });

      if (!response.success || !response.id) {
        setNotice(
          response.reason === 'already_used'
            ? t('subscription.promocodeAlreadyUsed')
            : response.message || 'Error',
        );
        return;
      }

      const bill = await getJson<{payment_link?: string}>({
        path: `/payment/createPayTodayBill?paymentId=${response.id}`,
        isSecure: true,
      });
      if (bill.payment_link) {
        setWidgetUrl(bill.payment_link);
        return;
      }

      if (response.publicId) {
        const amount = Number(response.amount ?? tariff.price);
        const recurrentPeriod =
          periodType === 'month' ? 1 : periodType === '3month' ? 3 : 12;
        const html = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<script src="https://widget.cloudpayments.ru/bundles/cloudpayments.js"></script>
</head><body style="font-family:Manrope,sans-serif;padding:16px;text-align:center">
<p>Loading payment…</p>
<script>
(function () {
  function done(status) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(status);
    }
  }
  function start() {
    if (!window.cp || !window.cp.CloudPayments) {
      setTimeout(start, 200);
      return;
    }
    var widget = new window.cp.CloudPayments();
    widget.start({
      publicId: ${JSON.stringify(response.publicId)},
      publicTerminalId: ${JSON.stringify(response.publicId)},
      description: ${JSON.stringify('Оплата подписки 2EASY')},
      amount: ${amount},
      currency: 'RUB',
      email: ${JSON.stringify(response.email || profile?.login || '')},
      Email: ${JSON.stringify(response.email || profile?.login || '')},
      receiptEmail: ${JSON.stringify(response.email || profile?.login || '')},
      emailBehavior: 'Required',
      externalId: ${JSON.stringify(String(response.id))},
      userInfo: {
        accountId: ${JSON.stringify(String(response.user_id || profile?.id || ''))},
        email: ${JSON.stringify(response.email || profile?.login || '')},
        phone: ${JSON.stringify(response.paymentModel?.phone || phone)},
        name: ${JSON.stringify(profile?.name || '')}
      },
      metadata: { type: ${JSON.stringify(periodType)} },
      paymentSchema: 'Single',
      type: ${JSON.stringify(periodType)},
      recurrent: {
        period: ${recurrentPeriod},
        interval: 'Month',
        amount: ${Number(tariff.price)}
      }
    }).then(function (r) {
      done(r && r.status === 'success' ? 'success' : 'close');
    }).catch(function () { done('close'); });
  }
  start();
})();
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

  const onNavChange = (nav: WebViewNavigation) => {
    if (!nav.url) {
      return;
    }
    if (isPaymentDoneUrl(nav.url)) {
      void finishSuccess();
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={close}>
        <KeyboardAvoidingView
          style={styles.root}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {widgetHtml || widgetUrl ? (
            <View style={{flex: 1, paddingTop: insets.top}}>
              <Pressable onPress={close} style={styles.webClose}>
                <Text style={styles.cancelText}>{t('common.close')}</Text>
              </Pressable>
              <WebView
              source={widgetUrl ? {uri: widgetUrl} : {html: widgetHtml || ''}}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              setSupportMultipleWindows={false}
              onNavigationStateChange={onNavChange}
              onMessage={async event => {
                if (event.nativeEvent.data === 'success') {
                  await finishSuccess();
                  return;
                }
                close();
              }}
              style={{flex: 1}}
            />
            </View>
          ) : (
            <View
              style={[
                styles.form,
                {
                  paddingBottom: insets.bottom + 24 + keyboardHeight,
                },
              ]}>
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
                label={t('subscription.promocode')}
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
        </KeyboardAvoidingView>
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
  webClose: {alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 8},
});
