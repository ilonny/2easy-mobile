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

type AuthProfileLike = {
  isStudent?: boolean;
  studentId?: number | string | null;
} | null | undefined;

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

function studentsStackState(studentId?: number) {
  if (studentId && studentId > 0) {
    return {
      index: 0,
      routes: [
        {
          name: 'StudentCabinet' as const,
          params: {studentId},
        },
      ],
    };
  }
  return {
    index: 0,
    routes: [{name: 'StudentsList' as const}],
  };
}

function mainTabsState(
  tab: 'Lessons' | 'Students' | 'Profile',
  lessonsScreen: keyof LessonsStackParamList = 'LessonPlans',
  studentId?: number,
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
        state: studentsStackState(studentId),
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
    route === 'Schedule' ||
    route === 'Subscription' ||
    route === 'Tutorial'
  ) {
    return route;
  }
  return null;
}

function resolveStudentId(profile?: AuthProfileLike): number {
  return Number(profile?.studentId || 0);
}

export function isStudentProfile(profile?: AuthProfileLike): boolean {
  return Boolean(profile?.isStudent && resolveStudentId(profile) > 0);
}

type ResetOptions = {
  /** When opening Students tab for a logged-in student. */
  studentId?: number;
};

/** Clears the whole stack and lands on MainTabs / Home (with tab bar for auth). */
export function resetToRoute(
  navigation: NativeStackNavigationProp<RootStackParamList> | AnyNav,
  route: AppRootRoute,
  options?: ResetOptions,
) {
  const root = getRootNavigation(navigation as AnyNav);
  const studentId = Number(options?.studentId || 0) || undefined;

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
            state: mainTabsState(route, 'LessonPlans', studentId),
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
            state: mainTabsState('Lessons', 'LessonPlans', studentId),
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
          state: mainTabsState('Lessons', screen, studentId),
        },
      ],
    }),
  );
}

/**
 * After login/registration: teachers → Lesson plans, students → own cabinet.
 * Mirrors site (`/` vs `/student-account/:id`).
 */
export function resetAfterAuth(
  navigation: NativeStackNavigationProp<RootStackParamList> | AnyNav,
  profile?: AuthProfileLike,
) {
  if (isStudentProfile(profile)) {
    resetToRoute(navigation, 'Students', {
      studentId: resolveStudentId(profile),
    });
    return;
  }
  resetToRoute(navigation, 'Lessons');
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

/** Breadcrumb "Home" / logo: Lessons (teacher), cabinet (student), or guest Home. */
export function goHome(
  navigation: NativeStackNavigationProp<RootStackParamList> | AnyNav,
  isAuthorized: boolean,
  profile?: AuthProfileLike,
) {
  if (!isAuthorized) {
    resetToRoute(navigation, 'Home');
    return;
  }
  resetAfterAuth(navigation, profile);
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
