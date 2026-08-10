import {LegalDocumentScreen} from '../../../features/catalog/ui/LegalDocumentScreen';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import type {AppStackParamList, LessonsStackParamList} from '../../../app/navigation/types';

type Props =
  | NativeStackScreenProps<AppStackParamList, 'LegalDocument'>
  | NativeStackScreenProps<LessonsStackParamList, 'LegalDocument'>;

export function LegalDocumentPage({route}: Props) {
  return <LegalDocumentScreen docId={route.params.docId} />;
}
