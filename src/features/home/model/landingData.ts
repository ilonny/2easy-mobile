import type {ImageSourcePropType} from 'react-native';

import type {ContentSlug} from '../../catalog/model/contentRegistry';
import type {LandingTagTone} from '../ui/landing/landingTheme';

export type ContentTab =
  | 'lessons'
  | 'courses'
  | 'speaking'
  | 'discussion'
  | 'grammar';

export type LandingCard = {
  id: string;
  title?: string;
  titleKey?: string;
  description?: string;
  descriptionKey?: string;
  image?: ImageSourcePropType | {uri: string};
  count?: number | string;
  countKey?: string;
  isVideo?: boolean;
  topic?: string;
  level?: string;
  levelTone?: LandingTagTone;
  slug?: ContentSlug;
  lessonId?: number;
  courseId?: number;
  locked?: boolean;
};

export const contentCategories: {
  tab: ContentTab;
  titleKey: string;
  images: [ImageSourcePropType, ImageSourcePropType, ImageSourcePropType];
}[] = [
  {
    tab: 'lessons',
    titleKey: 'landing.content.catLessons',
    images: [
      require('../../../shared/assets/landing/content/cat_lessons_1.jpg'),
      require('../../../shared/assets/landing/content/cat_lessons_2.jpg'),
      require('../../../shared/assets/landing/content/cat_lessons_3.jpg'),
    ],
  },
  {
    tab: 'courses',
    titleKey: 'landing.content.catCourses',
    images: [
      require('../../../shared/assets/landing/content/cat_courses_1.jpg'),
      require('../../../shared/assets/landing/content/cat_courses_2.jpg'),
      require('../../../shared/assets/landing/content/cat_courses_3.jpg'),
    ],
  },
  {
    tab: 'speaking',
    titleKey: 'landing.content.catSpeaking',
    images: [
      require('../../../shared/assets/landing/content/cat_speaking_1.jpg'),
      require('../../../shared/assets/landing/content/cat_speaking_2.jpg'),
      require('../../../shared/assets/landing/content/cat_speaking_3.jpg'),
    ],
  },
  {
    tab: 'discussion',
    titleKey: 'landing.content.catDiscussion',
    images: [
      require('../../../shared/assets/landing/content/cat_discussion_1.jpg'),
      require('../../../shared/assets/landing/content/cat_discussion_2.jpg'),
      require('../../../shared/assets/landing/content/cat_discussion_3.jpg'),
    ],
  },
  {
    tab: 'grammar',
    titleKey: 'landing.content.catGrammar',
    images: [
      require('../../../shared/assets/landing/content/cat_grammar_1.jpg'),
      require('../../../shared/assets/landing/content/cat_grammar_2.jpg'),
      require('../../../shared/assets/landing/content/cat_grammar_3.jpg'),
    ],
  },
];

export const speakingLandingCards: LandingCard[] = [
  {
    id: 'never',
    title: 'Never have I ever',
    descriptionKey: 'landing.content.neverDesc',
    image: require('../../../shared/assets/landing/content/game_never.jpg'),
    count: 130,
    countKey: 'landing.content.cardsCount',
    level: 'A2-B2',
    levelTone: 'mint',
    slug: 'never_have_i_ever',
  },
  {
    id: 'taboo',
    title: 'Taboo game',
    descriptionKey: 'landing.content.tabooDesc',
    image: require('../../../shared/assets/landing/content/game_taboo.jpg'),
    count: 90,
    countKey: 'landing.content.cardsCount',
    level: 'A2-B2+ SLANG',
    levelTone: 'blue',
    slug: 'taboo',
  },
  {
    id: 'next',
    title: 'What happens next',
    descriptionKey: 'landing.content.nextDesc',
    image: require('../../../shared/assets/landing/content/game_next.jpg'),
    count: 30,
    countKey: 'landing.content.videosCount',
    isVideo: true,
    level: 'A2-B2',
    levelTone: 'mint',
    slug: 'what_happens_next',
  },
  {
    id: 'rather',
    title: 'Would you rather',
    descriptionKey: 'landing.content.ratherDesc',
    image: require('../../../shared/assets/landing/content/game_rather.jpg'),
    count: 50,
    countKey: 'landing.content.cardsCount',
    level: 'A2+',
    levelTone: 'green',
    slug: 'would_you_rather',
  },
  {
    id: 'bingo',
    title: 'Bingo',
    descriptionKey: 'landing.content.bingoDesc',
    image: require('../../../shared/assets/landing/content/game_bingo.jpg'),
    count: 5,
    countKey: 'landing.content.cardsCount',
    level: 'A2+',
    levelTone: 'green',
    slug: 'bingo',
  },
  {
    id: 'name',
    title: 'Name three',
    descriptionKey: 'landing.content.nameThreeDesc',
    image: require('../../../shared/assets/landing/content/game_name_three.jpg'),
    count: 90,
    countKey: 'landing.content.cardsCount',
    level: 'A2+',
    levelTone: 'green',
    slug: 'name_three',
  },
  {
    id: 'if',
    title: 'If you could',
    descriptionKey: 'landing.content.ifYouCouldDesc',
    image: require('../../../shared/assets/landing/content/game_if_you_could.jpg'),
    count: 30,
    countKey: 'landing.content.cardsCount',
    level: 'A2+',
    levelTone: 'green',
    slug: 'if_you_could',
  },
];

export const discussionLandingMeta: Record<
  string,
  {count: string; level: string; slug: ContentSlug; image: ImageSourcePropType}
> = {
  'games.discussionCards': {
    count: '140+',
    level: 'A2+',
    slug: 'discussion_cards',
    image: require('../../../shared/assets/cards/discussion-cards.png'),
  },
  'games.controversial': {
    count: '30',
    level: 'A2+',
    slug: 'controversial_statements',
    image: require('../../../shared/assets/cards/controversial.png'),
  },
  'games.firstMeeting': {
    count: '30',
    level: 'A2+',
    slug: 'first_meeting',
    image: require('../../../shared/assets/cards/first-meeting.png'),
  },
};

export const heroCards = [
  {
    titleKey: 'landing.hero.cardTemplates',
    image: require('../../../shared/assets/landing/hero/card_templates.jpg'),
    lightText: true,
  },
  {
    titleKey: 'landing.hero.cardIntegrations',
    image: require('../../../shared/assets/landing/hero/card_integrations.jpg'),
    lightText: false,
  },
  {
    titleKey: 'landing.hero.cardCourses',
    image: require('../../../shared/assets/landing/hero/card_courses.jpg'),
    video: require('../../../shared/assets/landing/video/hero-courses.mp4'),
    lightText: false,
  },
  {
    titleKey: 'landing.hero.cardAi',
    image: require('../../../shared/assets/landing/hero/card_ai.jpg'),
    lightText: false,
  },
  {
    titleKey: 'landing.hero.cardBoards',
    image: require('../../../shared/assets/landing/hero/card_boards.jpg'),
    video: require('../../../shared/assets/landing/video/hero-boards.mp4'),
    lightText: false,
  },
] as const;

export const prepFeatures = [
  {
    titleKey: 'landing.prep.builder',
    image: require('../../../shared/assets/landing/prep/builder.jpg'),
    video: require('../../../shared/assets/landing/video/prep-builder.mp4'),
  },
  {
    titleKey: 'landing.prep.readyLessons',
    image: require('../../../shared/assets/landing/prep/ready_lessons.jpg'),
  },
  {
    titleKey: 'landing.prep.share',
    image: require('../../../shared/assets/landing/prep/share.jpg'),
    video: require('../../../shared/assets/landing/video/prep-share.mp4'),
  },
  {
    titleKey: 'landing.prep.ai',
    image: require('../../../shared/assets/landing/prep/ai.jpg'),
  },
] as const;

export const deliveryFeatures = [
  {
    titleKey: 'landing.delivery.dictionary',
    image: require('../../../shared/assets/landing/delivery/dictionary.jpg'),
  },
  {
    titleKey: 'landing.delivery.board',
    image: require('../../../shared/assets/landing/delivery/board.jpg'),
  },
  {
    titleKey: 'landing.delivery.services',
    image: require('../../../shared/assets/landing/delivery/services.jpg'),
  },
  {
    titleKey: 'landing.delivery.videoCall',
    image: require('../../../shared/assets/landing/delivery/video.jpg'),
    video: require('../../../shared/assets/landing/video/delivery-videocall.mp4'),
  },
  {
    titleKey: 'landing.delivery.chat',
    image: require('../../../shared/assets/landing/delivery/chat.jpg'),
  },
] as const;

export const reviewFeatures = [
  {
    titleKey: 'landing.review.builder',
    image: require('../../../shared/assets/landing/review/builder.jpg'),
    video: require('../../../shared/assets/landing/video/review-builder.mp4'),
  },
  {
    titleKey: 'landing.review.autocheck',
    descKey: 'landing.review.autocheckDesc',
    image: require('../../../shared/assets/landing/review/autocheck.jpg'),
    video: require('../../../shared/assets/landing/video/review-autocheck.mp4'),
  },
  {
    titleKey: 'landing.review.realtime',
    image: require('../../../shared/assets/landing/review/realtime.jpg'),
    video: require('../../../shared/assets/landing/video/review-realtime.mp4'),
  },
  {
    titleKey: 'landing.review.feedback',
    image: require('../../../shared/assets/landing/review/feedback.jpg'),
    video: require('../../../shared/assets/landing/video/review-feedback.mp4'),
  },
] as const;

export const tryFreeImages: Record<ContentTab, ImageSourcePropType> = {
  speaking: require('../../../shared/assets/landing/content/try_free.jpg'),
  lessons: require('../../../shared/assets/landing/content/try_free_lessons.jpg'),
  courses: require('../../../shared/assets/landing/content/try_free_courses.jpg'),
  discussion: require('../../../shared/assets/landing/content/try_free_discussion.jpg'),
  grammar: require('../../../shared/assets/landing/content/try_free_grammar.jpg'),
};

export const tryFreeTitleKeys: Record<ContentTab, string> = {
  speaking: 'landing.content.tryTitle',
  lessons: 'landing.content.tryTitleTrial',
  courses: 'landing.content.tryTitleCourses',
  discussion: 'landing.content.tryTitleTrial',
  grammar: 'landing.content.tryTitleTrial',
};

export const GRAMMAR_COURSE_ID = 92;
export const CARDS_LIMIT = 8;
export const CARDS_LIMIT_WITH_TRY = 7;
