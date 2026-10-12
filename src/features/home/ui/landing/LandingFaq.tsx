import {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {useI18n} from '../../../../shared/i18n';
import {useLayout} from '../../../../shared/lib/layout';
import {landing} from './landingTheme';

const QUESTIONS = ['card', 'autoCharge', 'limits', 'included', 'help'] as const;

export function LandingFaq() {
  const {t} = useI18n();
  const {isTablet, pageGutter} = useLayout();
  const [opened, setOpened] = useState<string | null>('autoCharge');

  return (
    <View style={[styles.root, {paddingHorizontal: pageGutter}]}>
      <Text style={[styles.title, isTablet && styles.titleTablet]}>
        {t('landing.faq.title')}
      </Text>
      <View style={styles.list}>
        {QUESTIONS.map(id => {
          const isOpen = opened === id;
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{expanded: isOpen}}
              onPress={() => setOpened(isOpen ? null : id)}
              style={[styles.item, isTablet && styles.itemTablet]}>
              <View style={styles.textCol}>
                <Text style={[styles.question, isTablet && styles.questionTablet]}>
                  {t(`landing.faq.${id}Q`)}
                </Text>
                {isOpen ? (
                  <Text style={[styles.answer, isTablet && styles.answerTablet]}>
                    {t(`landing.faq.${id}A`)}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.plus, isOpen && styles.plusOpen]}>
                <Text style={[styles.plusText, isOpen && styles.plusTextOpen]}>
                  +
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 25,
    fontWeight: '700',
    color: landing.black,
    letterSpacing: -0.25,
  },
  titleTablet: {
    fontSize: 36,
  },
  list: {
    width: '100%',
    maxWidth: 650,
    gap: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    backgroundColor: landing.gray,
    borderRadius: 12,
    padding: 15,
  },
  itemTablet: {
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 20,
    gap: 40,
  },
  textCol: {
    flex: 1,
    gap: 12,
    minHeight: 30,
    justifyContent: 'center',
  },
  question: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    color: landing.black,
    letterSpacing: -0.1,
  },
  questionTablet: {
    fontSize: 16,
    lineHeight: 22,
  },
  answer: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    color: landing.grayFont,
    letterSpacing: -0.1,
  },
  answerTablet: {
    fontSize: 16,
    lineHeight: 21,
  },
  plus: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: landing.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusOpen: {
    backgroundColor: landing.violet,
  },
  plusText: {
    fontSize: 20,
    fontWeight: '600',
    color: landing.black,
    marginTop: -2,
  },
  plusTextOpen: {
    color: landing.white,
    transform: [{rotate: '45deg'}],
  },
});
