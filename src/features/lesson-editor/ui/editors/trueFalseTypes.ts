export type TrueFalseAnswer = boolean;

export type TrueFalseSentence = {
  id: string;
  text: string;
  /** Correct answer for the student */
  answer: TrueFalseAnswer;
};

export type TrueFalseData = {
  id?: number;
  sortIndex?: number;
  title?: string;
  titleColor?: string;
  subtitle?: string;
  description?: string;
  images?: Array<Record<string, string>>;
  sentences: TrueFalseSentence[];
};

export function isTrueFalseSentenceValid(s: {
  text?: string;
  answer?: unknown;
}): boolean {
  if (!String(s?.text || '').trim()) {
    return false;
  }
  return typeof s?.answer === 'boolean';
}
