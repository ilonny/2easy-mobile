import {ContentPlayerScreen} from '../../../features/catalog/ui/ContentPlayerScreen';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import type {LessonsStackParamList} from '../../../app/navigation/types';

type Props = NativeStackScreenProps<LessonsStackParamList, 'ContentPlayer'>;

export function ContentPlayerPage({route}: Props) {
  return <ContentPlayerScreen slug={route.params.slug} />;
}
