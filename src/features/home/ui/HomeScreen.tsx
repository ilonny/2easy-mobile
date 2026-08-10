import {useRef, useState} from 'react';
import {
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuth} from '../../../entities/session';
import {useI18n} from '../../../shared/i18n';
import {useLayout} from '../../../shared/lib/layout';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {PaymentModal} from '../../catalog/ui/PaymentModal';
import {discussionCards, speakingGames} from '../model/data';
import {useSubscription} from '../model/useSubscription';
import {GamesCarousel} from './GamesCarousel';
import {HomeHeader} from './HomeHeader';
import {InfoBlock} from './InfoBlock';
import {LessonsCarousel} from './LessonsCarousel';
import {PillCta} from './PillCta';
import {SubscribeSection, type TariffOption} from './SubscribeSection';
type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const {isAuthorized, profile} = useAuth();
  const {hasSubscription, hasPaidTariff, subscription} = useSubscription();
  const {t} = useI18n();
  const {pageGutter, pageContentMaxWidth, isTablet} = useLayout();
  const scrollRef = useRef<ScrollView>(null);
  const tariffsY = useRef(0);
  const [paymentTariff, setPaymentTariff] = useState<TariffOption | null>(null);

  const goRegister = () => navigation.navigate('Registration');
  const goLogin = () => navigation.navigate('Login');
  const scrollToTariffs = () => {
    scrollRef.current?.scrollTo({y: Math.max(0, tariffsY.current - 24), animated: true});
  };

  const showGuestCtas = !isAuthorized;
  const showTariffsCta = isAuthorized && !hasSubscription;
  const showMidStartFree = !profile?.name;

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require('../../../shared/assets/home/main_page_bg.png')}
        style={styles.bg}
        imageStyle={styles.bgImage}
        resizeMode="cover">
        <HomeHeader />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: pageGutter,
              paddingBottom: insets.bottom + 40,
              maxWidth: pageContentMaxWidth,
              width: '100%',
              alignSelf: 'center',
            },
          ]}>
          <Text style={styles.eyebrow}>{t('home.teachersJoined')}</Text>
          <Text style={[styles.h1, isTablet && styles.h1Tablet]}>
            {t('home.mainTitle')}{' '}
            <Text style={styles.highlight}>{t('home.mainTitleHighlight')}</Text>{' '}
            {t('home.mainTitleEnd')}
          </Text>

          {showGuestCtas ? (
            <View style={styles.heroCtas}>
              <View style={styles.ctaWrap}>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{t('home.sevenDaysFree')}</Text>
                </View>
                <PillCta title={t('home.startFree')} onPress={goRegister} />
              </View>
              <PillCta
                title={t('home.loginToAccount')}
                onPress={goLogin}
                variant="secondary"
              />
            </View>
          ) : null}

          {showTariffsCta ? (
            <View style={styles.heroCtas}>
              <PillCta title={t('home.tariffs')} onPress={scrollToTariffs} />
            </View>
          ) : null}

          <Image
            source={require('../../../shared/assets/home/main_image.png')}
            style={styles.heroImage}
            resizeMode="contain"
          />

          <Text style={[styles.h1, isTablet && styles.h1Tablet, styles.sectionTitle]}>
            {t('home.easyTitle')}
          </Text>

          <InfoBlock
            title={t('home.createLessonsTitle')}
            description={t('home.createLessonsDesc')}
            media={require('../../../shared/assets/home/main_image.png')}
          />
          <View style={styles.spacer} />
          <InfoBlock
            title={t('home.lessonPlansTitle')}
            description={t('home.lessonPlansDesc')}
            media={require('../../../shared/assets/home/games/taboo.png')}
            mediaFirst
          />
          <View style={styles.spacer} />
          <InfoBlock
            title={t('home.studentAccountsTitle')}
            description={t('home.studentAccountsDesc')}
            media={require('../../../shared/assets/home/games/discussion-cards.png')}
          />

          {showMidStartFree ? (
            <View style={styles.midCta}>
              <PillCta title={t('home.startFree')} onPress={goRegister} />
            </View>
          ) : (
            <View style={styles.spacer} />
          )}

          <Text style={[styles.h1, styles.sectionTitle]}>
            {t('home.lessonPlansSection')}
          </Text>
          <Text style={styles.sectionDesc}>
            {t('home.lessonPlansSectionDesc')}
          </Text>
          <LessonsCarousel />

          <Text style={[styles.h1, styles.sectionTitle]}>
            {t('home.speakingGamesSection')}
          </Text>
          <Text style={styles.sectionDesc}>
            {t('home.speakingGamesSectionDesc')}
          </Text>
          <GamesCarousel data={speakingGames} />

          <Text style={[styles.h1, styles.sectionTitle]}>
            {t('home.discussionCardsSection')}
          </Text>
          <Text style={styles.sectionDesc}>
            {t('home.discussionCardsSectionDesc')}
          </Text>
          <GamesCarousel data={discussionCards} />

          {showMidStartFree ? (
            <View style={styles.midCta}>
              <PillCta title={t('home.startFree')} onPress={goRegister} />
            </View>
          ) : (
            <View style={styles.spacer} />
          )}

          <View
            onLayout={event => {
              tariffsY.current = event.nativeEvent.layout.y;
            }}>
            <SubscribeSection
              onStartFree={goRegister}
              onSubscribe={tariff => {
                if (!isAuthorized) {
                  goRegister();
                  return;
                }
                setPaymentTariff(tariff);
              }}
              hasPaidTariff={hasPaidTariff}
              subscribeTypeId={subscription?.subscribe_type_id}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerLogo}>2EASY</Text>
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
      </ImageBackground>
      <PaymentModal
        visible={!!paymentTariff}
        tariff={paymentTariff}
        onClose={() => setPaymentTariff(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  bg: {
    flex: 1,
  },
  bgImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 1.2,
    alignSelf: 'flex-start',
  },
  content: {
    paddingTop: 8,
  },
  eyebrow: {
    textAlign: 'center',
    color: '#3F28C6',
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 13,
    marginBottom: 16,
  },
  h1: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    color: '#1A1A1A',
    marginBottom: 20,
  },
  h1Tablet: {
    fontSize: 34,
    lineHeight: 42,
  },
  highlight: {
    color: '#3E1BC9',
  },
  heroCtas: {
    gap: 12,
    marginBottom: 20,
  },
  ctaWrap: {
    position: 'relative',
    paddingTop: 10,
  },
  chip: {
    position: 'absolute',
    top: 0,
    left: 8,
    zIndex: 2,
    backgroundColor: '#17C964',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    transform: [{rotate: '-6deg'}],
  },
  chipText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  heroImage: {
    width: '120%',
    marginLeft: '-10%',
    height: 220,
    marginBottom: 28,
  },
  sectionTitle: {
    marginTop: 28,
    marginBottom: 8,
  },
  sectionDesc: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
    color: '#2D2D2D',
    marginBottom: 18,
  },
  spacer: {
    height: 28,
  },
  midCta: {
    marginVertical: 28,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
    gap: 10,
    paddingTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4E4E7',
  },
  footerLogo: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3F28C6',
  },
  footerCopy: {
    color: '#787878',
    fontSize: 13,
  },
  footerLink: {
    color: '#3F28C6',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
