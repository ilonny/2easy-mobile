import type {ImageSourcePropType} from 'react-native';

export type TutorialCard = {
  id: number;
  titleKey: string;
  descKey: string;
  lessonId: number;
  image: ImageSourcePropType;
};

export const tutorialCatalog: TutorialCard[] = [
  {
    id: 1,
    titleKey: 'tutorial.lessonBuilderTitle',
    descKey: 'tutorial.lessonBuilderDesc',
    lessonId: 910,
    image: require('../../../shared/assets/tutorial/1.png'),
  },
  {
    id: 2,
    titleKey: 'tutorial.studentAccountsTitle',
    descKey: 'tutorial.studentAccountsDesc',
    lessonId: 860,
    image: require('../../../shared/assets/tutorial/2.png'),
  },
  {
    id: 3,
    titleKey: 'tutorial.howToStartTitle',
    descKey: 'tutorial.howToStartDesc',
    lessonId: 901,
    image: require('../../../shared/assets/tutorial/3.png'),
  },
  {
    id: 4,
    titleKey: 'tutorial.lessonModeTitle',
    descKey: 'tutorial.lessonModeDesc',
    lessonId: 907,
    image: require('../../../shared/assets/tutorial/4.png'),
  },
  {
    id: 5,
    titleKey: 'tutorial.editLessonsTitle',
    descKey: 'tutorial.editLessonsDesc',
    lessonId: 908,
    image: require('../../../shared/assets/tutorial/5.png'),
  },
  {
    id: 6,
    titleKey: 'tutorial.homeworkTitle',
    descKey: 'tutorial.homeworkDesc',
    lessonId: 909,
    image: require('../../../shared/assets/tutorial/6.png'),
  },
];
