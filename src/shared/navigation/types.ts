import type {NavigatorScreenParams} from '@react-navigation/native';

import type {ContentSlug} from '../../features/catalog/model/contentRegistry';
import type {LegalDocId} from '../../features/catalog/ui/LegalDocumentScreen';

export type AuthStackParamList = {
  Login: undefined;
  Registration: undefined;
  RestorePassword: undefined;
};

/** Catalog + lesson content under the Lessons tab (keeps tab bar visible). */
export type LessonsStackParamList = {
  LessonPlans: undefined;
  SpeakingGames: undefined;
  DiscussionCards: undefined;
  Grammar: undefined;
  Subscription: undefined;
  Tutorial: undefined;
  ContentPlayer: {slug: ContentSlug};
  LessonViewer: {
    lessonId: number;
    from?: 'Grammar' | 'Tutorial' | 'Lessons';
    studentId?: number;
  };
  LessonEditor: {lessonId: number};
  LegalDocument: {docId: LegalDocId};
};

/** Teacher students list + student cabinet under Students tab. */
export type StudentsStackParamList = {
  StudentsList: undefined;
  StudentCabinet: {studentId: number};
};

export type MainTabParamList = {
  Lessons: NavigatorScreenParams<LessonsStackParamList> | undefined;
  Students: NavigatorScreenParams<StudentsStackParamList> | undefined;
  Profile: undefined;
};

export type AppRootRoute =
  | 'Home'
  | 'MainTabs'
  | 'Lessons'
  | 'Students'
  | 'Profile'
  | 'SpeakingGames'
  | 'DiscussionCards'
  | 'Grammar'
  | 'Subscription'
  | 'Tutorial';

export type AppStackParamList = {
  Home: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  /** Guest / auth-flow legal docs (no tab bar). */
  LegalDocument: {docId: LegalDocId};
  Login: undefined;
  Registration: undefined;
  RestorePassword: undefined;
};

/**
 * Loose union for screen navigate() typing across nested navigators.
 * Prefer nested helpers (openSectionRoute) for section jumps.
 */
export type RootStackParamList = AppStackParamList &
  LessonsStackParamList &
  StudentsStackParamList &
  MainTabParamList;
