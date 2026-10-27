import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {useAuth} from '../../entities/session';
import {StudentsScreen} from '../../features/students/ui/StudentsScreen';
import {StudentCabinetScreen} from '../../features/students/ui/StudentCabinetScreen';
import {StudentCourseScreen} from '../../features/students/ui/StudentCourseScreen';
import {colors} from '../../shared/config/theme';
import type {StudentsStackParamList} from '../../shared/navigation/types';

const Stack = createNativeStackNavigator<StudentsStackParamList>();

function StudentCabinetRoute({
  route,
}: {
  route: {params?: {studentId?: number}};
}) {
  const {profile} = useAuth();
  const fromParams = Number(route.params?.studentId || 0);
  const fromProfile = Number(profile?.studentId || 0);
  const studentId = fromParams > 0 ? fromParams : fromProfile;

  if (!studentId) {
    // Avoid crash when StudentCabinet mounts without params (RN7 restore /
    // race on cold start). Teacher path always navigates with studentId.
    return (
      <View style={styles.fallback}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <StudentCabinetScreen studentId={studentId} />;
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
  const studentId = Number(profile?.studentId || 0);
  const isStudent = !!profile?.isStudent && studentId > 0;

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
        initialParams={isStudent ? {studentId} : undefined}
        getId={({params}) => {
          const id = Number(params?.studentId || 0);
          return id > 0 ? String(id) : undefined;
        }}
      />
      <Stack.Screen name="StudentCourse" component={StudentCourseRoute} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pageBackground,
  },
});
