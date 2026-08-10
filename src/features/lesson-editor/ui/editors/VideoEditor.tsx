import {useEffect, useState} from 'react';
import {Pressable, Text, View} from 'react-native';

import {useI18n} from '../../../../shared/i18n';
import {TextField} from '../../../../shared/ui';
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
  resolvePickedAttachments,
  type EditorCommonProps,
} from './editorShared';

type VideoItem = {id: string; content: string; title: string; source: 'link'};

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
  const [videos, setVideos] = useState<VideoItem[]>([
    {id: newId(), content: '', title: '', source: 'link'},
  ]);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const d = exercise?.data || {};
    setTitle(String(d.title || ''));
    setSubtitle(String(d.subtitle || ''));
    setDescription(String(d.description || ''));
    setImages(attachmentsToPicked(d.images));
    const list = (d.videos as Array<{content?: string; title?: string}>) || [];
    setVideos(
      list.length
        ? list.map(v => ({
            id: newId(),
            content: String(v.content || ''),
            title: String(v.title || ''),
            source: 'link' as const,
          }))
        : [{id: newId(), content: '', title: '', source: 'link'}],
    );
  }, [visible, exercise]);

  const onSave = async () => {
    setSaving(true);
    try {
      const hero = await resolvePickedAttachments(images);
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
          videos: videos
            .map(v => ({
              content: linkToVideoEmbed(v.content),
              title: v.title,
              source: 'link' as const,
            }))
            .filter(v => v.content.trim()),
        },
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <EditorShell
      visible={visible}
      title={exercise ? t('common.edit') : 'Video'}
      onClose={onClose}
      onSave={() => {
        void onSave();
      }}
      saving={saving}>
      <TextField label={t('editor.fieldTitle')} value={title} onChangeText={setTitle} />
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
      {videos.map((video, index) => (
        <View key={video.id} style={editorStyles.itemCard}>
          <TextField
            label={`Video title ${index + 1}`}
            value={video.title}
            onChangeText={text =>
              setVideos(prev =>
                prev.map(v => (v.id === video.id ? {...v, title: text} : v)),
              )
            }
          />
          <TextField
            label={t('editor.videoEmbed')}
            value={video.content}
            onChangeText={text =>
              setVideos(prev =>
                prev.map(v =>
                  v.id === video.id ? {...v, content: text} : v,
                ),
              )
            }
            multiline
            style={editorStyles.multiline}
            autoCapitalize="none"
          />
          <Pressable
            onPress={() =>
              setVideos(prev => prev.filter(v => v.id !== video.id))
            }>
            <Text style={editorStyles.removeText}>{t('common.delete')}</Text>
          </Pressable>
        </View>
      ))}
      <Pressable
        style={editorStyles.addBtn}
        onPress={() =>
          setVideos(prev =>
            prev.concat({
              id: newId(),
              content: '',
              title: '',
              source: 'link',
            }),
          )
        }>
        <Text style={editorStyles.addBtnText}>+ Add video</Text>
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
