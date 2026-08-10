import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {useAuth} from '../../entities/session';
import {StudentsScreen} from '../../features/students/ui/StudentsScreen';
import {StudentCabinetScreen} from '../../features/students/ui/StudentCabinetScreen';
import type {StudentsStackParamList} from './types';

const Stack = createNativeStackNavigator<StudentsStackParamList>();

function StudentCabinetRoute({
  route,
}: {
  route: {params: {studentId: number}};
}) {
  return <StudentCabinetScreen studentId={route.params.studentId} />;
}

/**
 * Teacher: list → cabinet.
 * Student: lands directly on own cabinet (no list).
 */
export function StudentsStackNavigator() {
  const {profile} = useAuth();
  const isStudent = !!profile?.isStudent && !!profile.studentId;
  const studentId = Number(profile?.studentId) || 0;

  if (isStudent && studentId > 0) {
    return <StudentCabinetScreen studentId={studentId} />;
  }

  return (
    <Stack.Navigator
      initialRouteName="StudentsList"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        animation: 'slide_from_right',
        contentStyle: {backgroundColor: '#F9F9F9'},
      }}>
      <Stack.Screen name="StudentsList" component={StudentsScreen} />
      <Stack.Screen name="StudentCabinet" component={StudentCabinetRoute} />
    </Stack.Navigator>
  );
}
