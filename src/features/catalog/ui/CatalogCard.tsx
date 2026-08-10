import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

import {useI18n} from '../../../shared/i18n';

type Props = {
  title: string;
  description: string;
  image: ImageSourcePropType;
  onPress: () => void;
};

export function CatalogCard({title, description, image, onPress}: Props) {
  const {t} = useI18n();

  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [styles.card, pressed && styles.pressed]}>
      <Image source={image} style={styles.image} resizeMode="cover" />
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <Text style={styles.open}>{t('games.open')}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  pressed: {
    opacity: 0.94,
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: '#eeebff',
  },
  body: {
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5837dc',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#2D2D2D',
  },
  open: {
    marginTop: 4,
    alignSelf: 'flex-end',
    color: '#5837dc',
    fontWeight: '600',
    fontSize: 15,
  },
});
