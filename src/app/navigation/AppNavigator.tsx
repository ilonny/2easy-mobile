import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {useAuth} from '../../entities/session';
import {HomePage} from '../../pages/home/ui/HomePage';
import {LoginPage} from '../../pages/login/ui/LoginPage';
import {RegistrationPage} from '../../pages/registration/ui/RegistrationPage';
import {RestorePasswordPage} from '../../pages/restore-password/ui/RestorePasswordPage';
import {LegalDocumentPage} from '../../pages/legal/ui/LegalDocumentPage';
import {MainTabNavigator} from './MainTabNavigator';
import type {AppStackParamList} from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

/**
 * Catalog screens live under MainTabs → Lessons stack so the tab bar
 * stays visible on speaking games, grammar, subscription, etc.
 *
 * Auth landing: Login/Registration call scheduleResetAfterAuth (via
 * navigationRef) after setSession — do NOT remount this navigator with
 * key={isAuthorized}; that raced with modal teardown on Android 16 and
 * also left users stuck on Login when remount alone was used.
 */
export function AppNavigator() {
  const {isAuthorized} = useAuth();

  return (
    <Stack.Navigator
      initialRouteName={isAuthorized ? 'MainTabs' : 'Home'}
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen
        name="Home"
        component={HomePage}
        options={{contentStyle: {backgroundColor: '#FFFFFF'}}}
      />
      <Stack.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{contentStyle: {backgroundColor: '#F7F5FF'}}}
      />
      <Stack.Screen
        name="LegalDocument"
        component={LegalDocumentPage}
        options={{contentStyle: {backgroundColor: '#F9F9F9'}}}
      />
      <Stack.Group
        screenOptions={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          contentStyle: {backgroundColor: '#20107D'},
        }}>
        <Stack.Screen name="Login" component={LoginPage} />
        <Stack.Screen name="Registration" component={RegistrationPage} />
        <Stack.Screen name="RestorePassword" component={RestorePasswordPage} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
