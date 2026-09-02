export type TrainingMode = 'cards' | 'quizOptions' | 'quizInput';

export function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function normalizeTrainingAnswer(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ');
}

export function answersMatch(userAnswer: string, correctAnswer: string) {
  return (
    normalizeTrainingAnswer(userAnswer) ===
    normalizeTrainingAnswer(correctAnswer)
  );
}

export function buildQuizOptions(
  correctAnswer: string,
  pool: string[],
  optionCount = 4,
): string[] {
  const uniquePool = Array.from(
    new Set(pool.map(item => item.trim()).filter(Boolean)),
  );
  const distractors = shuffleArray(
    uniquePool.filter(
      item =>
        normalizeTrainingAnswer(item) !==
        normalizeTrainingAnswer(correctAnswer),
    ),
  ).slice(0, Math.max(0, optionCount - 1));

  return shuffleArray([correctAnswer, ...distractors]);
}
