import type {NavigatorScreenParams} from '@react-navigation/native';

import type {LegalDocId} from '../../features/catalog/ui/LegalDocumentScreen';
import type {
  LessonsStackParamList,
  MainTabParamList as SharedMainTabParamList,
} from '../../shared/navigation/types';

export type AuthStackParamList = {
  Login: undefined;
  Registration: undefined;
  RestorePassword: undefined;
};

export type MainTabParamList = SharedMainTabParamList;

export type AppStackParamList = {
  Home: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  LegalDocument: {docId: LegalDocId};
  Login: undefined;
  Registration: undefined;
  RestorePassword: undefined;
};

export type {LessonsStackParamList, StudentsStackParamList} from '../../shared/navigation/types';

export type RootStackParamList = AppStackParamList &
  LessonsStackParamList &
  import('../../shared/navigation/types').StudentsStackParamList &
  MainTabParamList;
