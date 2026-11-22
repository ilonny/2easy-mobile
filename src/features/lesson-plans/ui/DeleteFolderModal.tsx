import {useEffect, useState} from 'react';

import {useI18n} from '../../../shared/i18n';
import {AppDialog} from '../../../shared/ui';
import {checkFolderContents, deleteFolder} from '../api/catalogApi';
import type {CatalogFolder} from '../model/catalogTypes';

type Step = 'loading' | 'emptyConfirm' | 'notEmpty' | 'forceConfirm';

type Props = {
  visible: boolean;
  folder: CatalogFolder | null;
  onClose: () => void;
  onDeleted: () => void;
};

export function DeleteFolderModal({
  visible,
  folder,
  onClose,
  onDeleted,
}: Props) {
  const {t} = useI18n();
  const [step, setStep] = useState<Step>('loading');
  const [counts, setCounts] = useState<{lessons: number; courses: number}>({
    lessons: 0,
    courses: 0,
  });
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible || !folder?.id) {
      setStep('loading');
      setError('');
      return;
    }
    let cancelled = false;
    setStep('loading');
    setError('');
    void (async () => {
      try {
        const data = await checkFolderContents(folder.id);
        if (cancelled) {
          return;
        }
        const lessons = Number(data?.counts?.lessons) || 0;
        const courses = Number(data?.counts?.courses) || 0;
        setCounts({lessons, courses});
        if (data?.empty || (lessons === 0 && courses === 0)) {
          setStep('emptyConfirm');
        } else {
          setStep('notEmpty');
        }
      } catch {
        if (!cancelled) {
          setStep('emptyConfirm');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, folder?.id]);

  const tryDelete = async (force: boolean) => {
    if (!folder?.id) {
      return;
    }
    setDeleting(true);
    setError('');
    try {
      const data = await deleteFolder(folder.id, force);
      if (data && !data.success && data.counts) {
        setCounts({
          lessons: Number(data.counts.lessons) || 0,
          courses: Number(data.counts.courses) || 0,
        });
        setStep('notEmpty');
        return;
      }
      if (data?.success === false) {
        setError(data.message || t('lessons.folderDeleteFailed'));
        return;
      }
      onDeleted();
    } catch {
      setError(t('lessons.folderDeleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  const title = t('lessons.deleteFolderTitle').replace(
    '{{title}}',
    folder?.title ? ` «${folder.title}»` : '',
  );

  let message = '';
  if (step === 'loading') {
    message = '…';
  } else if (step === 'forceConfirm') {
    message = t('lessons.deleteFolderForceConfirm');
  } else if (step === 'notEmpty') {
    message = t('lessons.deleteFolderNotEmpty')
      .replace('{{lessons}}', String(counts.lessons))
      .replace('{{courses}}', String(counts.courses));
  } else {
    message = t('lessons.deleteFolderEmptyConfirm');
  }

  const actions =
    step === 'loading'
      ? [
          {
            label: t('common.cancel'),
            variant: 'ghost' as const,
            onPress: onClose,
          },
        ]
      : step === 'forceConfirm'
        ? [
            {
              label: t('lessons.deleteFolderForceContinue'),
              variant: 'danger' as const,
              loading: deleting,
              onPress: () => void tryDelete(true),
            },
            {
              label: t('common.cancel'),
              variant: 'ghost' as const,
              onPress: () => setStep('notEmpty'),
            },
          ]
        : step === 'notEmpty'
          ? [
              {
                label: t('common.cancel'),
                variant: 'primary' as const,
                onPress: onClose,
              },
              {
                label: t('lessons.deleteFolderContinue'),
                variant: 'danger' as const,
                onPress: () => setStep('forceConfirm'),
              },
            ]
          : [
              {
                label: t('common.cancel'),
                variant: 'ghost' as const,
                onPress: onClose,
              },
              {
                label: t('common.delete'),
                variant: 'danger' as const,
                loading: deleting,
                onPress: () => void tryDelete(false),
              },
            ];

  return (
    <AppDialog
      visible={visible}
      title={title}
      message={error || message}
      onClose={onClose}
      closeOnBackdrop={!deleting}
      actions={actions}
    />
  );
}
