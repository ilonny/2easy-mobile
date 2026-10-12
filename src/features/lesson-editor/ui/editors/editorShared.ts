import {getImageUrl, uuidv4} from '../../../lesson-player/lib/getImageUrl';
import {
  saveExercise,
  uploadPhotos,
  uploadPhotosByUrl,
} from '../../../lesson-player/api/lessonApi';
import type {Exercise} from '../../../lesson-player/model/types';
import type {PickedImage} from '../ImagePickerField';

export {uuidv4};

export const TITLE_COLOR = '#3F28C6';

export function readTitleColor(raw: unknown, fallback = TITLE_COLOR): string {
  const s = String(raw || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) {
    return s.toUpperCase();
  }
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`.toUpperCase();
  }
  return fallback;
}

export const MEDIA_KEYS = [
  'images',
  'editorImages',
  'secondEditorImages',
  'attachments',
  'editorAttachments',
] as const;

export type EditorCommonProps = {
  lessonId: number;
  exercise?: Exercise | null;
  sortIndex?: number;
  currentSortIndexToShift?: number;
  onClose: () => void;
  onSaved: () => void;
  /** Create flow only: return to template picker (site `backToOtherTemplates`). */
  onBackToTemplates?: () => void;
};

/**
 * Merge next exercise data over previous. Media fields present in `next`
 * replace; media fields omitted from `next` are preserved from `prev`
 * (prevents accidental wipe when an editor doesn't touch images).
 */
export function mergeExerciseData(
  prev: Record<string, unknown> | null | undefined,
  next: Record<string, unknown>,
  preserveKeys: readonly string[] = MEDIA_KEYS,
): Record<string, unknown> {
  const result: Record<string, unknown> = {...(prev || {}), ...next};
  for (const key of preserveKeys) {
    if (!(key in next) && prev && key in prev) {
      result[key] = prev[key];
    }
  }
  return result;
}

export async function persistExercise(args: {
  lessonId: number;
  exercise?: Exercise | null;
  type: string;
  data: Record<string, unknown>;
  sortIndex?: number;
  currentSortIndexToShift?: number;
}) {
  const {
    lessonId,
    exercise,
    type,
    data,
    sortIndex,
    currentSortIndexToShift,
  } = args;

  const merged = mergeExerciseData(
    (exercise?.data as Record<string, unknown>) || null,
    data,
  );

  await saveExercise({
    lesson_id: lessonId,
    id: exercise?.id,
    type,
    data: JSON.stringify(merged),
    sortIndex:
      exercise?.sortIndex === 0
        ? 0
        : exercise?.sortIndex ?? sortIndex ?? 0,
    currentSortIndexToShift,
  });
}

export function newId() {
  return uuidv4();
}

export function attachmentsToPicked(
  raw: unknown,
): PickedImage[] {
  if (!Array.isArray(raw) || !raw.length) {
    return [];
  }
  return raw
    .map((item, index) => {
      const img = item as {
        id?: number | string;
        path?: string;
        dataURL?: string;
        text?: string;
      };
      const path = img.path;
      const uri = img.dataURL || getImageUrl(path);
      if (!uri && !path) {
        return null;
      }
      return {
        id: String(img.id || `img-${index}-${newId()}`),
        path,
        uri: uri || '',
        remoteId: img.id,
      } as PickedImage;
    })
    .filter(Boolean) as PickedImage[];
}

/** Live editor preview media (local uri or saved path). */
export function pickedToPreviewMedia(
  images: PickedImage[],
): Array<{id: string; path?: string; dataURL?: string; text?: string}> {
  return images
    .map(img => {
      const dataURL =
        img.uri ||
        (img.path ? getImageUrl(img.path) : undefined) ||
        undefined;
      if (!dataURL && !img.path) {
        return null;
      }
      return {
        id: String(img.id),
        path: img.path,
        dataURL,
      };
    })
    .filter(Boolean) as Array<{
    id: string;
    path?: string;
    dataURL?: string;
    text?: string;
  }>;
}

/** Convert YouTube / Rutube / VK links into embed iframes (site parity). */
export function linkToVideoEmbed(text: string): string {
  const trimmed = (text || '').trim();
  if (!trimmed || trimmed.includes('iframe')) {
    return trimmed;
  }
  if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|shorts\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = trimmed.match(regExp);
    const id = match && match[2].length === 11 ? match[2] : null;
    if (id) {
      return (
        '<iframe width="100%" height="500" src="//www.youtube.com/embed/' +
        id +
        '" frameborder="0" allowfullscreen></iframe>'
      );
    }
  }
  if (trimmed.includes('rutube.ru/video')) {
    const id = trimmed.split('/').reverse()[1];
    if (id) {
      return `<iframe width="100%" height="500" src="https://rutube.ru/play/embed/${id}/" frameBorder="0" allow="clipboard-write; fullscreen" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>`;
    }
  }
  if (trimmed.includes('vkvideo.ru') && trimmed.includes('video-')) {
    try {
      const oid = trimmed.split('video-')[1].split('_')[0];
      const id = trimmed.split('video-')[1].split('_')[1]?.split(/[?#]/)[0];
      if (oid && id) {
        return `<iframe src="https://vkvideo.ru/video_ext.php?oid=-${oid}&id=${id}&hd=2&autoplay=0" width="100%" height="500" allow="encrypted-media; fullscreen; picture-in-picture; screen-wake-lock;" frameborder="0" allowfullscreen></iframe>`;
      }
    } catch {
      // keep original
    }
  }
  return trimmed;
}

/** Upload local files + remote URLs, keep already-saved attachments. */
export async function resolvePickedAttachments(
  images: PickedImage[],
): Promise<Array<{id?: number | string; path?: string; text?: string}>> {
  const locals = images.filter(img => img.isLocalFile && img.uri && !img.path);
  const remotes = images.filter(img => img.isRemoteUrl && img.uri && !img.path);

  let localUploaded: Array<{id?: number; path?: string}> = [];
  let remoteUploaded: Array<{id?: number; path?: string}> = [];

  if (locals.length) {
    const res = await uploadPhotos(
      locals.map((img, index) => ({
        uri: img.uri,
        name: `image-${index}.jpg`,
        type: 'image/jpeg',
      })),
    );
    localUploaded = res.attachments || [];
  }
  if (remotes.length) {
    const res = await uploadPhotosByUrl(
      remotes.map(img => ({dataURL: img.uri})),
    );
    remoteUploaded = res.attachments || [];
  }

  let localIdx = 0;
  let remoteIdx = 0;

  return images
    .map(img => {
      if (img.path) {
        return {id: img.remoteId, path: img.path};
      }
      if (img.isLocalFile) {
        const att = localUploaded[localIdx++];
        return att?.path ? {id: att.id, path: att.path} : null;
      }
      if (img.isRemoteUrl) {
        const att = remoteUploaded[remoteIdx++];
        return att?.path ? {id: att.id, path: att.path} : null;
      }
      return null;
    })
    .filter(Boolean) as Array<{
    id?: number | string;
    path?: string;
    text?: string;
  }>;
}
