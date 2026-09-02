import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {useAuth} from '../../entities/session';
import {StudentsScreen} from '../../features/students/ui/StudentsScreen';
import {StudentCabinetScreen} from '../../features/students/ui/StudentCabinetScreen';
import {StudentCourseScreen} from '../../features/students/ui/StudentCourseScreen';
import type {StudentsStackParamList} from '../../shared/navigation/types';

const Stack = createNativeStackNavigator<StudentsStackParamList>();

function StudentCabinetRoute({
  route,
}: {
  route: {params: {studentId: number}};
}) {
  return <StudentCabinetScreen studentId={route.params.studentId} />;
}

function StudentCourseRoute({
  route,
}: {
  route: {params: {courseId: number; studentId: number}};
}) {
  return (
    <StudentCourseScreen
      courseId={route.params.courseId}
      studentId={route.params.studentId}
    />
  );
}

/**
 * Teacher: list → cabinet → course.
 * Student: own cabinet → course (same stack, no list).
 */
export function StudentsStackNavigator() {
  const {profile} = useAuth();
  const isStudent = !!profile?.isStudent && !!profile.studentId;
  const studentId = Number(profile?.studentId) || 0;

  return (
    <Stack.Navigator
      initialRouteName={isStudent ? 'StudentCabinet' : 'StudentsList'}
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        animation: 'slide_from_right',
        contentStyle: {backgroundColor: '#F9F9F9'},
      }}>
      {!isStudent ? (
        <Stack.Screen name="StudentsList" component={StudentsScreen} />
      ) : null}
      <Stack.Screen
        name="StudentCabinet"
        component={StudentCabinetRoute}
        initialParams={
          isStudent && studentId > 0 ? {studentId} : undefined
        }
      />
      <Stack.Screen name="StudentCourse" component={StudentCourseRoute} />
    </Stack.Navigator>
  );
}
