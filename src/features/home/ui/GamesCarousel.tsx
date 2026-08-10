import {useEffect, useState} from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

import {useI18n} from '../../../shared/i18n';
import type {HomeGameCard} from '../model/data';

type Props = {
  data: HomeGameCard[];
};

export function GamesCarousel({data}: Props) {
  const {t} = useI18n();
  const [handVisible, setHandVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setHandVisible(v => !v), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={292}
        contentContainerStyle={styles.row}>
        {data.map(item => (
          <View key={item.id} style={styles.card}>
            <Image source={item.image} style={styles.image} resizeMode="cover" />
            <View style={styles.body}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.sub}>{item.subTitle}</Text>
              <Text style={styles.open}>{t('home.open')}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <Image
        source={require('../../../shared/assets/home/hand.png') as ImageSourcePropType}
        style={[styles.hand, {opacity: handVisible ? 1 : 0}]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  row: {
    gap: 12,
    paddingHorizontal: 2,
    paddingBottom: 8,
  },
  card: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: '#eeebff',
  },
  body: {
    padding: 14,
    gap: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  sub: {
    fontSize: 13,
    color: '#787878',
  },
  open: {
    marginTop: 4,
    color: '#5837dc',
    fontWeight: '600',
    fontSize: 14,
  },
  hand: {
    position: 'absolute',
    right: 4,
    bottom: 0,
    width: 40,
    height: 40,
  },
});
