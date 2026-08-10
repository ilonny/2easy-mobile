export type AppNavItem = {
  id: string;
  labelKey:
    | 'header.lessonPlans'
    | 'header.speakingGames'
    | 'header.discussionCards'
    | 'header.grammar'
    | 'header.subscription'
    | 'header.tutorial';
  route:
    | 'Lessons'
    | 'SpeakingGames'
    | 'DiscussionCards'
    | 'Grammar'
    | 'Subscription'
    | 'Tutorial';
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    id: 'lessonPlans',
    labelKey: 'header.lessonPlans',
    route: 'Lessons',
  },
  {
    id: 'speakingGames',
    labelKey: 'header.speakingGames',
    route: 'SpeakingGames',
  },
  {
    id: 'discussionCards',
    labelKey: 'header.discussionCards',
    route: 'DiscussionCards',
  },
  {
    id: 'grammar',
    labelKey: 'header.grammar',
    route: 'Grammar',
  },
  {
    id: 'subscription',
    labelKey: 'header.subscription',
    route: 'Subscription',
  },
  {
    id: 'tutorial',
    labelKey: 'header.tutorial',
    route: 'Tutorial',
  },
];
