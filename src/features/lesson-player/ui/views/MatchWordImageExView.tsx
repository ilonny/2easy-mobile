import {useEffect, useMemo, useRef, useState} from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {useLayout} from '../../../../shared/lib/layout';
import {ZoomableImage} from '../../../../shared/ui/ZoomableImage';
import {getImageUrl} from '../../lib/getImageUrl';
import {useLessonPlayer} from '../../model/LessonPlayerContext';
import {useExAnswer} from '../../model/useExAnswer';
import {ExHeader} from '../ExHeader';
import {
  DraggableChip,
  DropZone,
  useDropTargetRegistry,
} from '../interaction/DraggableChip';
import {StickyChipPool} from '../interaction/StickyChipPool';
import {answerFeedback} from '../interaction/answerFeedback';

type Props = {data: any};

type ImgItem = {
  id: string | number;
  dataURL?: string;
  path?: string;
  text?: string;
};

function resolveUri(item: ImgItem): string {
  const raw = item.dataURL || item.path || '';
  if (!raw) {
    return '';
  }
  if (
    /^https?:\/\//i.test(raw) ||
    /^file:\/\//i.test(raw) ||
    raw.startsWith('content://') ||
    raw.startsWith('ph://') ||
    raw.startsWith('data:')
  ) {
    return raw;
  }
  return getImageUrl(raw);
}

export function MatchWordImageExView({data}: Props) {
  const {isTablet, isLandscape} = useLayout();
  const multiCol = isTablet || isLandscape;
  const {lessonId, studentId, activeStudentId, isTeacher} = useLessonPlayer();
  const {writeAnswer, answers} = useExAnswer({
    lessonId,
    exId: Number(data?.id),
    studentId,
    activeStudentId,
    isTeacher,
  });
  const {registerRef, hitTestDropTarget} = useDropTargetRegistry();
  const scopeRef = useRef<View>(null);

  const images: ImgItem[] = (data?.images || []).filter(
    (i: ImgItem) => !!i.text,
  );
  const gallerySources = useMemo(
    () =>
      images
        .map(i => resolveUri(i))
        .filter(Boolean)
        .map(uri => ({uri})),
    [images],
  );
  const viewType = data?.viewType === 'input' ? 'input' : 'drag';
  const [correctIds, setCorrectIds] = useState<Array<string | number>>([]);
  const [incorrectIdsMap, setIncorrectIdsMap] = useState<
    Record<string, string>
  >({});
  const [selectedChipId, setSelectedChipId] = useState<string | number>();
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [flashBad, setFlashBad] = useState<string>();

  const chips = useMemo(
    () => images.filter(i => !correctIds.some(id => String(id) === String(i.id))),
    [images, correctIds],
  );

  useEffect(() => {
    try {
      const raw = answers[String(data?.id)]?.answer;
      if (!raw) {
        return;
      }
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const nextCorrect: Array<string | number> = parsed?.correctIds || [];
      const nextIncorrect: Record<string, string> =
        parsed?.incorrectIdsMap || {};
      setCorrectIds(nextCorrect);
      setIncorrectIdsMap(nextIncorrect);
      const list: ImgItem[] = (data?.images || []).filter(
        (i: ImgItem) => !!i.text,
      );
      const nextInputs: Record<string, string> = {};
      list.forEach(item => {
        const key = String(item.id);
        if (nextCorrect.some(id => String(id) === key)) {
          nextInputs[key] = String(item.text || '');
        } else if (nextIncorrect[key]) {
          nextInputs[key] = nextIncorrect[key];
        }
      });
      setInputs(nextInputs);
    } catch {
      // ignore
    }
  }, [answers, data?.id, data?.images]);

  const persist = (
    nextCorrect: Array<string | number>,
    nextIncorrect: Record<string, string>,
  ) => {
    writeAnswer(
      data.id,
      JSON.stringify({
        correctIds: nextCorrect,
        incorrectIdsMap: nextIncorrect,
      }),
    );
  };

  const markCorrect = (id: string | number) => {
    const next = correctIds.some(x => String(x) === String(id))
      ? correctIds
      : correctIds.concat(id);
    setCorrectIds(next);
    persist(next, incorrectIdsMap);
    setSelectedChipId(undefined);
  };

  const markIncorrect = (id: string | number, word: string) => {
    const nextIncorrect = {...incorrectIdsMap, [String(id)]: word};
    setIncorrectIdsMap(nextIncorrect);
    setFlashBad(String(id));
    setTimeout(() => setFlashBad(undefined), 1200);
    persist(correctIds, nextIncorrect);
    setSelectedChipId(undefined);
  };

  const placeChip = (targetId: string | number, chipId: string | number) => {
    if (correctIds.some(id => String(id) === String(targetId))) {
      return false;
    }
    const chip = images.find(i => String(i.id) === String(chipId));
    const target = images.find(i => String(i.id) === String(targetId));
    if (!chip || !target) {
      return false;
    }
    if (String(chip.id) === String(target.id) || chip.text === target.text) {
      markCorrect(target.id);
      return true;
    }
    markIncorrect(target.id, chip.text || '');
    return false;
  };

  const onBlurInput = (item: ImgItem) => {
    const val = (inputs[String(item.id)] || '').trim();
    if (!val || correctIds.some(id => String(id) === String(item.id))) {
      return;
    }
    if (val.toLowerCase() === String(item.text || '').toLowerCase()) {
      markCorrect(item.id);
    } else {
      markIncorrect(item.id, val);
    }
  };

  return (
    <View ref={scopeRef} style={styles.root} collapsable={false}>
      <ExHeader
        title={data?.title}
        titleColor={data?.titleColor}
        subtitle={data?.subtitle}
        description={data?.description}
      />
      {viewType === 'drag' && !!chips.length && (
        <StickyChipPool scopeRef={scopeRef}>
          {chips.map(chip => (
            <DraggableChip
              key={`chip-${chip.id}`}
              id={String(chip.id)}
              label={String(chip.text || '')}
              selected={selectedChipId === chip.id}
              onSelect={() => setSelectedChipId(chip.id)}
              hitTestDropTarget={hitTestDropTarget}
              onDropOnTarget={(targetId, chipId) => placeChip(targetId, chipId)}
            />
          ))}
        </StickyChipPool>
      )}
      <View style={[styles.grid, multiCol && styles.gridMulti]}>
        {images.map((item, index) => {
          const done = correctIds.some(id => String(id) === String(item.id));
          const wrong = !done ? incorrectIdsMap[String(item.id)] : undefined;
          const uri = resolveUri(item);
          const galleryIndex = gallerySources.findIndex(
            s => s.uri === uri,
          );
          const body = (
            <>
              {!!uri && (
                <ZoomableImage
                  source={{uri}}
                  gallerySources={
                    gallerySources.length > 1 ? gallerySources : undefined
                  }
                  galleryIndex={galleryIndex >= 0 ? galleryIndex : index}
                  style={[styles.img, multiCol && styles.imgCompact]}
                  resizeMode="contain"
                />
              )}
              {viewType === 'input' ? (
                done ? (
                  <Text style={[styles.slot, answerFeedback.okText]}>
                    {item.text}
                  </Text>
                ) : (
                  <TextInput
                    style={[
                      styles.input,
                      !!wrong && answerFeedback.bad,
                      !!wrong && answerFeedback.badText,
                    ]}
                    value={inputs[String(item.id)] ?? wrong ?? ''}
                    onChangeText={v =>
                      setInputs(prev => ({...prev, [String(item.id)]: v}))
                    }
                    onBlur={() => onBlurInput(item)}
                    placeholder="..."
                    placeholderTextColor={colors.muted}
                  />
                )
              ) : (
                <Text
                  style={[
                    styles.slot,
                    done && answerFeedback.okText,
                    !done && !!wrong && answerFeedback.badText,
                  ]}
                  onPress={() => {
                    if (done) {
                      return;
                    }
                    if (selectedChipId != null) {
                      placeChip(item.id, selectedChipId);
                    }
                  }}>
                  {done
                    ? item.text
                    : wrong || (selectedChipId != null ? '⬇' : ' ')}
                </Text>
              )}
            </>
          );

          if (viewType === 'drag') {
            return (
              <DropZone
                key={String(item.id)}
                id={String(item.id)}
                registerRef={registerRef}
                highlight={selectedChipId != null && !done}
                style={[
                  styles.card,
                  multiCol && styles.cardHalf,
                  done && answerFeedback.ok,
                  !done && !!wrong && answerFeedback.bad,
                  flashBad === String(item.id) && answerFeedback.bad,
                ]}>
                {body}
              </DropZone>
            );
          }

          return (
            <View
              key={String(item.id)}
              style={[
                styles.card,
                multiCol && styles.cardHalf,
                done && answerFeedback.ok,
                !done && !!wrong && answerFeedback.bad,
                flashBad === String(item.id) && answerFeedback.bad,
              ]}>
              {body}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {gap: 12, overflow: 'visible', zIndex: 1},
  grid: {gap: 12, zIndex: 0, elevation: 0},
  gridMulti: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
    zIndex: 0,
    elevation: 0,
  },
  cardHalf: {
    width: '48%',
    flexGrow: 1,
  },
  img: {
    width: '100%',
    height: 160,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
  },
  imgCompact: {height: 140},
  slot: {textAlign: 'center', color: colors.textSecondary, minHeight: 22},
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: 10,
    backgroundColor: colors.white,
    color: colors.text,
  },
});
