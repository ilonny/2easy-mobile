import type {Exercise} from '../../../lesson-player/model/types';
import {AudioEditor} from './AudioEditor';
import {FillGapsNewEditor} from './FillGapsNewEditor';
import {FreeInputFormEditor} from './FreeInputFormEditor';
import {ImageExEditor} from './ImageExEditor';
import {IntEditor} from './IntEditor';
import {MatchWordColumnEditor} from './MatchWordColumnEditor';
import {MatchWordImageEditor} from './MatchWordImageEditor';
import {MatchWordWordEditor} from './MatchWordWordEditor';
import {NoteEditor} from './NoteEditor';
import {TestEditor} from './TestEditor';
import {Text2ColEditor} from './Text2ColEditor';
import {TextChecklistEditor} from './TextChecklistEditor';
import {TextDefaultEditor} from './TextDefaultEditor';
import {TextStickerEditor} from './TextStickerEditor';
import {VideoEditor} from './VideoEditor';

export type EditorRootModalProps = {
  visible: boolean;
  type: string;
  lessonId: number;
  exercise?: Exercise | null;
  sortIndex?: number;
  currentSortIndexToShift?: number;
  onClose: () => void;
  onSaved: () => void;
};

export function EditorRootModal({
  visible,
  type,
  lessonId,
  exercise,
  sortIndex,
  currentSortIndexToShift,
  onClose,
  onSaved,
}: EditorRootModalProps) {
  if (!visible || !type) {
    return null;
  }

  const common = {
    visible,
    lessonId,
    exercise,
    sortIndex,
    currentSortIndexToShift,
    onClose,
    onSaved,
  };

  switch (type) {
    case 'text-default':
      return <TextDefaultEditor {...common} />;
    case 'text-2-col':
      return <Text2ColEditor {...common} />;
    case 'text-sticker':
      return <TextStickerEditor {...common} />;
    case 'text-checklist':
      return <TextChecklistEditor {...common} />;
    case 'image':
      return <ImageExEditor {...common} />;
    case 'video':
      return <VideoEditor {...common} />;
    case 'audio':
      return <AudioEditor {...common} />;
    case 'note':
      return <NoteEditor {...common} />;
    case 'int':
      return <IntEditor {...common} />;
    case 'test':
      return <TestEditor {...common} />;
    case 'free-input-form':
      return <FreeInputFormEditor {...common} />;
    case 'match-word-word':
      return <MatchWordWordEditor {...common} />;
    case 'match-word-image':
      return <MatchWordImageEditor {...common} />;
    case 'match-word-column':
      return <MatchWordColumnEditor {...common} />;
    case 'FILL_GAPS_NEW':
      return <FillGapsNewEditor {...common} />;
    default:
      return null;
  }
}
