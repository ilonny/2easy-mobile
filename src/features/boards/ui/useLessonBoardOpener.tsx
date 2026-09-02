import {useCallback, useState} from 'react';
import {ActivityIndicator, Modal, StyleSheet, Text, View} from 'react-native';

import {useI18n} from '../../../shared/i18n';
import {colors} from '../../../shared/config/theme';
import {AppDialog} from '../../../shared/ui';
import {useSubscription} from '../../home/model/useSubscription';
import {fetchLessonBoard, fetchLessonBoardScope} from '../api/boardsApi';
import {BoardWebView} from './BoardWebView';

/**
 * Opens the lesson-scoped board (creates on backend if needed) like site
 * `LessonBoardButton` → `BoardEditorModal`.
 */
export function useLessonBoardOpener({
  lessonId,
  isTeacher,
  studentIdForBoard,
}: {
  lessonId: number;
  isTeacher: boolean;
  studentIdForBoard?: number;
}) {
  const {t} = useI18n();
  const {hasPaidTariff} = useSubscription();
  const [boardId, setBoardId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [notice, setNotice] = useState('');

  const openLessonBoard = useCallback(async () => {
    if (!lessonId) {
      return;
    }
    if (isTeacher && !hasPaidTariff) {
      setNotice(t('boards.subscriptionRequired'));
      return;
    }
    setOpening(true);
    try {
      const scopeRes = await fetchLessonBoardScope(lessonId, studentIdForBoard);
      if (!scopeRes.success || !scopeRes.scope) {
        setNotice(scopeRes.message || t('boards.loadScopeError'));
        return;
      }
      if (
        scopeRes.scope === 'individual' &&
        isTeacher &&
        !studentIdForBoard
      ) {
        setNotice(t('boards.selectStudentForBoard'));
        return;
      }
      const boardRes = await fetchLessonBoard(lessonId, studentIdForBoard);
      const id = Number(boardRes?.board?.id || 0);
      if (!boardRes.success || !id) {
        setNotice(boardRes.message || t('boards.openBoardError'));
        return;
      }
      setBoardId(id);
      setOpen(true);
    } catch {
      setNotice(t('boards.openBoardError'));
    } finally {
      setOpening(false);
    }
  }, [hasPaidTariff, isTeacher, lessonId, studentIdForBoard, t]);

  const modal = (
    <>
      <Modal
        visible={open && !!boardId}
        animationType="slide"
        onRequestClose={() => setOpen(false)}>
        {boardId ? (
          <BoardWebView
            boardId={boardId}
            catalog={false}
            onClose={() => setOpen(false)}
          />
        ) : (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
      </Modal>
      <AppDialog
        visible={!!notice}
        title={t('boards.lessonBoard')}
        message={notice}
        onClose={() => setNotice('')}
        actions={[
          {
            label: t('common.close'),
            variant: 'ghost',
            onPress: () => setNotice(''),
          },
        ]}
      />
      {opening ? (
        <View pointerEvents="none" style={styles.openingOverlay}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.openingText}>{t('boards.loading')}</Text>
        </View>
      ) : null}
    </>
  );

  return {openLessonBoard, opening, modal};
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  openingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 50,
  },
  openingText: {color: colors.textSecondary, fontWeight: '600'},
});
