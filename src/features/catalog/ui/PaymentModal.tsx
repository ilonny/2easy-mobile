import {useEffect, useMemo, useRef, useState} from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {WebView, type WebViewNavigation} from 'react-native-webview';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuth} from '../../../entities/session';
import {getJson, postJson} from '../../../shared/api';
import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {useKeyboardBottomOffset} from '../../../shared/lib/useKeyboardBottomOffset';
import {useLayout} from '../../../shared/lib/layout';
import {AppDialog, Button, Checkbox, TextField} from '../../../shared/ui';
import type {LegalDocId} from './LegalDocumentScreen';
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

type PromoStatus = 'idle' | 'loading' | 'success' | 'error';

const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

const LEGAL_DOCS: Record<LegalDocId, {titleKey: string; bodyKey: string}> = {
  privacy_policy: {
    titleKey: 'footer.privacyPolicy',
    bodyKey: 'legal.privacyBody',
  },
  public_offer: {
    titleKey: 'footer.publicOffer',
    bodyKey: 'legal.offerBody',
  },
  personal_agreement: {
    titleKey: 'auth.personalDataConsent',
    bodyKey: 'legal.personalBody',
  },
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
  const {authFormMaxWidth, isTablet, pageGutter} = useLayout();
  const {profile} = useAuth();
  const {reload} = useSubscription();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [promocode, setPromocode] = useState('');
  const [privacy, setPrivacy] = useState(false);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [privacyError, setPrivacyError] = useState('');
  const [promoStatus, setPromoStatus] = useState<PromoStatus>('idle');
  const [promoValue, setPromoValue] = useState(0);
  const [promoErrorReason, setPromoErrorReason] = useState<
    'already_used' | 'invalid' | undefined
  >();
  const [loading, setLoading] = useState(false);
  const [widgetHtml, setWidgetHtml] = useState<string | null>(null);
  const [widgetUrl, setWidgetUrl] = useState<string | null>(null);
  const [legalDoc, setLegalDoc] = useState<LegalDocId | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const finishing = useRef(false);
  const showForm = visible && !widgetHtml && !widgetUrl && !legalDoc;
  const keyboardHeight = useKeyboardBottomOffset(showForm);

  const periodType = useMemo(() => tariff?.type ?? 'month', [tariff]);
  const price = tariff?.price ?? 0;
  const discountAmount = promoValue ? price * (promoValue / 100) : 0;
  const total = Math.max(0, price - discountAmount);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setName(profile?.name || '');
    setEmail(profile?.login || profile?.email || '');
    setPhone(profile?.phone || '');
    setPromocode('');
    setPrivacy(false);
    setNameError('');
    setEmailError('');
    setPhoneError('');
    setPrivacyError('');
    setPromoStatus('idle');
    setPromoValue(0);
    setPromoErrorReason(undefined);
    setWidgetHtml(null);
    setWidgetUrl(null);
    setLegalDoc(null);
    finishing.current = false;
  }, [visible, profile?.name, profile?.login, profile?.email, profile?.phone]);

  const close = () => {
    setWidgetHtml(null);
    setWidgetUrl(null);
    setLegalDoc(null);
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

  const validate = () => {
    let ok = true;
    if (!name.trim()) {
      setNameError(t('auth.nameRequired'));
      ok = false;
    } else {
      setNameError('');
    }
    if (!email.trim()) {
      setEmailError(t('auth.invalidEmail'));
      ok = false;
    } else if (!EMAIL_RE.test(email.trim())) {
      setEmailError(t('auth.invalidEmail'));
      ok = false;
    } else {
      setEmailError('');
    }
    if (!phone.trim()) {
      setPhoneError(t('subscription.phoneRequired'));
      ok = false;
    } else {
      setPhoneError('');
    }
    if (!privacy) {
      setPrivacyError(t('auth.requiredField'));
      ok = false;
    } else {
      setPrivacyError('');
    }
    return ok;
  };

  const applyPromo = async () => {
    const code = promocode.trim().toLowerCase();
    if (!code || !tariff) {
      return;
    }
    setPromoStatus('loading');
    setPromoErrorReason(undefined);
    try {
      const json = await postJson<{success?: boolean; value?: number; reason?: string}>(
        {
          path: '/promocode/check',
          isSecure: true,
          data: {promocode: code, type: periodType},
        },
      );
      if (json.success) {
        setPromoStatus('success');
        setPromoValue(Number(json.value || 0));
        return;
      }
      setPromoStatus('error');
      setPromoValue(0);
      setPromoErrorReason(
        json.reason === 'already_used' ? 'already_used' : 'invalid',
      );
    } catch {
      setPromoStatus('error');
      setPromoValue(0);
      setPromoErrorReason('invalid');
    }
  };

  const startCloudPayments = (response: CreatePaymentResponse) => {
    if (!response.publicId || !tariff) {
      setNotice(t('subscription.serverErrorTryLater'));
      return;
    }
    const amount = Number(response.amount ?? total);
    const recurrentAmount = Number(tariff.price);
    const recurrentPeriod =
      periodType === 'month' ? 1 : periodType === '3month' ? 3 : 12;
    const payerEmail = response.email || email.trim();
    const payerPhone = response.paymentModel?.phone || phone.trim();
    const buildReceipt = (receiptAmount: number) => {
      const amt = Math.round(Number(receiptAmount) * 100) / 100;
      return {
        Items: [
          {
            label: 'Подписка 2EASY',
            price: amt,
            quantity: 1,
            amount: amt,
            vat: null,
            method: 4,
            object: 4,
          },
        ],
        email: payerEmail,
        phone: payerPhone,
        isBso: false,
        amounts: {
          electronic: amt,
          advancePayment: 0,
          credit: 0,
          provision: 0,
        },
      };
    };
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
      description: ${JSON.stringify(t('subscription.subscriptionPayment'))},
      amount: ${amount},
      currency: 'RUB',
      email: ${JSON.stringify(payerEmail)},
      Email: ${JSON.stringify(payerEmail)},
      receiptEmail: ${JSON.stringify(payerEmail)},
      emailBehavior: 'Required',
      externalId: ${JSON.stringify(String(response.id))},
      userInfo: {
        accountId: ${JSON.stringify(String(response.user_id || profile?.id || ''))},
        email: ${JSON.stringify(payerEmail)},
        phone: ${JSON.stringify(payerPhone)},
        name: ${JSON.stringify(name.trim() || profile?.name || '')},
        surname: ${JSON.stringify(profile?.surname || '')}
      },
      metadata: { type: ${JSON.stringify(periodType)} },
      paymentSchema: 'Single',
      type: ${JSON.stringify(periodType)},
      receipt: ${JSON.stringify(buildReceipt(amount))},
      recurrent: {
        period: ${recurrentPeriod},
        interval: 'Month',
        amount: ${recurrentAmount},
        receipt: ${JSON.stringify(buildReceipt(recurrentAmount))}
      }
    }).then(function (r) {
      done(r && r.status === 'success' ? 'success' : 'close');
    }).catch(function () { done('close'); });
  }
  start();
})();
</script></body></html>`;
    setWidgetHtml(html);
  };

  const onPay = async (useRfCard: boolean) => {
    if (!tariff || !validate()) {
      return;
    }
    setLoading(true);
    try {
      const response = await postJson<CreatePaymentResponse>({
        path: '/payment/create-payment',
        isSecure: true,
        data: {
          type: periodType,
          phone: phone.trim(),
          promocode: promocode.trim().toLowerCase(),
          email: email.trim(),
        },
      });

      if (!response.success || !response.id) {
        if (response.reason === 'already_used') {
          setPromoStatus('error');
          setPromoValue(0);
          setPromoErrorReason('already_used');
          setNotice(t('subscription.promocodeAlreadyUsed'));
          return;
        }
        setNotice(
          response.message || t('subscription.serverErrorTryLater'),
        );
        return;
      }

      if (!useRfCard) {
        const bill = await getJson<{payment_link?: string}>({
          path: `/payment/createPayTodayBill?paymentId=${response.id}`,
          isSecure: true,
        });
        if (!bill.payment_link) {
          setNotice(t('subscription.serverErrorTryLater'));
          return;
        }
        setWidgetUrl(bill.payment_link);
        return;
      }

      startCloudPayments(response);
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

  const legal = legalDoc ? LEGAL_DOCS[legalDoc] : null;

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={close}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={[
              styles.root,
              {paddingTop: insets.top + (isTablet ? 12 : 8)},
            ]}>
            <View
              style={[
                styles.header,
                {paddingHorizontal: pageGutter},
                isTablet && styles.headerTablet,
              ]}>
              <View style={styles.headerText}>
                <Text style={styles.kicker}>{t('header.subscription')}</Text>
                <Text
                  style={[styles.headerTitle, isTablet && styles.headerTitleTablet]}
                  numberOfLines={2}>
                  {tariff
                    ? `${t(tariff.titleKey)} — ${tariff.price} ₽`
                    : t('subscription.subscribe')}
                </Text>
              </View>
              <Pressable
                onPress={close}
                hitSlop={10}
                style={[styles.closeBtn, isTablet && styles.closeBtnTablet]}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>
          {widgetHtml || widgetUrl ? (
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
                style={styles.flex}
              />
          ) : legal ? (
            <ScrollView
              style={styles.flex}
              contentContainerStyle={[
                styles.form,
                {
                  paddingHorizontal: pageGutter,
                  paddingBottom: insets.bottom + 24,
                },
              ]}>
              <View style={[styles.column, {maxWidth: authFormMaxWidth}]}>
                <View style={styles.card}>
                  <Text style={[styles.title, isTablet && styles.titleTablet]}>
                    {t(legal.titleKey)}
                  </Text>
                  <Text style={[styles.legalBody, isTablet && styles.legalBodyTablet]}>
                    {t(legal.bodyKey)}
                  </Text>
                  <Pressable onPress={() => setLegalDoc(null)} style={styles.cancel}>
                    <Text style={styles.cancelText}>{t('common.back')}</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          ) : (
            <ScrollView
              style={styles.flex}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              contentContainerStyle={[
                styles.form,
                {
                  paddingHorizontal: pageGutter,
                  paddingBottom:
                    insets.bottom + 32 + (Platform.OS === 'android' ? keyboardHeight : 0),
                },
              ]}>
              <View style={[styles.column, {maxWidth: authFormMaxWidth}]}>
                <View style={styles.card}>
                <Text style={[styles.title, isTablet && styles.titleTablet]}>
                  {t('subscription.subscribe')}
                </Text>
                {tariff ? (
                  <Text style={[styles.sub, isTablet && styles.subTablet]}>
                    {t(tariff.titleKey)} — {tariff.price} ₽
                  </Text>
                ) : null}
                <TextField
                  label={t('auth.nameLabel')}
                  value={name}
                  onChangeText={setName}
                  error={nameError}
                  autoComplete="name"
                  textContentType="name"
                />
                <TextField
                  label={t('auth.emailLabel')}
                  value={email}
                  onChangeText={setEmail}
                  error={emailError}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                />
                <TextField
                  label={t('auth.phoneLabel')}
                  value={phone}
                  onChangeText={setPhone}
                  error={phoneError}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                />
                <View style={styles.promoRow}>
                  <View style={styles.promoField}>
                    <TextField
                      label={t('subscription.promocode')}
                      value={promocode}
                      onChangeText={text => {
                        setPromocode(text);
                        setPromoStatus('idle');
                        setPromoValue(0);
                      }}
                      autoCapitalize="characters"
                    />
                  </View>
                  {promocode.trim() ? (
                    <Button
                      title={t('subscription.apply')}
                      variant="secondary"
                      loading={promoStatus === 'loading'}
                      onPress={() => {
                        void applyPromo();
                      }}
                      style={styles.promoBtn}
                    />
                  ) : null}
                </View>
                {promoStatus === 'error' ? (
                  <Text style={styles.promoError}>
                    {promoErrorReason === 'already_used'
                      ? t('subscription.promocodeAlreadyUsed')
                      : t('subscription.promocodeInvalid')}
                  </Text>
                ) : null}
                {promoStatus === 'success' ? (
                  <Text style={styles.promoOk}>
                    {t('subscription.promocodeApplied')}
                  </Text>
                ) : null}

                <Checkbox
                  checked={privacy}
                  onChange={setPrivacy}
                  error={privacyError}
                  label={
                    <Text style={[styles.checkboxText, isTablet && styles.checkboxTextTablet]}>
                      {t('auth.acceptTerms')}
                      <Text
                        style={styles.inlineLink}
                        onPress={() => setLegalDoc('public_offer')}>
                        {t('auth.publicOffer')}
                      </Text>
                      {t('auth.registrationTermsAfterPublicOffer')}
                      <Text
                        style={styles.inlineLink}
                        onPress={() => setLegalDoc('privacy_policy')}>
                        {t('auth.privacyPolicy')}
                      </Text>
                      {t('auth.registrationTermsBeforeConsent')}
                      <Text
                        style={styles.inlineLink}
                        onPress={() => setLegalDoc('personal_agreement')}>
                        {t('auth.personalDataConsent')}
                      </Text>
                    </Text>
                  }
                />
                </View>

                <View style={styles.card}>
                {discountAmount > 0 ? (
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, isTablet && styles.totalLabelTablet]}>
                      {t('subscription.discount')}
                    </Text>
                    <Text style={[styles.discountValue, isTablet && styles.totalValueTablet]}>
                      -{Number(discountAmount.toFixed(1))}₽
                    </Text>
                  </View>
                ) : null}
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, isTablet && styles.totalLabelTablet]}>
                    {t('subscription.total')}
                  </Text>
                  <Text style={[styles.totalValue, isTablet && styles.totalValueTablet]}>
                    {Number(total.toFixed(1))}₽
                  </Text>
                </View>

                <Button
                  title={t('subscription.payWithRfCard')}
                  onPress={() => {
                    void onPay(true);
                  }}
                  loading={loading}
                />
                <View style={styles.orWrap}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>{t('subscription.or')}</Text>
                  <View style={styles.orLine} />
                </View>
                <Button
                  title={t('subscription.payWithNonRfCard')}
                  variant="secondary"
                  onPress={() => {
                    void onPay(false);
                  }}
                  loading={loading}
                />
                <Pressable onPress={close} style={styles.cancel}>
                  <Text style={styles.cancelText}>{t('common.back')}</Text>
                </Pressable>
                </View>
              </View>
            </ScrollView>
          )}
          </View>
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
  flex: {flex: 1},
  root: {flex: 1, backgroundColor: '#F7F5FF'},
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTablet: {paddingBottom: 18},
  headerText: {flex: 1, marginRight: 12, gap: 2},
  kicker: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  headerTitleTablet: {fontSize: 24},
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnTablet: {width: 44, height: 44, borderRadius: 22},
  close: {fontSize: 16, color: colors.muted, fontWeight: '700'},
  form: {paddingVertical: 16},
  column: {width: '100%', alignSelf: 'center'},
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    color: colors.primary,
  },
  titleTablet: {fontSize: 26},
  sub: {textAlign: 'center', color: colors.muted, marginBottom: 12, fontSize: 15},
  subTablet: {fontSize: 17, marginBottom: 16},
  promoRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 8},
  promoField: {flex: 1},
  promoBtn: {marginTop: 22, minWidth: 120},
  promoError: {color: colors.danger, fontSize: 13, marginBottom: 8},
  promoOk: {color: '#16A34A', fontSize: 13, marginBottom: 8},
  checkboxText: {fontSize: 13, lineHeight: 20, color: colors.text},
  checkboxTextTablet: {fontSize: 15, lineHeight: 22},
  inlineLink: {color: colors.primary, fontWeight: '600'},
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  totalLabel: {fontSize: 15, color: colors.text},
  totalLabelTablet: {fontSize: 17},
  totalValue: {fontSize: 16, fontWeight: '800', color: colors.text},
  totalValueTablet: {fontSize: 18},
  discountValue: {fontSize: 16, fontWeight: '800', color: '#16A34A'},
  orWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 12,
  },
  orLine: {flex: 1, height: 2, backgroundColor: '#EFEFEF'},
  orText: {
    color: '#B1B0B0',
    fontWeight: '800',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  cancel: {alignItems: 'center', marginTop: 16, minHeight: 44, justifyContent: 'center'},
  cancelText: {color: colors.muted, fontWeight: '600'},
  legalBody: {fontSize: 15, lineHeight: 22, color: colors.text, paddingBottom: 8},
  legalBodyTablet: {fontSize: 17, lineHeight: 24},
});
