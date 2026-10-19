import {ReactNode} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {Button} from '../../../shared/ui';

type Mode = 'homework-check' | 'homework-edit' | 'lesson-edit';

type Props = {
  mode: Mode;
  studentName?: string;
  studentEmail?: string;
  isPersonalHomework?: boolean;
  onEditHomework?: () => void;
  actions?: ReactNode;
};

export function LessonModeBanner({
  mode,
  studentName,
  studentEmail,
  isPersonalHomework,
  onEditHomework,
  actions,
}: Props) {
  const {t} = useI18n();
  const isHomework = mode === 'homework-check' || mode === 'homework-edit';

  let title = t('editor.modeEditingLesson');
  if (mode === 'homework-check') {
    title = studentName
      ? `${t('lessons.modeHomeworkCheck')} · ${studentName}`
      : t('lessons.modeHomeworkCheck');
  } else if (mode === 'homework-edit') {
    if (studentName) {
      title = `${t('editor.modeEditingHomework')} · ${studentName}`;
    } else if (isPersonalHomework) {
      title = t('editor.modeEditingHomework');
    } else {
      title = t('editor.modeEditingHomeworkShared');
    }
  }

  let hint: string | undefined;
  if (mode === 'homework-check') {
    hint = t('lessons.homeworkCheckHint');
  } else if (mode === 'homework-edit') {
    hint =
      studentName || isPersonalHomework
        ? t('editor.homeworkPersonalHint')
        : t('editor.homeworkSharedHint');
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.badge}>
        {isHomework
          ? t('lessons.modeBadgeHomework')
          : t('lessons.modeBadgeLesson')}
      </Text>
      <Text style={styles.title}>{title}</Text>
      {!!studentEmail && (
        <Text style={styles.email} numberOfLines={1}>
          {studentEmail}
        </Text>
      )}
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
      {(!!actions || !!onEditHomework) && (
        <View style={styles.actions}>
          {actions}
          {onEditHomework ? (
            <Button title={t('lessons.editHomework')} onPress={onEditHomework} />
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    padding: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(90, 66, 212, 0.18)',
    backgroundColor: '#F6F4FF',
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.primary,
    opacity: 0.85,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  email: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  hint: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  actions: {
    marginTop: 8,
    gap: 8,
  },
});
