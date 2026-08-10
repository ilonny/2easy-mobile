import type {ImageSourcePropType} from 'react-native';

import {images as bingo} from './packs/bingo';
import {byTab as tabooTabs, images as tabooAll} from './packs/taboo';
import {images as neverHaveIEver} from './packs/never-have-i-ever';
import {images as wouldYouRather} from './packs/would-you-rather';
import {images as wouldYouRatherSummer} from './packs/would-you-rather-summer';
import {images as ifYouCould} from './packs/if-you-could';
import {byTab as nameThreeTabs, images as nameThreeAll} from './packs/name-three';
import {byTab as discussionTabs, images as discussionAll} from './packs/discussion-cards';
import {images as controversial} from './packs/controversial';
import {images as firstMeeting} from './packs/first-meeting';
import {clips as whatHappensNext} from './packs/what-happens-next';
import {clips as whatHappensNextFilms} from './packs/what-happens-next-films';

export type ContentSlug =
  | 'bingo'
  | 'taboo'
  | 'never_have_i_ever'
  | 'would_you_rather'
  | 'if_you_could'
  | 'what_happens_next'
  | 'what_happens_next_films'
  | 'name_three'
  | 'discussion_cards'
  | 'controversial_statements'
  | 'first_meeting';

export type ContentTab = {
  key: string;
  label: string;
  images?: ImageSourcePropType[];
};

export type ContentPack =
  | {
      kind: 'cards';
      titleKey: string;
      howToKey: string;
      tabs: ContentTab[];
    }
  | {
      kind: 'youtube';
      titleKey: string;
      howToKey: string;
      clips: {id: number; shortId: string; fullId: string}[];
    };

function tabEntries(
  byTab: Record<string, ImageSourcePropType[]>,
  labels: Record<string, string>,
  fallback: ImageSourcePropType[],
): ContentTab[] {
  const keys = Object.keys(byTab);
  if (!keys.length || (keys.length === 1 && keys[0] === 'all')) {
    return [{key: 'all', label: 'All', images: fallback}];
  }
  return keys.map(key => ({
    key,
    label: labels[key] || key.toUpperCase(),
    images: byTab[key],
  }));
}

export const CONTENT_PACKS: Record<ContentSlug, ContentPack> = {
  bingo: {
    kind: 'cards',
    titleKey: 'games.bingo.title',
    howToKey: 'games.bingo.description',
    tabs: [{key: 'all', label: 'Bingo', images: bingo}],
  },
  taboo: {
    kind: 'cards',
    titleKey: 'games.taboo.title',
    howToKey: 'games.taboo.description',
    tabs: tabEntries(
      tabooTabs,
      {a1: 'A1 – A2', b1: 'B1 – B2', slang: 'B1 – B2, slang'},
      tabooAll,
    ),
  },
  never_have_i_ever: {
    kind: 'cards',
    titleKey: 'games.neverHaveIEver.title',
    howToKey: 'games.neverHaveIEver.description',
    tabs: [{key: 'all', label: 'Cards', images: neverHaveIEver}],
  },
  would_you_rather: {
    kind: 'cards',
    titleKey: 'games.wouldYouRather.title',
    howToKey: 'games.wouldYouRather.description',
    tabs: [
      {key: 'main', label: 'Cards', images: wouldYouRather},
      {key: 'summer', label: 'Summer', images: wouldYouRatherSummer},
    ],
  },
  if_you_could: {
    kind: 'cards',
    titleKey: 'games.ifYouCould.title',
    howToKey: 'games.ifYouCould.description',
    tabs: [{key: 'all', label: 'Cards', images: ifYouCould}],
  },
  name_three: {
    kind: 'cards',
    titleKey: 'games.nameThree.title',
    howToKey: 'games.nameThree.description',
    tabs: tabEntries(
      nameThreeTabs,
      {a1: 'A1 – A2', b1: 'B1 – B2'},
      nameThreeAll,
    ),
  },
  what_happens_next: {
    kind: 'youtube',
    titleKey: 'games.whatHappensNext.title',
    howToKey: 'games.whatHappensNext.description',
    clips: whatHappensNext,
  },
  what_happens_next_films: {
    kind: 'youtube',
    titleKey: 'games.whatHappensNextFilms.title',
    howToKey: 'games.whatHappensNextFilms.description',
    clips: whatHappensNextFilms,
  },
  discussion_cards: {
    kind: 'cards',
    titleKey: 'games.discussionCards.title',
    howToKey: 'games.discussionCards.description',
    tabs: tabEntries(
      discussionTabs,
      Object.fromEntries(
        Object.keys(discussionTabs).map(k => [
          k,
          k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        ]),
      ),
      discussionAll,
    ),
  },
  controversial_statements: {
    kind: 'cards',
    titleKey: 'games.controversial.title',
    howToKey: 'games.controversial.description',
    tabs: [{key: 'all', label: 'Cards', images: controversial}],
  },
  first_meeting: {
    kind: 'cards',
    titleKey: 'games.firstMeeting.title',
    howToKey: 'games.firstMeeting.description',
    tabs: [{key: 'all', label: 'Cards', images: firstMeeting}],
  },
};

export function slugFromWebPath(webPath: string): ContentSlug | null {
  const map: Record<string, ContentSlug> = {
    '/speaking_games/bingo': 'bingo',
    '/speaking_games/taboo': 'taboo',
    '/speaking_games/never_have_i_ever': 'never_have_i_ever',
    '/speaking_games/would_you_rather': 'would_you_rather',
    '/speaking_games/if_you_could': 'if_you_could',
    '/speaking_games/what_happens_next': 'what_happens_next',
    '/speaking_games/what_happens_next_films': 'what_happens_next_films',
    '/speaking_games/name_three': 'name_three',
    '/cards/discussion_cards': 'discussion_cards',
    '/cards/controversial_statements': 'controversial_statements',
    '/cards/first_meeting': 'first_meeting',
  };
  return map[webPath] ?? null;
}

const DISCUSSION_SLUGS = new Set<ContentSlug>([
  'discussion_cards',
  'controversial_statements',
  'first_meeting',
]);

/** Parent catalog section for ContentPlayer breadcrumbs. */
export function parentSectionForSlug(
  slug: ContentSlug,
): 'SpeakingGames' | 'DiscussionCards' {
  return DISCUSSION_SLUGS.has(slug) ? 'DiscussionCards' : 'SpeakingGames';
}
