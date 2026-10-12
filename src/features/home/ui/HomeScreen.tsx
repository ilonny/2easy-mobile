import {useCallback, useRef, useState} from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useI18n} from '../../../shared/i18n';
import {useLayout} from '../../../shared/lib/layout';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {BrandLogo} from '../../../shared/ui/BrandLogo';
import {PaymentModal} from '../../catalog/ui/PaymentModal';
import {
  deliveryFeatures,
  prepFeatures,
  reviewFeatures,
} from '../model/landingData';
import {HomeHeader} from './HomeHeader';
import type {TariffOption} from './SubscribeSection';
import {LandingContent} from './landing/LandingContent';
import {LandingFaq} from './landing/LandingFaq';
import {LandingFeatureSection} from './landing/LandingFeatureSection';
import {LandingFinalCta} from './landing/LandingFinalCta';
import {LandingHero} from './landing/LandingHero';
import {LandingScrollProvider, useLandingScroll} from './landing/LandingScrollContext';
import {LandingStickerRain} from './landing/LandingStickerRain';
import {LandingTariffs} from './landing/LandingTariffs';
import {landing} from './landing/landingTheme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function HomeScreenBody() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const {t} = useI18n();
  const {isTablet} = useLayout();
  const {setScrollY, viewportHeight} = useLandingScroll();
  const scrollRef = useRef<ScrollView>(null);
  const tariffsY = useRef(0);
  const [paymentTariff, setPaymentTariff] = useState<TariffOption | null>(null);
  const [stickersActive, setStickersActive] = useState(false);
  const stickersActiveRef = useRef(false);
  const scrollYRef = useRef(0);
  const lastNotifyRef = useRef(0);
  const sectionGap = isTablet ? 120 : 88;

  const scrollToTariffs = () => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, tariffsY.current - 24),
      animated: true,
    });
  };

  const maybeActivateStickers = useCallback(
    (y: number) => {
      if (
        stickersActiveRef.current ||
        tariffsY.current <= 0 ||
        tariffsY.current >= y + viewportHeight * 0.7
      ) {
        return;
      }
      stickersActiveRef.current = true;
      setStickersActive(true);
    },
    [viewportHeight],
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      scrollYRef.current = y;
      const now = Date.now();
      // Throttle visibility listeners — keep the scroll gesture itself at 60fps.
      if (now - lastNotifyRef.current > 120) {
        lastNotifyRef.current = now;
        setScrollY(y);
      }
      maybeActivateStickers(y);
    },
    [maybeActivateStickers, setScrollY],
  );

  return (
    <View style={styles.root}>
      <HomeHeader />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        nestedScrollEnabled
        // Android: gap + clipped subviews + ExoPlayer mount often reset offset to 0.
        removeClippedSubviews={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.content,
          {paddingBottom: insets.bottom + 48},
        ]}>
        <View style={{marginBottom: sectionGap}}>
          <LandingHero onChooseTariff={scrollToTariffs} />
        </View>
        <View style={{marginBottom: sectionGap}}>
          <LandingContent />
        </View>
        <View style={{marginBottom: sectionGap}}>
          <LandingFeatureSection
            labelKey="landing.prep.label"
            titleKey="landing.prep.title"
            icon="✎"
            features={prepFeatures}
          />
        </View>
        <View style={{marginBottom: sectionGap}}>
          <LandingFeatureSection
            labelKey="landing.delivery.label"
            titleKey="landing.delivery.title"
            icon="◉"
            features={deliveryFeatures}
            horizontalOnPhone
            tall
          />
        </View>
        <View style={{marginBottom: sectionGap}}>
          <LandingFeatureSection
            labelKey="landing.review.label"
            titleKey="landing.review.title"
            icon="▣"
            features={reviewFeatures}
          />
        </View>
        <View
          style={{marginBottom: sectionGap}}
          onLayout={event => {
            tariffsY.current = event.nativeEvent.layout.y;
            maybeActivateStickers(scrollYRef.current);
          }}>
          <LandingTariffs onSubscribe={tariff => setPaymentTariff(tariff)} />
        </View>
        <View style={{marginBottom: sectionGap}}>
          <LandingFaq />
        </View>
        <LandingFinalCta />

        <View style={styles.footer}>
          <BrandLogo height={28} />
          <Text style={styles.footerCopy}>{t('footer.copyright')}</Text>
          <Text
            style={styles.footerLink}
            onPress={() =>
              navigation.navigate('LegalDocument', {docId: 'privacy_policy'})
            }>
            {t('footer.privacyPolicy')}
          </Text>
          <Text
            style={styles.footerLink}
            onPress={() =>
              navigation.navigate('LegalDocument', {docId: 'public_offer'})
            }>
            {t('footer.publicOffer')}
          </Text>
        </View>
      </ScrollView>
      <LandingStickerRain active={stickersActive} />
      <PaymentModal
        visible={!!paymentTariff}
        tariff={paymentTariff}
        onClose={() => setPaymentTariff(null)}
      />
    </View>
  );
}

export function HomeScreen() {
  return (
    <LandingScrollProvider>
      <HomeScreenBody />
    </LandingScrollProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: landing.white,
  },
  content: {
    paddingTop: 8,
    backgroundColor: landing.white,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  footer: {
    marginTop: 8,
    alignItems: 'center',
    gap: 10,
    paddingTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4E4E7',
    paddingHorizontal: 20,
  },
  footerCopy: {
    color: '#787878',
    fontSize: 13,
  },
  footerLink: {
    color: landing.violet,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
