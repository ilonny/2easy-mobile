import {useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';

import {useI18n} from '../../../../shared/i18n';
import {colors, radii} from '../../../../shared/config/theme';
import {Button, TextField} from '../../../../shared/ui';
import {uploadPhotos} from '../../../lesson-player/api/lessonApi';
import {
  ImagePickerField,
  type PickedImage,
} from '../ImagePickerField';
import {EditorShell, editorStyles} from './EditorShell';
import {
  TITLE_COLOR,
  attachmentsToPicked,
  linkToVideoEmbed,
  newId,
  persistExercise,
  pickedToPreviewMedia,
  resolvePickedAttachments,
  type EditorCommonProps,
} from './editorShared';

type VideoSource = 'link' | 'file';

type VideoAttachment = {
  id?: number | string;
  path?: string;
  name?: string;
  /** Local device URI before upload */
  localUri?: string;
  mime?: string;
};

type VideoItem = {
  id: string;
  content: string;
  title: string;
  source: VideoSource;
  attachment?: VideoAttachment;
};

const MAX_VIDEO_BYTES = 300 * 1024 * 1024;
const ALLOWED_EXT = new Set(['mp4', 'mov', 'webm', 'm4v']);

function emptyVideo(): VideoItem {
  return {id: newId(), content: '', title: '', source: 'link'};
}

function nameFromPath(path?: string) {
  if (!path) {
    return '';
  }
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

function isAllowedVideo(fileName?: string, mime?: string) {
  const lowerName = String(fileName || '').toLowerCase();
  const ext = lowerName.includes('.')
    ? lowerName.split('.').pop() || ''
    : '';
  if (ext && ALLOWED_EXT.has(ext)) {
    return true;
  }
  const lowerMime = String(mime || '').toLowerCase();
  return (
    lowerMime === 'video/mp4' ||
    lowerMime === 'video/quicktime' ||
    lowerMime === 'video/webm' ||
    lowerMime === 'video/x-m4v'
  );
}

function resolveVideoSource(raw: {
  source?: string;
  content?: string;
  attachment?: VideoAttachment;
}): VideoSource {
  if (
    raw.source === 'file' ||
    !!raw.attachment?.path ||
    !!raw.attachment?.localUri
  ) {
    return 'file';
  }
  return 'link';
}

export function VideoEditor({
  visible,
  lessonId,
  exercise,
  sortIndex,
  currentSortIndexToShift,
  onClose,
  onSaved,
}: EditorCommonProps & {visible: boolean}) {
  const {t} = useI18n();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [videos, setVideos] = useState<VideoItem[]>([emptyVideo()]);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible) {
      return;
    }
    const d = exercise?.data || {};
    setTitle(String(d.title || ''));
    setSubtitle(String(d.subtitle || ''));
    setDescription(String(d.description || ''));
    setImages(attachmentsToPicked(d.images));
    setFileErrors({});
    const list =
      (d.videos as Array<{
        content?: string;
        title?: string;
        source?: string;
        attachment?: VideoAttachment;
      }>) || [];
    setVideos(
      list.length
        ? list.map(v => {
            const source = resolveVideoSource(v);
            return {
              id: newId(),
              content: String(v.content || ''),
              title: String(v.title || ''),
              source,
              attachment:
                source === 'file' && v.attachment
                  ? {
                      id: v.attachment.id,
                      path: v.attachment.path,
                      name:
                        v.attachment.name ||
                        nameFromPath(v.attachment.path),
                    }
                  : undefined,
            };
          })
        : [emptyVideo()],
    );
  }, [visible, exercise]);

  const updateVideo = (id: string, patch: Partial<VideoItem>) => {
    setVideos(prev => prev.map(v => (v.id === id ? {...v, ...patch} : v)));
  };

  const setSource = (id: string, source: VideoSource) => {
    setFileErrors(prev => {
      const next = {...prev};
      delete next[id];
      return next;
    });
    if (source === 'file') {
      updateVideo(id, {source: 'file'});
      return;
    }
    updateVideo(id, {
      source: 'link',
      attachment: undefined,
    });
  };

  const pickVideo = async (id: string) => {
    const result = await launchImageLibrary({
      mediaType: 'video',
      selectionLimit: 1,
    });
    if (result.didCancel || !result.assets?.length) {
      return;
    }
    const asset = result.assets[0];
    const uri = asset.uri;
    if (!uri) {
      return;
    }
    const fileName =
      asset.fileName ||
      `video-${Date.now()}.${(asset.type || '').includes('quicktime') ? 'mov' : 'mp4'}`;
    const mime = asset.type || 'video/mp4';
    if (!isAllowedVideo(fileName, mime)) {
      setFileErrors(prev => ({
        ...prev,
        [id]: t('editor.videoFileInvalidType'),
      }));
      return;
    }
    if (asset.fileSize != null && asset.fileSize > MAX_VIDEO_BYTES) {
      setFileErrors(prev => ({
        ...prev,
        [id]: t('editor.videoFileTooLarge'),
      }));
      return;
    }
    setFileErrors(prev => {
      const next = {...prev};
      delete next[id];
      return next;
    });
    updateVideo(id, {
      source: 'file',
      content: '',
      attachment: {
        localUri: uri,
        name: fileName,
        mime,
      },
    });
  };

  const clearFile = (id: string) => {
    setFileErrors(prev => {
      const next = {...prev};
      delete next[id];
      return next;
    });
    updateVideo(id, {
      source: 'file',
      content: '',
      attachment: undefined,
    });
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const hero = await resolvePickedAttachments(images);
      const savedVideos: Array<{
        title: string;
        content: string;
        source: VideoSource;
        attachment?: {id?: number | string; path?: string; name?: string};
      }> = [];

      for (const video of videos) {
        if (video.source === 'file') {
          let attachment = video.attachment;
          if (attachment?.localUri && !attachment.path) {
            const uploaded = await uploadPhotos([
              {
                uri: attachment.localUri,
                name: attachment.name || 'video.mp4',
                type: attachment.mime || 'video/mp4',
              },
            ]);
            const att = uploaded.attachments?.[0];
            if (!att?.path) {
              setFileErrors(prev => ({
                ...prev,
                [video.id]: t('editor.videoUploadFailed'),
              }));
              return;
            }
            attachment = {
              id: att.id,
              path: att.path,
              name: attachment.name || nameFromPath(att.path),
            };
          }
          if (!attachment?.path) {
            continue;
          }
          savedVideos.push({
            title: video.title,
            content: '',
            source: 'file',
            attachment: {
              id: attachment.id,
              path: attachment.path,
              name: attachment.name || nameFromPath(attachment.path),
            },
          });
          continue;
        }

        const content = linkToVideoEmbed(video.content);
        if (!content.trim()) {
          continue;
        }
        savedVideos.push({
          title: video.title,
          content,
          source: 'link',
        });
      }

      await persistExercise({
        lessonId,
        exercise,
        type: 'video',
        sortIndex,
        currentSortIndexToShift,
        data: {
          title,
          titleColor: TITLE_COLOR,
          subtitle,
          description,
          images: hero,
          videos: savedVideos,
        },
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const previewData = useMemo(
    () => ({
      title,
      titleColor: TITLE_COLOR,
      subtitle,
      description,
      images: pickedToPreviewMedia(images),
      videos: videos.map(video => {
        if (video.source === 'file' && video.attachment) {
          return {
            title: video.title,
            content: '',
            source: 'file',
            attachment: {
              id: video.attachment.id,
              path: video.attachment.path || video.attachment.localUri,
              name: video.attachment.name,
            },
          };
        }
        return {
          title: video.title,
          content: linkToVideoEmbed(video.content),
          source: 'link',
        };
      }),
    }),
    [title, subtitle, description, images, videos],
  );

  return (
    <EditorShell
      visible={visible}
      title={exercise ? t('common.edit') : t('templates.video')}
      onClose={onClose}
      onSave={() => {
        void onSave();
      }}
      saving={saving}
      previewType="video"
      previewLessonId={lessonId}
      previewData={previewData}>
      <TextField
        label={t('editor.fieldTitle')}
        value={title}
        onChangeText={setTitle}
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
      {videos.map((video, index) => {
        const isFile = video.source === 'file';
        const fileName =
          video.attachment?.name ||
          nameFromPath(video.attachment?.path) ||
          '';
        const error = fileErrors[video.id];
        return (
          <View key={video.id} style={editorStyles.itemCard}>
            <Text style={editorStyles.sectionLabel}>
              {t('editor.videoSource')} {index + 1}
            </Text>
            <View style={editorStyles.row}>
              <Pressable
                onPress={() => setSource(video.id, 'link')}
                style={[
                  editorStyles.chip,
                  !isFile && editorStyles.chipActive,
                ]}>
                <Text
                  style={[
                    editorStyles.chipText,
                    !isFile && editorStyles.chipTextActive,
                  ]}>
                  {t('editor.videoFromLink')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSource(video.id, 'file')}
                style={[
                  editorStyles.chip,
                  isFile && editorStyles.chipActive,
                ]}>
                <Text
                  style={[
                    editorStyles.chipText,
                    isFile && editorStyles.chipTextActive,
                  ]}>
                  {t('editor.videoFromDevice')}
                </Text>
              </Pressable>
            </View>

            <TextField
              label={`${t('templates.video')} ${index + 1}`}
              value={video.title}
              onChangeText={text => updateVideo(video.id, {title: text})}
            />

            {isFile ? (
              <View style={styles.fileBlock}>
                <Text style={styles.hint}>{t('editor.videoFileHint')}</Text>
                {fileName ? (
                  <View style={styles.fileBlockInner}>
                    <View style={styles.fileRow}>
                      <Text style={styles.fileName} numberOfLines={2}>
                        {fileName}
                      </Text>
                      <Pressable onPress={() => clearFile(video.id)}>
                        <Text style={editorStyles.removeText}>
                          {t('common.delete')}
                        </Text>
                      </Pressable>
                    </View>
                    <Button
                      title={t('editor.uploadVideoFile')}
                      variant="secondary"
                      onPress={() => {
                        void pickVideo(video.id);
                      }}
                    />
                  </View>
                ) : (
                  <Button
                    title={t('editor.uploadVideoFile')}
                    variant="secondary"
                    onPress={() => {
                      void pickVideo(video.id);
                    }}
                  />
                )}
                {!!error && <Text style={styles.error}>{error}</Text>}
              </View>
            ) : (
              <TextField
                label={t('editor.videoEmbed')}
                value={video.content}
                onChangeText={text =>
                  updateVideo(video.id, {content: text, source: 'link'})
                }
                multiline
                style={editorStyles.multiline}
                autoCapitalize="none"
                placeholder={t('editor.videoLinkHint')}
              />
            )}

            <Pressable
              onPress={() => {
                setVideos(prev => {
                  const next = prev.filter(v => v.id !== video.id);
                  return next.length ? next : [emptyVideo()];
                });
              }}>
              <Text style={editorStyles.removeText}>{t('common.delete')}</Text>
            </Pressable>
          </View>
        );
      })}
      <Pressable
        style={editorStyles.addBtn}
        onPress={() => setVideos(prev => prev.concat(emptyVideo()))}>
        <Text style={editorStyles.addBtnText}>{t('editor.addVideo')}</Text>
      </Pressable>
      <View style={editorStyles.card}>
        <ImagePickerField
          label={t('editor.coverImage')}
          images={images}
          onChange={setImages}
          multiple
          max={4}
        />
      </View>
    </EditorShell>
  );
}

const styles = StyleSheet.create({
  fileBlock: {gap: 10, marginTop: 4},
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
