import {Image, StyleSheet, Text, View, type ImageSourcePropType} from 'react-native';

type Props = {
  title: string;
  description: string;
  media: ImageSourcePropType | {uri: string};
  mediaFirst?: boolean;
};

export function InfoBlock({title, description, media, mediaFirst}: Props) {
  const text = (
    <View style={styles.textCol}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );

  const mediaNode = (
    <View style={styles.mediaWrap}>
      <Image source={media} style={styles.media} resizeMode="contain" />
    </View>
  );

  return (
    <View style={styles.root}>
      {mediaFirst ? (
        <>
          {mediaNode}
          {text}
        </>
      ) : (
        <>
          {text}
          {mediaNode}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 16,
  },
  textCol: {
    gap: 10,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 28,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#ACACAC',
    textAlign: 'center',
  },
  mediaWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  media: {
    width: '100%',
    height: 240,
  },
});
