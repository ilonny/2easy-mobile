export type TTemplate = {
  type: string;
  titleKey: string;
  titleDefault?: string;
  descriptionKey?: string;
  descriptionDefault?: string;
  subItems?: TTemplate[];
};

/** Create-flow templates (no legacy fill-gaps). Types only — no images. */
export const templates: TTemplate[] = [
  {
    type: 'text',
    titleKey: 'templates.text',
    titleDefault: 'Text',
    descriptionKey: 'templates.textDesc',
    descriptionDefault: 'Articles, questions and other text blocks',
    subItems: [
      {
        type: 'text-default',
        titleKey: 'templates.text',
        titleDefault: 'Text',
      },
      {
        type: 'text-2-col',
        titleKey: 'templates.text2Col',
        titleDefault: 'Text in 2 columns',
      },
      {
        type: 'text-sticker',
        titleKey: 'templates.textSticker',
        titleDefault: 'Text on stickers',
      },
      {
        type: 'text-checklist',
        titleKey: 'templates.textChecklist',
        titleDefault: 'Checklist',
      },
    ],
  },
  {
    type: 'image',
    titleKey: 'templates.images',
    titleDefault: 'Images',
    descriptionKey: 'templates.imagesDesc',
    descriptionDefault: 'jpg, png, gif, webp',
  },
  {
    type: 'video',
    titleKey: 'templates.video',
    titleDefault: 'Video',
    descriptionKey: 'templates.videoDesc',
    descriptionDefault: 'Embed or URL',
  },
  {
    type: 'audio',
    titleKey: 'templates.audio',
    titleDefault: 'Audio',
    descriptionKey: 'templates.audioDesc',
    descriptionDefault: 'mp3, wav, m4a / URL',
  },
  {
    type: 'note',
    titleKey: 'templates.note',
    titleDefault: 'Note',
    descriptionKey: 'templates.noteDesc',
    descriptionDefault: 'For teachers only',
  },
  {
    type: 'FILL_GAPS_NEW',
    titleKey: 'templates.fillGapsNew',
    titleDefault: 'Fill the gaps',
    descriptionKey: 'templates.fillGapsNewDesc',
    descriptionDefault: 'Gaps with options and three modes',
  },
  {
    type: 'match_words',
    titleKey: 'templates.match',
    titleDefault: 'Match',
    descriptionKey: 'templates.matchDesc',
    descriptionDefault: 'Match words with definitions or images',
    subItems: [
      {
        type: 'match-word-word',
        titleKey: 'templates.matchWordWord',
        titleDefault: 'Match word–definition',
      },
      {
        type: 'match-word-image',
        titleKey: 'templates.matchWordImage',
        titleDefault: 'Match word–image',
      },
      {
        type: 'match-word-column',
        titleKey: 'templates.matchWordColumn',
        titleDefault: 'Sort words into columns',
      },
    ],
  },
  {
    type: 'test',
    titleKey: 'templates.test',
    titleDefault: 'Test',
    descriptionKey: 'templates.testDesc',
    descriptionDefault: 'Choose the correct option',
  },
  {
    type: 'free-input-form',
    titleKey: 'templates.freeInput',
    titleDefault: 'Free text input',
    descriptionKey: 'templates.freeInputDesc',
    descriptionDefault: 'Empty field for student answers',
  },
  {
    type: 'int',
    titleKey: 'templates.integrations',
    titleDefault: 'Integrations',
    descriptionKey: 'templates.integrationsDesc',
    descriptionDefault: 'Miro, Wordwall, Genially, Quizlet, etc.',
  },
];

/** Includes create templates + legacy fill-gaps types used in existing lessons. */
const TYPE_META: Record<string, {titleKey: string; titleDefault: string}> = {
  'text-default': {titleKey: 'templates.text', titleDefault: 'Text'},
  'text-2-col': {
    titleKey: 'templates.text2Col',
    titleDefault: 'Text in 2 columns',
  },
  'text-sticker': {
    titleKey: 'templates.textSticker',
    titleDefault: 'Text on stickers',
  },
  'text-checklist': {
    titleKey: 'templates.textChecklist',
    titleDefault: 'Checklist',
  },
  image: {titleKey: 'templates.images', titleDefault: 'Images'},
  video: {titleKey: 'templates.video', titleDefault: 'Video'},
  audio: {titleKey: 'templates.audio', titleDefault: 'Audio'},
  note: {titleKey: 'templates.note', titleDefault: 'Note'},
  FILL_GAPS_NEW: {
    titleKey: 'templates.fillGapsNew',
    titleDefault: 'Fill the gaps',
  },
  'fill-gaps-drag': {
    titleKey: 'templates.fillGapsDrag',
    titleDefault: 'Drag word from list',
  },
  'fill-gaps-select': {
    titleKey: 'templates.fillGapsSelect',
    titleDefault: 'Select option from list',
  },
  'fill-gaps-input': {
    titleKey: 'templates.fillGapsInput',
    titleDefault: 'Type word in gap',
  },
  'match-word-word': {
    titleKey: 'templates.matchWordWord',
    titleDefault: 'Match word–definition',
  },
  'match-word-image': {
    titleKey: 'templates.matchWordImage',
    titleDefault: 'Match word–image',
  },
  'match-word-column': {
    titleKey: 'templates.matchWordColumn',
    titleDefault: 'Sort words into columns',
  },
  test: {titleKey: 'templates.test', titleDefault: 'Test'},
  'free-input-form': {
    titleKey: 'templates.freeInput',
    titleDefault: 'Free text input',
  },
  int: {titleKey: 'templates.integrations', titleDefault: 'Integrations'},
};

export function getExerciseTypeLabel(
  type: string,
  t: (key: string) => string,
): string {
  const meta = TYPE_META[type];
  if (!meta) {
    return type;
  }
  const translated = t(meta.titleKey);
  return translated === meta.titleKey ? meta.titleDefault : translated;
}
