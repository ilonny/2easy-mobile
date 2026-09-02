import {Modal, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import type {LessonParticipant} from '../../students/api/studentsApi';

type Props = {
  visible: boolean;
  participants: LessonParticipant[];
  activeStudentId?: number;
  onSelect: (studentId: number) => void;
  onOpenDictionary?: (studentId: number) => void;
  onClose: () => void;
};

function participantName(s: LessonParticipant) {
  return s['student.name'] || s.name || `#${s.student_id}`;
}

function participantEmail(s: LessonParticipant) {
  return s['student.email'] || s.email || '';
}

export function LessonParticipantsSheet({
  visible,
  participants,
  activeStudentId,
  onSelect,
  onOpenDictionary,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useI18n();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, {paddingBottom: insets.bottom + 16}]}
          onPress={e => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t('lessons.participants')}</Text>
          <View style={styles.hintBox}>
            <Text style={styles.hint}>{t('lessons.participantsSwitchHint')}</Text>
            <Text style={styles.hintAccent}>
              {t('lessons.participantsActiveHint')}
            </Text>
          </View>
          {participants.length === 0 ? (
            <Text style={styles.empty}>{t('students.noStudents')}</Text>
          ) : (
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}>
              {participants.map(s => {
                const id = Number(s.student_id);
                const active = id === activeStudentId;
                return (
                  <View
                    key={String(id)}
                    style={[styles.row, active && styles.rowActive]}>
                    <Pressable
                      style={styles.rowMain}
                      onPress={() => {
                        onSelect(id);
                        onClose();
                      }}>
                      <Text
                        style={[styles.name, active && styles.nameActive]}
                        numberOfLines={1}>
                        {participantName(s)}
                      </Text>
                      {!!participantEmail(s) && (
                        <Text style={styles.email} numberOfLines={1}>
                          {participantEmail(s)}
                        </Text>
                      )}
                    </Pressable>
                    {onOpenDictionary ? (
                      <Pressable
                        onPress={() => {
                          onOpenDictionary(id);
                          onClose();
                        }}
                        style={styles.dictBtn}
                        hitSlop={8}>
                        <Text style={styles.dictText}>
                          {t('dictionary.tab')}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          )}
          <Pressable onPress={onClose} style={styles.cancel}>
            <Text style={styles.cancelText}>{t('common.close')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.modalBackdrop,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
    maxHeight: '78%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
  },
  hintBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    padding: 12,
    gap: 6,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
  hintAccent: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.primary,
    fontWeight: '600',
  },
  list: {maxHeight: 320},
  listContent: {gap: 10, paddingBottom: 4},
  empty: {textAlign: 'center', color: colors.muted, paddingVertical: 20},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 12,
    backgroundColor: colors.white,
  },
  rowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  rowMain: {flex: 1, gap: 2},
  name: {fontWeight: '700', fontSize: 15, color: colors.text},
  nameActive: {color: colors.primary},
  email: {fontSize: 12, color: colors.muted},
  dictBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dictText: {fontSize: 12, fontWeight: '700', color: colors.primary},
  cancel: {
    marginTop: 4,
    minHeight: 48,
    borderRadius: radii.sm,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {fontWeight: '700', color: colors.text},
});
