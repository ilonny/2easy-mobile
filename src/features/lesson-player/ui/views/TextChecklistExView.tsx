import {Pressable, StyleSheet, Text, View} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {SmartImage} from '../../../../shared/ui';
import {resolveMediaUri} from '../../../../shared/lib/mediaUri';
import {useLessonPlayer} from '../../model/LessonPlayerContext';
import {useExAnswer} from '../../model/useExAnswer';
import {ExHeader} from '../ExHeader';
import {HtmlContent, looksLikeHtml} from '../HtmlContent';
import {ImageGallery} from '../ImageGallery';

type Props = {data: any};

function parseChecked(raw?: string): boolean {
  if (!raw) return false;
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  try {
    return !!JSON.parse(raw);
  } catch {
    return false;
  }
}

export function TextChecklistExView({data}: Props) {
  const {lessonId, studentId, activeStudentId, isTeacher} = useLessonPlayer();
  const {writeAnswer, answers} = useExAnswer({
    lessonId,
    exId: Number(data?.id),
    studentId,
    activeStudentId,
    isTeacher,
  });

  const bgImages = data?.images?.length ? [data.images[0]] : [];
  const editorImage = data?.editorImages?.[0];
  const stickers: string[] = (data?.stickers || []).filter(Boolean);

  return (
    <View style={styles.root}>
      <ExHeader
        title={data?.title}
        titleColor={data?.titleColor}
        subtitle={data?.subtitle}
        description={data?.description}
      />
      {!!bgImages.length && (
        <ImageGallery images={bgImages} viewType="carousel" />
      )}
      <View style={styles.row}>
        <View style={styles.card}>
          {stickers.map((sticker, index) => {
            const checked = parseChecked(answers[sticker]?.answer);
            return (
              <Pressable
                key={`${index}-${sticker}`}
                style={styles.item}
                onPress={() =>
                  writeAnswer(sticker, checked ? '0' : '1')
                }>
                <View style={[styles.box, checked && styles.boxOn]}>
                  {checked ? <Text style={styles.check}>✓</Text> : null}
                </View>
                {looksLikeHtml(sticker) ? (
                  <View style={styles.labelHtml}>
                    <HtmlContent html={sticker} />
                  </View>
                ) : (
                  <Text style={styles.label}>{sticker}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
        {!!editorImage?.dataURL && (
          <SmartImage
            source={{uri: resolveMediaUri(editorImage.dataURL)}}
            style={styles.sideImg}
            resizeMode="contain"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {gap: 12},
  row: {gap: 12},
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 14,
    gap: 12,
  },
  item: {flexDirection: 'row', alignItems: 'flex-start', gap: 10},
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  boxOn: {backgroundColor: colors.primary},
  check: {color: '#fff', fontWeight: '800', fontSize: 14},
  label: {flex: 1, fontSize: 16, color: colors.text, lineHeight: 22},
  labelHtml: {flex: 1},
  sideImg: {
    width: '100%',
    height: 200,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
});
