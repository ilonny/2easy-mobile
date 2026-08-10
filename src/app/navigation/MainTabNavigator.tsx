import {Platform, Text, View} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuth} from '../../entities/session';
import {useI18n} from '../../shared/i18n';
import {colors} from '../../shared/config/theme';
import {fontFamily} from '../../shared/config/fonts';
import {ProfilePage} from '../../pages/profile/ui/ProfilePage';
import {LessonsStackNavigator} from './LessonsStackNavigator';
import {StudentsStackNavigator} from './StudentsStackNavigator';
import type {MainTabParamList} from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_EMOJI = {
  Lessons: '📚',
  Students: '🧑‍🎓',
  Profile: '👤',
} as const;

function TabIcon({
  emoji,
  focused,
}: {
  emoji: string;
  focused: boolean;
}) {
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        height: 28,
        marginTop: 2,
      }}>
      <Text
        style={{
          fontSize: 22,
          lineHeight: 26,
          opacity: focused ? 1 : 0.55,
          fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        }}>
        {emoji}
      </Text>
    </View>
  );
}

function TabLabel({label, focused}: {label: string; focused: boolean}) {
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
      style={{
        fontFamily: focused ? fontFamily.bold : fontFamily.semiBold,
        fontSize: 11,
        color: focused ? colors.primary : colors.muted,
        textAlign: 'center',
        marginTop: 2,
        paddingHorizontal: 2,
      }}>
      {label}
    </Text>
  );
}

export function MainTabNavigator() {
  const {t} = useI18n();
  const {profile} = useAuth();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8);
  const tabBarHeight = 52 + bottom;
  const isStudent = !!profile?.isStudent;

  return (
    <Tab.Navigator
      initialRouteName={isStudent ? 'Students' : 'Lessons'}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingTop: 6,
          paddingBottom: bottom,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
        tabBarLabelPosition: 'below-icon',
      }}>
      <Tab.Screen
        name="Lessons"
        component={LessonsStackNavigator}
        options={{
          tabBarButton: isStudent ? () => null : undefined,
          tabBarItemStyle: isStudent ? {display: 'none'} : undefined,
          tabBarAccessibilityLabel: t('profile.lessonsAndCourses'),
          tabBarLabel: ({focused}) => (
            <TabLabel
              label={t('profile.lessonsAndCourses')}
              focused={focused}
            />
          ),
          tabBarIcon: ({focused}) => (
            <TabIcon emoji={TAB_EMOJI.Lessons} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Students"
        component={StudentsStackNavigator}
        options={{
          tabBarAccessibilityLabel: isStudent
            ? t('students.cabinetTab')
            : t('profile.myStudents'),
          tabBarLabel: ({focused}) => (
            <TabLabel
              label={
                isStudent ? t('students.cabinetTab') : t('profile.myStudents')
              }
              focused={focused}
            />
          ),
          tabBarIcon: ({focused}) => (
            <TabIcon emoji={TAB_EMOJI.Students} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfilePage}
        options={{
          tabBarButton: isStudent ? () => null : undefined,
          tabBarItemStyle: isStudent ? {display: 'none'} : undefined,
          tabBarAccessibilityLabel: t('profile.profileLabel'),
          tabBarLabel: ({focused}) => (
            <TabLabel label={t('profile.profileLabel')} focused={focused} />
          ),
          tabBarIcon: ({focused}) => (
            <TabIcon emoji={TAB_EMOJI.Profile} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
