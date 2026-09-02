import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import type {LessonsStackParamList} from '../../../shared/navigation/types';
import {BoardWebView} from './BoardWebView';

type Route = RouteProp<LessonsStackParamList, 'BoardViewer'>;
type Nav = NativeStackNavigationProp<LessonsStackParamList>;

export function BoardViewerScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const boardId = Number(route.params?.boardId || 0);
  const catalog = !!route.params?.catalog;

  return (
    <BoardWebView
      boardId={boardId}
      catalog={catalog}
      onClose={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
          return;
        }
        navigation.navigate('LessonPlans');
      }}
    />
  );
}
