import {useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  types,
} from '@react-native-documents/picker';

import {useI18n} from '../../../../shared/i18n';
import {colors, radii} from '../../../../shared/config/theme';
import {Button, TextField, TitleColorField} from '../../../../shared/ui';
import {uploadPhotos} from '../../../lesson-player/api/lessonApi';
import {
  ImagePickerField,
  type PickedImage,
} from '../ImagePickerField';
import {EditorShell, editorStyles} from './EditorShell';
import {RichHtmlEditor} from './RichHtmlEditor';
import {
  TITLE_COLOR,
  attachmentsToPicked,
  readTitleColor,
  persistExercise,
  pickedToPreviewMedia,
  resolvePickedAttachments,
  type EditorCommonProps,
} from './editorShared';

type AudioAttachment = {
  id?: number | string;
  path?: string;
  name?: string;
  localUri?: string;
  mime?: string;
};

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT = new Set(['mp3', 'wav', 'm4a', 'mpeg']);

function nameFromPath(path?: string) {
  if (!path) {
    return '';
  }
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

function isAllowedAudio(fileName?: string | null, mime?: string | null) {
  const lowerName = String(fileName || '').toLowerCase();
  const ext = lowerName.includes('.')
    ? lowerName.split('.').pop() || ''
    : '';
  if (ext && ALLOWED_EXT.has(ext)) {
    return true;
  }
  const lowerMime = String(mime || '').toLowerCase();
  return (
    lowerMime === 'audio/mpeg' ||
    lowerMime === 'audio/mp3' ||
    lowerMime === 'audio/wav' ||
    lowerMime === 'audio/x-wav' ||
    lowerMime === 'audio/mp4' ||
    lowerMime === 'audio/x-m4a' ||
    lowerMime === 'audio/m4a'
  );
}

function mimeFromName(name?: string | null) {
  const lower = String(name || '').toLowerCase();
  if (lower.endsWith('.m4a')) {
    return 'audio/x-m4a';
  }
  if (lower.endsWith('.wav')) {
    return 'audio/wav';
  }
  return 'audio/mpeg';
}

export function AudioEditor({
  visible,
  lessonId,
  exercise,
  sortIndex,
  currentSortIndexToShift,
  onClose,
  onSaved,
  onBackToTemplates,
}: EditorCommonProps & {visible: boolean}) {
  const {t} = useI18n();
  const [title, setTitle] = useState('');
  const [titleColor, setTitleColor] = useState(TITLE_COLOR);
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [audioTitle, setAudioTitle] = useState('');
  const [audioDescription, setAudioDescription] = useState('');
  const [attachment, setAttachment] = useState<AudioAttachment | undefined>();
  const [fileError, setFileError] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [saving, setSaving] = useState(false);
  const editorKey = String(exercise?.id || 'new');

  useEffect(() => {
    if (!visible) {
      return;
    }
    const d = exercise?.data || {};
    setTitle(String(d.title || ''));
    setTitleColor(readTitleColor(d.titleColor));
    setSubtitle(String(d.subtitle || ''));
    setDescription(String(d.description || ''));
    setContent(String(d.content || ''));
    setAudioTitle(String(d.audioTitle || ''));
    setAudioDescription(String(d.audioDescription || ''));
    setImages(attachmentsToPicked(d.images || d.bgAttachments));
    setFileError('');

    const editorImages = (d.editorImages ||
      d.editorAttachments ||
      []) as Array<{
      id?: number | string;
      path?: string;
      dataURL?: string;
      name?: string;
    }>;
    const first = editorImages[0];
    if (first?.path || first?.dataURL) {
      setAttachment({
        id: first.id,
        path: first.path || first.dataURL,
        name: first.name || nameFromPath(first.path || first.dataURL),
      });
    } else {
      setAttachment(undefined);
    }
  }, [visible, exercise]);

  const pickAudio = async () => {
    try {
      const [picked] = await pick({
        type: [types.audio, 'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a'],
        allowMultiSelection: false,
      });
      if (!picked?.uri) {
        return;
      }
      const fileName = picked.name || `audio-${Date.now()}.mp3`;
      const mime = picked.type || mimeFromName(fileName);
      if (!isAllowedAudio(fileName, mime)) {
        setFileError(t('editor.audioFileInvalidType'));
        return;
      }
      if (picked.size != null && picked.size > MAX_AUDIO_BYTES) {
        setFileError(t('editor.fileTooLarge'));
        return;
      }

      let localUri = picked.uri;
      const copies = await keepLocalCopy({
        files: [
          {
            uri: picked.uri,
            fileName: fileName,
          },
        ],
        destination: 'cachesDirectory',
      });
      const copy = copies[0];
      if (copy?.status === 'success' && copy.localUri) {
        localUri = copy.localUri;
      }

      setFileError('');
      setAttachment({
        localUri,
        name: fileName,
        mime,
      });
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        return;
      }
      setFileError(t('editor.audioUploadFailed'));
    }
  };

  const clearFile = () => {
    setAttachment(undefined);
    setFileError('');
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const hero = await resolvePickedAttachments(images);
      let editorImages: Array<{
        id?: number | string;
        path?: string;
        name?: string;
      }> = [];

      let next = attachment;
      if (next?.localUri && !next.path) {
        const uploaded = await uploadPhotos([
          {
            uri: next.localUri,
            name: next.name || 'audio.mp3',
            type: next.mime || mimeFromName(next.name),
          },
        ]);
        const att = uploaded.attachments?.[0];
        if (!att?.path) {
          setFileError(t('editor.audioUploadFailed'));
          return;
        }
        next = {
          id: att.id,
          path: att.path,
          name: next.name || nameFromPath(att.path),
        };
        setAttachment(next);
      }
      if (next?.path) {
        editorImages = [
          {
            id: next.id,
            path: next.path,
            name: next.name || nameFromPath(next.path),
          },
        ];
      }

      await persistExercise({
        lessonId,
        exercise,
        type: 'audio',
        sortIndex,
        currentSortIndexToShift,
        data: {
          title,
          titleColor,
          subtitle,
          description,
          content,
          audioTitle: audioTitle || title,
          audioDescription,
          images: hero,
          bgAttachments: hero,
          editorImages,
          editorAttachments: editorImages,
        },
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const fileName =
    attachment?.name || nameFromPath(attachment?.path) || '';

  const previewData = useMemo(() => {
    const editorImages = attachment
      ? [
          {
            id: attachment.id,
            path: attachment.path || attachment.localUri,
            dataURL: attachment.localUri || attachment.path,
            name: attachment.name,
          },
        ]
      : [];
    const hero = pickedToPreviewMedia(images);
    return {
      title,
      titleColor,
      subtitle,
      description,
      content,
      audioTitle: audioTitle || title,
      audioDescription,
      images: hero,
      bgAttachments: hero,
      editorImages,
      editorAttachments: editorImages,
    };
  }, [
    title,
    titleColor,
    subtitle,
    description,
    content,
    audioTitle,
    audioDescription,
    images,
    attachment,
  ]);

  return (
    <EditorShell
      visible={visible}
      title={exercise ? t('common.edit') : t('templates.audio')}
      onClose={onClose}
      onBackToTemplates={onBackToTemplates}
      onSave={() => {
        void onSave();
      }}
      saving={saving}
      previewType="audio"
      previewLessonId={lessonId}
      previewData={previewData}>
      <TitleColorField
        label={t('editor.fieldTitle')}
        value={title}
        onChangeText={setTitle}
        color={titleColor}
        onColorChange={setTitleColor}
      />
      <TextField
        label={t('editor.fieldSubtitle')}
        value={subtitle}
        onChangeText={setSubtitle}
      />
      <TextField
        label={t('editor.fieldDescription')}
        value={description}
        onChangeText={setDescription}
      />
      <TextField
        label={t('editor.audioTitle')}
        value={audioTitle}
        onChangeText={setAudioTitle}
      />

      <View style={styles.fileBlock}>
        <Text style={styles.hint}>{t('editor.audioFileHint')}</Text>
        {fileName ? (
          <View style={styles.fileBlockInner}>
            <View style={styles.fileRow}>
              <Text style={styles.fileName} numberOfLines={2}>
                {fileName}
              </Text>
              <Pressable onPress={clearFile}>
                <Text style={editorStyles.removeText}>{t('common.delete')}</Text>
              </Pressable>
            </View>
            <Button
              title={t('editor.uploadAudioFile')}
              variant="secondary"
              onPress={() => {
                void pickAudio();
              }}
            />
          </View>
        ) : (
          <Button
            title={t('editor.uploadAudioFile')}
            variant="secondary"
            onPress={() => {
              void pickAudio();
            }}
          />
        )}
        {!!fileError && <Text style={styles.error}>{fileError}</Text>}
      </View>

      <Text style={editorStyles.sectionLabel}>{t('editor.audioScript')}</Text>
      <RichHtmlEditor
        key={`audio-script-${editorKey}`}
        html={audioDescription}
        onChangeHtml={setAudioDescription}
        placeholder={t('editor.audioScript')}
      />

      <Text style={editorStyles.sectionLabel}>{t('editor.content')}</Text>
      <RichHtmlEditor
        key={`audio-content-${editorKey}`}
        html={content}
        onChangeHtml={setContent}
        placeholder={t('editor.content')}
      />
      <View style={editorStyles.card}>
        <ImagePickerField
          label={t('editor.coverImage')}
          images={images}
          onChange={setImages}
          multiple={false}
          max={1}
        />
      </View>
    </EditorShell>
  );
}

const styles = StyleSheet.create({
  fileBlock: {gap: 10, marginBottom: 12},
  fileBlockInner: {gap: 10},
  hint: {color: colors.textSecondary, fontSize: 13, lineHeight: 18},
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    padding: 12,
  },
  fileName: {flex: 1, fontWeight: '600', color: colors.primary},
  error: {color: colors.danger, fontSize: 13, fontWeight: '600'},
});
