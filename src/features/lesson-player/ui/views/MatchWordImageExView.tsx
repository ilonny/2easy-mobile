import {useEffect, useMemo, useState} from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {useLessonPlayer} from '../../model/LessonPlayerContext';
import {useExAnswer} from '../../model/useExAnswer';
import {ExHeader} from '../ExHeader';
import {
  DraggableChip,
  DropZone,
  useDropTargetRegistry,
} from '../interaction/DraggableChip';
import {StickyChipPool} from '../interaction/StickyChipPool';

type Props = {data: any};

type ImgItem = {
  id: string | number;
  dataURL?: string;
  path?: string;
  text?: string;
};

export function MatchWordImageExView({data}: Props) {
  const {lessonId, studentId, activeStudentId, isTeacher} = useLessonPlayer();
  const {writeAnswer, answers} = useExAnswer({
    lessonId,
    exId: Number(data?.id),
    studentId,
    activeStudentId,
    isTeacher,
  });
  const {registerRef, hitTestDropTarget} = useDropTargetRegistry();

  const images: ImgItem[] = (data?.images || []).filter(
    (i: ImgItem) => !!i.text,
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
    () => images.filter(i => !correctIds.includes(i.id)),
    [images, correctIds],
  );

  useEffect(() => {
    try {
      const raw = answers[String(data?.id)]?.answer;
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      setCorrectIds(parsed?.correctIds || []);
      setIncorrectIdsMap(parsed?.incorrectIdsMap || {});
    } catch {
      // ignore
    }
  }, [answers, data?.id]);

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
    const next = correctIds.includes(id) ? correctIds : correctIds.concat(id);
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
    if (correctIds.includes(targetId)) {
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
    if (!val || correctIds.includes(item.id)) {
      return;
    }
    if (val.toLowerCase() === String(item.text || '').toLowerCase()) {
      markCorrect(item.id);
    } else {
      markIncorrect(item.id, val);
    }
  };

  return (
    <View style={styles.root}>
      <ExHeader
        title={data?.title}
        titleColor={data?.titleColor}
        subtitle={data?.subtitle}
        description={data?.description}
      />
      {viewType === 'drag' && !!chips.length && (
        <StickyChipPool>
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
      <View style={styles.grid}>
        {images.map(item => {
          const done = correctIds.includes(item.id);
          const uri = item.dataURL || item.path;
          const body = (
            <>
              {!!uri && (
                <Image source={{uri}} style={styles.img} resizeMode="contain" />
              )}
              {viewType === 'input' ? (
                done ? (
                  <Text style={styles.okText}>{item.text}</Text>
                ) : (
                  <TextInput
                    style={styles.input}
                    value={inputs[String(item.id)] ?? ''}
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
                  style={styles.slot}
                  onPress={() => {
                    if (selectedChipId != null) {
                      placeChip(item.id, selectedChipId);
                    }
                  }}>
                  {done ? item.text : selectedChipId != null ? '⬇' : ' '}
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
                  done && styles.cardOk,
                  flashBad === String(item.id) && styles.cardBad,
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
                done && styles.cardOk,
                flashBad === String(item.id) && styles.cardBad,
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
  root: {gap: 12, overflow: 'visible'},
  grid: {gap: 12},
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
  },
  cardOk: {borderColor: '#22C55E', backgroundColor: '#EBFFEE'},
  cardBad: {borderColor: colors.danger, backgroundColor: '#FFE5E5'},
  img: {width: '100%', height: 160, borderRadius: radii.sm},
  slot: {textAlign: 'center', color: colors.textSecondary, minHeight: 22},
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: 10,
    backgroundColor: colors.white,
    color: colors.text,
  },
  okText: {
    textAlign: 'center',
    fontWeight: '700',
    color: '#166534',
  },
});
