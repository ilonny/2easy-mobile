import {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useAuth} from '../../../entities/session';
import {
  getLessonCoverSource,
  isTeacherLessonAccessBlocked,
  type Lesson,
} from '../../../entities/lesson';
import {fetchMainPageLessons} from '../../lesson-plans/api/lessonsApi';
import {useSubscription} from '../model/useSubscription';
import {colors, radii} from '../../../shared/config/theme';
import {SmartImage} from '../../../shared/ui';
import type {RootStackParamList} from '../../../shared/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function LessonsCarousel() {
  const navigation = useNavigation<Nav>();
  const {isAuthorized, profile} = useAuth();
  const {hasSubscription, subscription, loading: subLoading} = useSubscription();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [handVisible, setHandVisible] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetchMainPageLessons();
        if (mounted) {
          setLessons(res.lessons ?? []);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setHandVisible(v => !v), 1000);
    return () => clearInterval(id);
  }, []);

  const openLesson = (lesson: Lesson) => {
    if (!isAuthorized) {
      return;
    }
    const isStudent = !!profile?.isStudent;
    if (subLoading) {
      return;
    }
    if (
      isTeacherLessonAccessBlocked(lesson, {
        isStudent,
        hasSubscription,
        isFreeTariff: subscription?.subscribe_type_id === 1,
      })
    ) {
      navigation.navigate('Subscription');
      return;
    }
    const isTeacher = profile?.role_id === 1 || profile?.role_id === 2;
    navigation.navigate('MainTabs', {
      screen: 'Lessons',
      params: {
        screen: isTeacher ? 'LessonEditor' : 'LessonViewer',
        params: isTeacher
          ? {lessonId: lesson.id}
          : {lessonId: lesson.id, from: 'Lessons'},
      },
    } as never);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={188}
        contentContainerStyle={styles.row}>
        {lessons.map(lesson => {
          return (
            <Pressable
              key={lesson.id}
              style={styles.card}
              onPress={() => openLesson(lesson)}>
              <View style={styles.imageWrap}>
                <SmartImage
                  source={getLessonCoverSource(lesson.image_path)}
                  style={styles.image}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.title} numberOfLines={2}>
                {lesson.title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Image
        source={require('../../../shared/assets/home/hand.png')}
        style={[styles.hand, {opacity: handVisible ? 1 : 0}]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  loading: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    gap: 12,
    paddingBottom: 8,
  },
  card: {
    width: 176,
    gap: 8,
  },
  imageWrap: {
    width: 176,
    aspectRatio: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    lineHeight: 17,
  },
  hand: {
    position: 'absolute',
    right: 4,
    bottom: 0,
    width: 40,
    height: 40,
  },
});
