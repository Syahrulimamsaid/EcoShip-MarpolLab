/** Fisher-Yates shuffle — returns a new array, leaves the input untouched. */
export function shuffled<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

/** Shared shape every quiz question type (QuizScene's QuizQuestion,
 * StabilitasQuiz's StabilitasQuizQuestion, ...) has in common — enough to
 * shuffle option order while keeping correctIndex pointing at the right
 * option. */
interface ShufflableQuestion {
    options: string[];
    correctIndex: number;
}

/** Re-orders one question's options, remapping correctIndex to match. */
export function shuffleQuestionOptions<Q extends ShufflableQuestion>(question: Q): Q {
    const order = shuffled(question.options.map((_, index) => index));
    return {
        ...question,
        options: order.map((originalIndex) => question.options[originalIndex]),
        correctIndex: order.indexOf(question.correctIndex),
    };
}

/** Shuffles both question order and each question's option order — a fresh
 * shuffle every call, so memorizing "the 2nd question" or "the 1st option"
 * never pays off across attempts. */
export function shuffleQuestions<Q extends ShufflableQuestion>(questions: Q[]): Q[] {
    return shuffled(questions).map(shuffleQuestionOptions);
}
