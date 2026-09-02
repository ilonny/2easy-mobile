import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
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
import {answerFeedback} from '../interaction/answerFeedback';

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

function gapAnswerKey(gapId: string, occurrence: number) {
  return occurrence > 0 ? `${gapId}#${occurrence}` : String(gapId);
}

function parseGapAnswerKey(key: string): {gapId: string} {
  const i = String(key).lastIndexOf('#');
  if (i > 0 && /^\d+$/.test(String(key).slice(i + 1))) {
    return {gapId: String(key).slice(0, i)};
  }
  return {gapId: String(key)};
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
  const scopeRef = useRef<View>(null);

  const gapsById = useMemo(() => {
    const m = new Map<string, Gap>();
    gaps.forEach(g => m.set(g.id, g));
    return m;
  }, [gaps]);

  const [map, setMap] = useState<AnswersMap>({});
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const raw = answers[String(data?.id)]?.answer;
      if (!raw) {
        setMap({});
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

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
    };
  }, []);

  const persist = useCallback(
    (next: AnswersMap) => {
      // Site: only students persist FillGapsNew answers (teacher watches via poll).
      if (isTeacher) {
        return;
      }
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
      persistTimerRef.current = setTimeout(() => {
        void writeAnswer(data.id, JSON.stringify(next));
      }, 400);
    },
    [data.id, writeAnswer, isTeacher],
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

  const setAnswer = (answerKey: string, value: string, status: AnswerStatus) => {
    const next = {...map, [answerKey]: {value, status}};
    setMap(next);
    persist(next);
  };

  const placeOnGap = (targetKey: string, value: string) => {
    const {gapId} = parseGapAnswerKey(targetKey);
    const gap = gapsById.get(gapId);
    const ok = isCorrectForGap(gap, value);
    setAnswer(targetKey, value, ok ? 'correct' : 'incorrect');
    setSelectedPoolId(null);
    // Only consume (hide) the chip when the answer is correct.
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

  const renderGap = (gapId: string, occurrence = 0) => {
    const gap = gapsById.get(gapId);
    const answerKey = gapAnswerKey(gapId, occurrence);
    const ans = map[answerKey];
    const status = ans?.status || 'neutral';
    const value = ans?.value || '';

    if (mode === 'input') {
      return (
        <TextInput
          key={answerKey}
          value={value}
          autoComplete="off"
          onChangeText={text => setAnswer(answerKey, text, 'neutral')}
          onBlur={() => {
            if (!value.trim()) {
              return;
            }
            setAnswer(
              answerKey,
              value,
              isCorrectForGap(gap, value) ? 'correct' : 'incorrect',
            );
          }}
          style={[
            styles.gapInput,
            answerFeedback.slot,
            status === 'correct' && answerFeedback.ok,
            status === 'incorrect' && answerFeedback.bad,
            status === 'correct' && answerFeedback.okText,
            status === 'incorrect' && answerFeedback.badText,
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
          key={answerKey}
          value={value}
          options={options}
          highlightCorrect={isTeacher}
          status={
            status === 'correct' ? 'ok' : status === 'incorrect' ? 'bad' : 'neutral'
          }
          onChange={opt => {
            const ok = isCorrectForGap(gap, opt.label);
            setAnswer(answerKey, opt.label, ok ? 'correct' : 'incorrect');
          }}
        />
      );
    }

    // drag mode drop zone — filled slots are green; wrong attempts stay red
    return (
      <DropZone
        key={answerKey}
        id={answerKey}
        registerRef={registerRef}
        highlight={!!selectedPoolId && status !== 'correct'}
        style={[
          styles.gapSelect,
          answerFeedback.slot,
          status === 'incorrect' && answerFeedback.bad,
          status === 'correct' && answerFeedback.ok,
          status === 'neutral' && !!value && answerFeedback.ok,
        ]}>
        <Text
          onPress={() => {
            if (status === 'correct') {
              return;
            }
            if (selectedPoolId) {
              const item = pool.find(p => p.id === selectedPoolId);
              if (item) {
                placeOnGap(answerKey, item.value);
              }
            }
          }}
          style={[
            styles.gapText,
            status === 'incorrect' && answerFeedback.badText,
            (status === 'correct' || (!!value && status !== 'incorrect')) &&
              answerFeedback.okText,
          ]}>
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
    <View ref={scopeRef} style={styles.root} collapsable={false}>
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
        <StickyChipPool scopeRef={scopeRef}>
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
        {(() => {
          const occ: Record<string, number> = {};
          return content.map((para, pIdx) => (
            <View key={`p-${pIdx}`} style={styles.para}>
              {(para?.children || []).map((child: any, cIdx: number) => {
                if (child?.type === 'gap' && child.gapId) {
                  const id = String(child.gapId);
                  const n = occ[id] || 0;
                  occ[id] = n + 1;
                  return renderGap(id, n);
                }
                return renderNode(child, cIdx);
              })}
            </View>
          ));
        })()}
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
    minWidth: 120,
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gapText: {color: colors.primary, fontWeight: '700'},
});
