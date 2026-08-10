import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {useLessonPlayer} from '../../model/LessonPlayerContext';
import {useExAnswer} from '../../model/useExAnswer';
import {ExHeader} from '../ExHeader';
import {ImageGallery} from '../ImageGallery';
import {
  DraggableChip,
  DropZone,
  useDropTargetRegistry,
} from '../interaction/DraggableChip';
import {OptionSelect} from '../interaction/OptionSelect';
import {StickyChipPool} from '../interaction/StickyChipPool';

type Props = {data: any};

type GapOption = {id: string; value: string; isCorrect?: boolean};
type Gap = {id: string; options?: GapOption[]; originalText?: string};
type AnswerStatus = 'correct' | 'incorrect' | 'neutral';
type AnswersMap = Record<string, {value?: string; status?: AnswerStatus}>;

function normalize(s: string) {
  return (s || '').trim().toLowerCase();
}

function hasCorrect(gap?: Gap) {
  return !!(gap?.options || []).some(
    o => o.isCorrect && (o.value || '').trim(),
  );
}

export function FillGapsNewExView({data}: Props) {
  const {lessonId, studentId, activeStudentId, isTeacher} = useLessonPlayer();
  const {writeAnswer, answers} = useExAnswer({
    lessonId,
    exId: Number(data?.id),
    studentId,
    activeStudentId,
    isTeacher,
  });

  const mode: 'input' | 'select' | 'drag' = data?.mode || 'input';
  const gaps: Gap[] = data?.gaps || [];
  const content: any[] = Array.isArray(data?.content) ? data.content : [];
  const {registerRef, hitTestDropTarget} = useDropTargetRegistry();

  const gapsById = useMemo(() => {
    const m = new Map<string, Gap>();
    gaps.forEach(g => m.set(g.id, g));
    return m;
  }, [gaps]);

  const [map, setMap] = useState<AnswersMap>({});
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = answers[String(data?.id)]?.answer;
      if (!raw) {
        return;
      }
      const parsedRaw = JSON.parse(raw);
      const parsed: AnswersMap = {};
      Object.keys(parsedRaw || {}).forEach(k => {
        const v = parsedRaw[k];
        if (v && typeof v === 'object') {
          parsed[k] = {value: v.value, status: v.status};
        } else {
          parsed[k] = {value: String(v || ''), status: 'neutral'};
        }
      });
      setMap(parsed);
    } catch {
      // ignore
    }
  }, [answers, data?.id]);

  const persist = useCallback(
    (next: AnswersMap) => {
      writeAnswer(data.id, JSON.stringify(next));
    },
    [data.id, writeAnswer],
  );

  const isCorrectForGap = (gap: Gap | undefined, v: string) => {
    const val = normalize(v);
    if (!gap || !val) {
      return false;
    }
    if (mode === 'input' && !hasCorrect(gap)) {
      return true;
    }
    return !!(gap.options || []).some(
      o => o.isCorrect && normalize(o.value || '') === val,
    );
  };

  const setAnswer = (gapId: string, value: string, status: AnswerStatus) => {
    const next = {...map, [gapId]: {value, status}};
    setMap(next);
    persist(next);
  };

  const placeOnGap = (gapId: string, value: string) => {
    const gap = gapsById.get(gapId);
    const ok = isCorrectForGap(gap, value);
    setAnswer(gapId, value, ok ? 'correct' : 'incorrect');
    setSelectedPoolId(null);
    return ok;
  };

  const pool = useMemo(() => {
    const items: {id: string; value: string}[] = [];
    gaps.forEach(g => {
      (g.options || []).forEach(o => {
        const v = (o.value || '').trim();
        if (!v) {
          return;
        }
        items.push({id: `${g.id}:${o.id}`, value: v});
      });
    });
    const used = new Set(
      Object.values(map)
        .filter(a => a?.status === 'correct' && (a.value || '').trim())
        .map(a => normalize(a.value || '')),
    );
    return items.filter(i => !used.has(normalize(i.value)));
  }, [gaps, map]);

  const renderGap = (gapId: string) => {
    const gap = gapsById.get(gapId);
    const ans = map[gapId];
    const status = ans?.status || 'neutral';
    const value = ans?.value || '';

    if (mode === 'input') {
      return (
        <TextInput
          key={gapId}
          value={value}
          onChangeText={text => setAnswer(gapId, text, 'neutral')}
          onBlur={() => {
            if (!value.trim()) {
              return;
            }
            setAnswer(
              gapId,
              value,
              isCorrectForGap(gap, value) ? 'correct' : 'incorrect',
            );
          }}
          style={[
            styles.gapInput,
            status === 'correct' && styles.ok,
            status === 'incorrect' && styles.bad,
          ]}
          placeholder="…"
          placeholderTextColor={colors.muted}
        />
      );
    }

    if (mode === 'select') {
      const options = (gap?.options || []).map(o => ({
        id: o.id,
        label: o.value,
        isCorrect: !!o.isCorrect,
      }));
      return (
        <OptionSelect
          key={gapId}
          value={value}
          options={options}
          highlightCorrect={isTeacher}
          status={
            status === 'correct' ? 'ok' : status === 'incorrect' ? 'bad' : 'neutral'
          }
          onChange={opt => {
            const ok = isCorrectForGap(gap, opt.label);
            setAnswer(gapId, opt.label, ok ? 'correct' : 'incorrect');
          }}
        />
      );
    }

    // drag mode drop zone
    return (
      <DropZone
        key={gapId}
        id={gapId}
        registerRef={registerRef}
        highlight={!!selectedPoolId}
        style={[
          styles.gapSelect,
          status === 'correct' && styles.ok,
          status === 'incorrect' && styles.bad,
        ]}>
        <Text
          onPress={() => {
            if (selectedPoolId) {
              const item = pool.find(p => p.id === selectedPoolId);
              if (item) {
                placeOnGap(gapId, item.value);
              }
            }
          }}
          style={styles.gapText}>
          {value || (selectedPoolId ? '⬇' : '····')}
        </Text>
      </DropZone>
    );
  };

  const renderNode = (node: any, idx: number) => {
    if (!node) {
      return null;
    }
    if (typeof node.text === 'string' && !node.type) {
      const style: any = {};
      if (node.bold) {
        style.fontWeight = '700';
      }
      if (node.italic) {
        style.fontStyle = 'italic';
      }
      if (node.underline) {
        style.textDecorationLine = 'underline';
      }
      if (node.color) {
        style.color = node.color;
      }
      return (
        <Text key={`t-${idx}`} style={[styles.text, style]}>
          {node.text}
        </Text>
      );
    }
    if (node.type === 'gap' && node.gapId) {
      return renderGap(node.gapId);
    }
    return null;
  };

  const bgImages = data?.images?.length ? data.images : [];

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
      {mode === 'drag' && !!pool.length && (
        <StickyChipPool>
          {pool.map(item => (
            <DraggableChip
              key={item.id}
              id={item.id}
              label={item.value}
              selected={selectedPoolId === item.id}
              onSelect={() => setSelectedPoolId(item.id)}
              hitTestDropTarget={hitTestDropTarget}
              onDropOnTarget={(targetId, _chipId, label) =>
                placeOnGap(targetId, label)
              }
            />
          ))}
        </StickyChipPool>
      )}
      <View style={styles.card}>
        {content.map((para, pIdx) => (
          <View key={`p-${pIdx}`} style={styles.para}>
            {(para?.children || []).map((child: any, cIdx: number) =>
              renderNode(child, cIdx),
            )}
          </View>
        ))}
        {!content.length &&
          gaps.map(g => <View key={g.id}>{renderGap(g.id)}</View>)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {gap: 12, overflow: 'visible', zIndex: 1},
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 14,
    gap: 12,
    overflow: 'visible',
    zIndex: 1,
  },
  para: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    overflow: 'visible',
    zIndex: 1,
  },
  text: {fontSize: 16, color: colors.text, lineHeight: 24},
  gapInput: {
    minWidth: 72,
    borderRadius: radii.sm,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: colors.text,
    fontSize: 16,
  },
  gapSelect: {
    minWidth: 72,
    borderRadius: radii.sm,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  gapText: {color: colors.text, fontWeight: '600'},
  ok: {backgroundColor: '#EBFFEE'},
  bad: {backgroundColor: '#FFE5E5'},
});
