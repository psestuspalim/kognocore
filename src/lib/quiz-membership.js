// Names, descriptions and optional codes are not ownership identifiers.
// Only an explicit assignment can place a quiz in a subject.
export function quizBelongsToSubject(quiz, subject) {
  const quizSubject = String(quiz?.subject_id ?? '').trim();
  const subjectId = String(subject?.id ?? '').trim();
  return !!subjectId && !!quizSubject && quizSubject !== 'root' && quizSubject === subjectId;
}
