import {CommonActions} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import type {
  AppRootRoute,
  LessonsStackParamList,
  RootStackParamList,
} from './types';

type AnyNav = {
  dispatch: (action: unknown) => void;
  getParent?: () => AnyNav | undefined;
  canGoBack?: () => boolean;
  goBack?: () => void;
  navigate?: (...args: never[]) => void;
};

const TAB_ROUTES = new Set<AppRootRoute>([
  'Lessons',
  'Students',
  'Profile',
  'MainTabs',
]);

function getRootNavigation(navigation: AnyNav): AnyNav {
  let current = navigation;
  let parent = current.getParent?.();
  while (parent) {
    current = parent;
    parent = current.getParent?.();
  }
  return current;
}

function lessonsStackState(screen: keyof LessonsStackParamList) {
  return {
    index: 0,
    routes: [{name: screen}],
  };
}

function mainTabsState(
  tab: 'Lessons' | 'Students' | 'Profile',
  lessonsScreen: keyof LessonsStackParamList = 'LessonPlans',
) {
  const order = ['Lessons', 'Students', 'Profile'] as const;
  return {
    index: Math.max(0, order.indexOf(tab)),
    routes: [
      {
        name: 'Lessons' as const,
        state: lessonsStackState(lessonsScreen),
      },
      {
        name: 'Students' as const,
        state: {
          index: 0,
          routes: [{name: 'StudentsList' as const}],
        },
      },
      {name: 'Profile' as const},
    ],
  };
}

function sectionScreen(
  route: AppRootRoute,
): keyof LessonsStackParamList | null {
  if (route === 'Lessons' || route === 'MainTabs') {
    return 'LessonPlans';
  }
  if (
    route === 'SpeakingGames' ||
    route === 'DiscussionCards' ||
    route === 'Grammar' ||
    route === 'Subscription' ||
    route === 'Tutorial'
  ) {
    return route;
  }
  return null;
}

/** Clears the whole stack and lands on MainTabs / Home (with tab bar for auth). */
export function resetToRoute(
  navigation: NativeStackNavigationProp<RootStackParamList> | AnyNav,
  route: AppRootRoute,
) {
  const root = getRootNavigation(navigation as AnyNav);

  if (route === 'Home') {
    root.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{name: 'Home'}],
      }),
    );
    return;
  }

  if (route === 'Students' || route === 'Profile') {
    root.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'MainTabs',
            state: mainTabsState(route),
          },
        ],
      }),
    );
    return;
  }

  if (TAB_ROUTES.has(route)) {
    root.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'MainTabs',
            state: mainTabsState('Lessons', 'LessonPlans'),
          },
        ],
      }),
    );
    return;
  }

  const screen = sectionScreen(route) ?? 'LessonPlans';
  root.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: 'MainTabs',
          state: mainTabsState('Lessons', screen),
        },
      ],
    }),
  );
}

/**
 * Opens a catalog section inside the Lessons tab so the tab bar stays visible.
 */
export function openSectionRoute(
  navigation: NativeStackNavigationProp<RootStackParamList> | AnyNav,
  route: AppRootRoute,
  isAuthorized: boolean,
) {
  if (!isAuthorized) {
    resetToRoute(navigation, 'Home');
    return;
  }
  resetToRoute(navigation, route);
}

/** Breadcrumb "Home" / logo: Lessons tab when logged in, guest Home otherwise. */
export function goHome(
  navigation: NativeStackNavigationProp<RootStackParamList> | AnyNav,
  isAuthorized: boolean,
) {
  if (isAuthorized) {
    resetToRoute(navigation, 'Lessons');
  } else {
    resetToRoute(navigation, 'Home');
  }
}

/**
 * Prefer native goBack when possible; otherwise rebuild the section stack.
 */
export function goToSection(
  navigation: NativeStackNavigationProp<RootStackParamList> | AnyNav,
  route: AppRootRoute,
  isAuthorized: boolean,
) {
  const nav = navigation as AnyNav;
  if (nav.canGoBack?.()) {
    nav.goBack?.();
    return;
  }
  openSectionRoute(navigation, route, isAuthorized);
}

/** Clears auth modals and the whole stack, landing on Lessons tab. */
export function resetToLessonPlans(
  navigation: NativeStackNavigationProp<RootStackParamList> | AnyNav,
) {
  resetToRoute(navigation, 'Lessons');
}
