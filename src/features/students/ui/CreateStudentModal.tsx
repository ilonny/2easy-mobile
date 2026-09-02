import {useEffect, useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';

import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {useKeyboardBottomOffset} from '../../../shared/lib/useKeyboardBottomOffset';
import {isOutlookEmail, isValidEmail} from '../../../shared/lib/validation';
import {AppDialog, Button, TextField} from '../../../shared/ui';
import {
  createStudent,
  updateStudent,
  type Student,
} from '../api/studentsApi';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  student?: Student | null;
};

type NoticeState = {
  message: string;
} | null;

export function CreateStudentModal({
  visible,
  onClose,
  onSuccess,
  student,
}: Props) {
  const {t} = useI18n();
  const isEdit = !!student?.id;
  const keyboardHeight = useKeyboardBottomOffset(visible);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tag, setTag] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setName(student?.name || '');
    setEmail(student?.email || '');
    setTag(student?.tag || '');
    setNameError('');
    setEmailError('');
  }, [visible, student]);

  const reset = () => {
    setName('');
    setEmail('');
    setTag('');
    setNameError('');
    setEmailError('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const onSubmit = async () => {
    let ok = true;
    if (!name.trim()) {
      setNameError(t('students.nameRequired'));
      ok = false;
    } else {
      setNameError('');
    }
    if (!email.trim()) {
      setEmailError(t('auth.emailRequired'));
      ok = false;
    } else if (!isValidEmail(email.trim())) {
      setEmailError(t('auth.invalidEmail'));
      ok = false;
    } else if (isOutlookEmail(email.trim())) {
      setEmailError(t('auth.outlookEmailBlocked'));
      ok = false;
    } else {
      setEmailError('');
    }
    if (!ok) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        tag: tag.trim() || undefined,
      };
      const res = isEdit
        ? await updateStudent({id: student!.id, ...payload})
        : await createStudent(payload);

      if (res.success) {
        reset();
        onSuccess();
        onClose();
        if (!isEdit) {
          setNotice({message: t('students.credentialsSent')});
        }
        return;
      }
      setNotice({message: res.message || 'Error'});
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={close}>
        <Pressable
          style={[styles.backdrop, {paddingBottom: keyboardHeight}]}
          onPress={close}>
          <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
            <Text style={styles.title}>
              {name.trim() || t('students.newStudent')}
            </Text>
            <TextField
              label={t('students.fullName')}
              value={name}
              onChangeText={setName}
              error={nameError}
            />
            <TextField
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              error={emailError}
            />
            {!isEdit ? (
              <Text style={styles.hint}>{t('students.emailHint')}</Text>
            ) : null}
            <TextField
              label={t('students.noteLabel')}
              value={tag}
              onChangeText={setTag}
            />
            <Button
              title={isEdit ? t('common.save') : t('students.addStudent')}
              onPress={onSubmit}
              loading={loading}
            />
            <Pressable onPress={close} style={styles.cancel}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <AppDialog
        visible={!!notice}
        message={notice?.message}
        onClose={() => setNotice(null)}
        actions={[
          {
            label: t('common.back'),
            variant: 'primary',
            onPress: () => setNotice(null),
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.modalBackdrop,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: colors.primary,
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    color: colors.muted,
    marginTop: -8,
    marginBottom: 12,
  },
  cancel: {
    marginTop: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.muted,
    fontWeight: '600',
  },
});
