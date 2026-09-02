import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {LessonPlansPage} from '../../pages/lesson-plans/ui/LessonPlansPage';
import {CoursePage} from '../../pages/course/ui/CoursePage';
import {SpeakingGamesPage} from '../../pages/speaking-games/ui/SpeakingGamesPage';
import {DiscussionCardsPage} from '../../pages/discussion-cards/ui/DiscussionCardsPage';
import {GrammarPage} from '../../pages/grammar/ui/GrammarPage';
import {SubscriptionPage} from '../../pages/subscription/ui/SubscriptionPage';
import {TutorialPage} from '../../pages/tutorial/ui/TutorialPage';
import {ContentPlayerPage} from '../../pages/content-player/ui/ContentPlayerPage';
import {LessonViewerPage} from '../../pages/lesson-viewer/ui/LessonViewerPage';
import {LessonEditorPage} from '../../pages/lesson-editor/ui/LessonEditorPage';
import {BoardViewerPage} from '../../pages/board-viewer/ui/BoardViewerPage';
import {LegalDocumentPage} from '../../pages/legal/ui/LegalDocumentPage';
import type {LessonsStackParamList} from './types';

const Stack = createNativeStackNavigator<LessonsStackParamList>();

export function LessonsStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="LessonPlans"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        animation: 'slide_from_right',
        contentStyle: {backgroundColor: '#F9F9F9'},
      }}>
      <Stack.Screen
        name="LessonPlans"
        component={LessonPlansPage}
        options={{contentStyle: {backgroundColor: '#F7F5FF'}}}
      />
      <Stack.Screen
        name="Course"
        component={CoursePage}
        options={{contentStyle: {backgroundColor: '#F7F5FF'}}}
      />
      <Stack.Screen name="SpeakingGames" component={SpeakingGamesPage} />
      <Stack.Screen name="DiscussionCards" component={DiscussionCardsPage} />
      <Stack.Screen name="Grammar" component={GrammarPage} />
      <Stack.Screen name="Subscription" component={SubscriptionPage} />
      <Stack.Screen name="Tutorial" component={TutorialPage} />
      <Stack.Screen name="ContentPlayer" component={ContentPlayerPage} />
      <Stack.Screen name="LessonViewer" component={LessonViewerPage} />
      <Stack.Screen name="LessonEditor" component={LessonEditorPage} />
      <Stack.Screen
        name="BoardViewer"
        component={BoardViewerPage}
        options={{
          gestureEnabled: false,
          contentStyle: {backgroundColor: '#FFFFFF'},
        }}
      />
      <Stack.Screen name="LegalDocument" component={LegalDocumentPage} />
    </Stack.Navigator>
  );
}
