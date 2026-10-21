import {createNavigationContainerRef} from '@react-navigation/native';
import {InteractionManager} from 'react-native';

import type {AppStackParamList} from './types';
import {
  resetAfterAuth,
  type AuthProfileLike,
} from '../../shared/navigation/resetToLessonPlans';

export const navigationRef = createNavigationContainerRef<AppStackParamList>();

/**
 * After login/register: wait for the Login/Registration modal to finish
 * unmounting (keyboard, autofill), then reset the root stack.
 * Safe on Android 16 — does not race with AppNavigator key remount.
 */
export function scheduleResetAfterAuth(profile?: AuthProfileLike) {
  InteractionManager.runAfterInteractions(() => {
    requestAnimationFrame(() => {
      if (!navigationRef.isReady()) {
        return;
      }
      resetAfterAuth(navigationRef, profile);
    });
  });
}
