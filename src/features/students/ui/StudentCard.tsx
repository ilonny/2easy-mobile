import {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {ActionMenuModal, UserAvatar} from '../../../shared/ui';
import type {Student} from '../api/studentsApi';
import {StudentPasswordReveal} from './StudentPasswordReveal';

type Props = {
  student: Student;
  onOpenCabinet: (student: Student) => void;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  onArchiveToggle?: (student: Student) => void;
  /** When true, show restore instead of archive. */
  isArchivedList?: boolean;
  /** Hide “open cabinet” (already inside cabinet). */
  hideCabinetAction?: boolean;
  /** Show password reveal (teacher student list). */
  showPassword?: boolean;
};

export function StudentCard({
  student,
  onOpenCabinet,
  onEdit,
  onDelete,
  onArchiveToggle,
  isArchivedList = false,
  hideCabinetAction,
  showPassword = true,
}: Props) {
  const {t} = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  const openMenu = () => setMenuOpen(true);

  const menuItems = [
    ...(!hideCabinetAction
      ? [
          {
            label: t('students.toStudentCabinet'),
            onPress: () => onOpenCabinet(student),
          },
        ]
      : []),
    ...(!isArchivedList
      ? [
          {
            label: t('common.edit'),
            onPress: () => onEdit(student),
          },
        ]
      : []),
    ...(onArchiveToggle
      ? [
          {
            label: isArchivedList
              ? t('students.unarchive')
              : t('students.archive'),
            onPress: () => onArchiveToggle(student),
          },
        ]
      : []),
    {
      label: t('common.delete'),
      onPress: () => onDelete(student),
      destructive: true,
    },
  ];

  return (
    <>
      <Pressable
        onPress={() =>
          hideCabinetAction ? openMenu() : onOpenCabinet(student)
        }
        onLongPress={openMenu}
        style={({pressed}) => [styles.card, pressed && styles.pressed]}>
        <UserAvatar name={student.name} avatar={student.avatar} size={48} />
        <View style={styles.meta}>
          <Text style={styles.name}>{student.name}</Text>
          {!!student.email && <Text style={styles.email}>{student.email}</Text>}
          {!!student.tag && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{student.tag}</Text>
            </View>
          )}
          {showPassword && !hideCabinetAction ? (
            <StudentPasswordReveal studentId={student.id} />
          ) : null}
        </View>
        <Pressable onPress={openMenu} hitSlop={10} style={styles.menuBtn}>
          <Text style={styles.menuText}>⋮</Text>
        </Pressable>
      </Pressable>

      <ActionMenuModal
        visible={menuOpen}
        title={student.name}
        items={menuItems}
        cancelLabel={t('common.cancel')}
        onClose={() => setMenuOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.94,
  },
  meta: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.text,
  },
  email: {
    fontSize: 14,
    color: colors.muted,
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF4E5',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '600',
  },
  menuBtn: {
    width: 32,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    fontSize: 22,
    color: colors.muted,
    fontWeight: '700',
  },
});
