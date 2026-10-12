import {StyleSheet, Text, View} from 'react-native';

import {colors} from '../../../../shared/config/theme';
import {AudioExView} from './AudioExView';
import {FillGapsDragExView} from './FillGapsDragExView';
import {FillGapsInputExView} from './FillGapsInputExView';
import {FillGapsNewExView} from './FillGapsNewExView';
import {FillGapsSelectExView} from './FillGapsSelectExView';
import {FreeInputFormExView} from './FreeInputFormExView';
import {ImageExView} from './ImageExView';
import {IntExView} from './IntExView';
import {MatchWordColumnExView} from './MatchWordColumnExView';
import {MatchWordImageExView} from './MatchWordImageExView';
import {MatchWordWordExView} from './MatchWordWordExView';
import {NoteExView} from './NoteExView';
import {TestExView} from './TestExView';
import {Text2ColExView} from './Text2ColExView';
import {TextChecklistExView} from './TextChecklistExView';
import {TextDefaultExView} from './TextDefaultExView';
import {TextStickerExView} from './TextStickerExView';
import {UnscrambleWordsExView} from './UnscrambleWordsExView';
import {VideoExView} from './VideoExView';

type Props = {
  type: string;
  data: any;
};

export function ExViewRouter({type, data}: Props) {
  switch (type) {
    case 'image':
      return <ImageExView data={data} />;
    case 'text-default':
      return <TextDefaultExView data={data} />;
    case 'text-2-col':
      return <Text2ColExView data={data} />;
    case 'text-sticker':
      return <TextStickerExView data={data} />;
    case 'text-checklist':
      return <TextChecklistExView data={data} />;
    case 'video':
      return <VideoExView data={data} />;
    case 'audio':
      return <AudioExView data={data} />;
    case 'note':
      return <NoteExView data={data} />;
    case 'int':
      return <IntExView data={data} />;
    case 'test':
      return <TestExView data={data} />;
    case 'free-input-form':
      return <FreeInputFormExView data={data} />;
    case 'match-word-word':
      return <MatchWordWordExView data={data} />;
    case 'match-word-image':
      return <MatchWordImageExView data={data} />;
    case 'match-word-column':
      return <MatchWordColumnExView data={data} />;
    case 'fill-gaps-input':
      return <FillGapsInputExView data={data} />;
    case 'fill-gaps-select':
      return <FillGapsSelectExView data={data} />;
    case 'fill-gaps-drag':
      return <FillGapsDragExView data={data} />;
    case 'FILL_GAPS_NEW':
      return <FillGapsNewExView data={data} />;
    case 'UNSCRAMBLE_WORDS':
      return <UnscrambleWordsExView data={data} />;
    default:
      return (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>Unsupported exercise: {type}</Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  fallback: {padding: 16},
  fallbackText: {color: colors.textSecondary, textAlign: 'center'},
});
