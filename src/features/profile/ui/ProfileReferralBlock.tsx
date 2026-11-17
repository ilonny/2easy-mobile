import {useCallback, useEffect, useState} from 'react';
import {
  Clipboard,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {getJson} from '../../../shared/api/client';
import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';

type ReferralPayload = {
  code?: string;
  paidCount?: number;
};

export function ProfileReferralBlock() {
  const {t} = useI18n();
  const [data, setData] = useState<ReferralPayload | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getJson<ReferralPayload>({
          path: '/referral',
          isSecure: true,
        });
        if (cancelled) {
          return;
        }
        if (res.success === false || !res.code) {
          return;
        }
        setData({
          code: res.code,
          paidCount: Number(res.paidCount || 0),
        });
      } catch {
        // Hide block on error — do not break profile.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onCopy = useCallback(async () => {
    if (!data?.code) {
      return;
    }
    try {
      if (typeof Clipboard?.setString === 'function') {
        Clipboard.setString(data.code);
      } else {
        await Share.share({message: data.code});
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [data?.code]);

  if (!data?.code) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('referral.title')}</Text>
      <Text style={styles.step}>1. {t('referral.step1')}</Text>
      <Text style={styles.step}>2. {t('referral.step2')}</Text>
      <Text style={styles.step}>3. {t('referral.step3')}</Text>
      <Text style={styles.code}>{data.code}</Text>
      <Pressable style={styles.copyBtn} onPress={() => void onCopy()}>
        <Text style={styles.copyBtnText}>
          {copied ? t('referral.copied') : t('referral.copy')}
        </Text>
      </Pressable>
      <Text style={styles.paid}>
        {t('referral.paidCount')}: {Number(data.paidCount || 0)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  step: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  code: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.text,
  },
  copyBtn: {
    marginTop: 4,
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  paid: {
    marginTop: 4,
    fontSize: 14,
    color: colors.text,
  },
});
