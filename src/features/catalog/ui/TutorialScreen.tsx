import {Pressable, StyleSheet, Text, View, Image} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useI18n} from '../../../shared/i18n';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {tutorialCatalog} from '../model/tutorialData';
import {CatalogPageLayout} from './CatalogPageLayout';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TutorialScreen() {
  const {t} = useI18n();
  const navigation = useNavigation<Nav>();

  return (
    <CatalogPageLayout
      title={`${t('tutorial.titleLine1')}\n${t('tutorial.titleLine2')}`}
      subtitle={t('tutorial.subtitle')}
      sectionLabel={t('header.tutorial')}>
      {tutorialCatalog.map(item => (
        <Pressable
          key={item.id}
          onPress={() =>
            navigation.navigate('LessonViewer', {
              lessonId: item.lessonId,
              from: 'Tutorial',
            })
          }
          style={({pressed}) => [styles.card, pressed && styles.pressed]}>
          <View style={styles.imageWrap}>
            <Image source={item.image} style={styles.image} resizeMode="contain" />
          </View>
          <View style={styles.body}>
            <Text style={styles.cardTitle}>{t(item.titleKey)}</Text>
            <Text style={styles.cardDesc}>{t(item.descKey)}</Text>
            <Text style={styles.open}>{t('games.open')}</Text>
          </View>
        </Pressable>
      ))}
    </CatalogPageLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  pressed: {
    opacity: 0.94,
  },
  imageWrap: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F9F9',
    padding: 16,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  body: {
    padding: 20,
    gap: 8,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'uppercase',
    textAlign: 'center',
    color: '#1A1A1A',
  },
  cardDesc: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#2D2D2D',
  },
  open: {
    marginTop: 4,
    color: '#5837dc',
    fontWeight: '600',
    fontSize: 14,
  },
});
