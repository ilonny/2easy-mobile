import {getImageUrl} from './getImageUrl';
import type {ExCommonData} from '../model/types';

type Attachment = {
  id?: number | string;
  path?: string;
  text?: string;
  dataURL?: string;
};

function mapAttachments(list?: Attachment[]) {
  return (list || []).map(a => {
    const path = a?.path || a?.dataURL;
    return {
      ...a,
      path,
      dataURL: path ? getImageUrl(path) : a?.dataURL,
    };
  });
}

function parse(data: string): ExCommonData {
  if (!data) {
    return {};
  }
  try {
    return JSON.parse(data) as ExCommonData;
  } catch {
    return {};
  }
}

const mapImageExData = (data: string) => {
  const parsed = parse(data);
  if (parsed?.attachments) {
    parsed.images = mapAttachments(parsed.attachments as Attachment[]);
  }
  return parsed;
};

const mapTextDefaultExData = (data: string) => {
  const parsed = parse(data);
  if (parsed?.bgAttachments) {
    parsed.images = mapAttachments(parsed.bgAttachments as Attachment[]);
  }
  if (parsed?.editorAttachments) {
    parsed.editorImages = mapAttachments(
      parsed.editorAttachments as Attachment[],
    );
  }
  return parsed;
};

const mapText2ColExData = (data: string) => {
  const parsed = mapTextDefaultExData(data);
  if (parsed?.secondEditorAttachments) {
    parsed.secondEditorImages = mapAttachments(
      parsed.secondEditorAttachments as Attachment[],
    );
  }
  return parsed;
};

const mapTextStickerExData = (data: string) => {
  const parsed = parse(data);
  if (parsed?.bgAttachments) {
    parsed.images = mapAttachments(parsed.bgAttachments as Attachment[]);
  }
  return parsed;
};

const mapAudioExData = mapTextDefaultExData;

const mapNoteExData = (data: string) => parse(data);

const mapFillGapsSelectEx = (data: string) => {
  const parsed = parse(data);
  if (parsed?.bgAttachments) {
    parsed.images = mapAttachments(parsed.bgAttachments as Attachment[]);
  }
  return parsed;
};

const mapFillGapsNewExData = (data: string) => {
  const parsed = parse(data);
  if (Array.isArray(parsed?.images)) {
    parsed.images = mapAttachments(parsed.images as Attachment[]);
  }
  return parsed;
};

export function getDataMapper(type: string): (data: string) => ExCommonData {
  switch (type) {
    case 'image':
      return mapImageExData;
    case 'text-default':
      return mapTextDefaultExData;
    case 'text-2-col':
      return mapText2ColExData;
    case 'text-sticker':
      return mapTextStickerExData;
    case 'text-checklist':
      return mapTextDefaultExData;
    case 'video':
      return mapTextDefaultExData;
    case 'audio':
      return mapAudioExData;
    case 'note':
      return mapNoteExData;
    case 'fill-gaps-select':
    case 'fill-gaps-input':
    case 'fill-gaps-drag':
    case 'match-word-word':
    case 'match-word-column':
      return mapFillGapsSelectEx;
    case 'match-word-image':
      return mapImageExData;
    case 'int':
      return mapTextDefaultExData;
    case 'FILL_GAPS_NEW':
      return mapFillGapsNewExData;
    case 'free-input-form':
    case 'test':
      return mapImageExData;
    default:
      return mapImageExData;
  }
}

export function mapExerciseRow(row: {
  id: number;
  lesson_id?: number;
  type: string;
  sortIndex?: number;
  data?: string;
  is_visible?: string | number | boolean | null;
}) {
  const mapper = getDataMapper(row.type);
  const data = mapper(typeof row.data === 'string' ? row.data : '');
  if (data && !data.id) {
    data.id = row.id;
  }
  return {
    id: row.id,
    lesson_id: row.lesson_id,
    type: row.type,
    sortIndex: Number(row.sortIndex ?? 0),
    data,
    is_visible: row.is_visible,
  };
}

export function isExVisible(is_visible: unknown): boolean {
  return (
    is_visible === null ||
    is_visible === undefined ||
    is_visible === '1' ||
    is_visible === 1 ||
    is_visible === true
  );
}
