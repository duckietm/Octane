/**
 * Pure state machine of the official quiz window (HabboWayQuizController in
 * the AIR client), shared by the Habbo Way quiz and the safety quiz.
 *
 * Data sources, as in the official client:
 * - the server picks the question ids (QuizData packet, answer to
 *   GetQuizQuestions) and grades the answers (QuizResults packet, answer to
 *   PostQuizAnswers);
 * - the question, answer and explanation texts live in the localization under
 *   `quiz.<code>.question.<id>`, `quiz.<code>.answer.<id>.<n>` and
 *   `quiz.<code>.explanation.<id>.<n>`; the answers of a question are
 *   discovered by probing `n` from 0 until a text is missing.
 *
 * When the server never answers GetQuizQuestions the hook falls back to a
 * static session built from the same texts and graded locally with
 * `HABBO_WAY_STATIC_ANSWER_KEY`.
 */

import { TextLookup } from './habboWay';

export const HABBO_WAY_QUIZ_CODE = 'HabboWay1';
export const SAFETY_QUIZ_CODE = 'SafetyQuiz1';

/** Questions the official server hands out per Habbo Way quiz ("Get 5 out of 5"). */
export const HABBO_WAY_QUIZ_QUESTION_COUNT = 5;
export const QUIZ_MAX_DISCOVERED_ITEMS = 64;

export enum QuizPage {
    QUESTION = 1,
    SUCCESS = 2,
    FAILURE = 3,
    ANALYSIS = 4
}

export type RandomSource = () => number;

export interface QuizAnswerOption {
    id: number;
    text: string;
}

export interface QuizSession {
    quizCode: string;
    questionIds: number[];
    /** Chosen answer index per question position, null while unanswered. */
    answers: (number | null)[];
    /** Shuffled answer order per question position, filled lazily. */
    answerOrders: (number[] | null)[];
    currentQuestion: number;
    page: QuizPage;
    wrongQuestionIds: number[];
    /** False when the session was built from the static fallback and is graded locally. */
    fromServer: boolean;
}

export const getQuizLocalizationKey = (quizCode: string, suffix: string): string =>
    quizCode === HABBO_WAY_QUIZ_CODE ? `habbo.way.quiz.${suffix}` : `quiz.${quizCode}.${suffix}`;

export const getQuizQuestionKey = (quizCode: string, questionId: number): string => `quiz.${quizCode}.question.${questionId}`;

export const getQuizAnswerKey = (quizCode: string, questionId: number, answerId: number): string => `quiz.${quizCode}.answer.${questionId}.${answerId}`;

export const getQuizExplanationKey = (quizCode: string, questionId: number, answerId: number): string =>
    `quiz.${quizCode}.explanation.${questionId}.${answerId}`;

const readText = (lookup: TextLookup, key: string): string => {
    const value = lookup(key);

    return value && value !== key ? value : '';
};

/** The answers of a question, probed from the texts the way the official client does. */
export const discoverQuizAnswers = (quizCode: string, questionId: number, lookup: TextLookup): QuizAnswerOption[] => {
    const answers: QuizAnswerOption[] = [];

    for (let id = 0; id < QUIZ_MAX_DISCOVERED_ITEMS; id++) {
        const text = readText(lookup, getQuizAnswerKey(quizCode, questionId, id));

        if (!text.length) break;

        answers.push({ id, text });
    }

    return answers;
};

/** Every question id the texts know for a quiz (the server normally picks a subset). */
export const discoverQuizQuestionIds = (quizCode: string, lookup: TextLookup): number[] => {
    const ids: number[] = [];

    for (let id = 0; id < QUIZ_MAX_DISCOVERED_ITEMS; id++) {
        if (!readText(lookup, getQuizQuestionKey(quizCode, id)).length) break;

        ids.push(id);
    }

    return ids;
};

/** Random draw without replacement, as the official answer shuffle (splice at a random index). */
export const drawRandomOrder = (count: number, random: RandomSource = Math.random): number[] => {
    const pool = Array.from({ length: count }, (_, index) => index);
    const order: number[] = [];

    while (pool.length) order.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);

    return order;
};

/** Picks the question subset the server would send, from the ids the texts know. */
export const pickStaticQuizQuestions = (questionIds: number[], count: number, random: RandomSource = Math.random): number[] => {
    if (questionIds.length <= count) return [...questionIds];

    return drawRandomOrder(questionIds.length, random)
        .slice(0, count)
        .map((index) => questionIds[index]);
};

export const createQuizSession = (quizCode: string, questionIds: number[], fromServer: boolean): QuizSession => ({
    quizCode,
    questionIds: [...questionIds],
    answers: questionIds.map(() => null),
    answerOrders: questionIds.map(() => null),
    currentQuestion: 0,
    page: QuizPage.QUESTION,
    wrongQuestionIds: [],
    fromServer
});

export const getQuizQuestionCount = (session: QuizSession | null): number => (session ? session.questionIds.length : 0);

export const getCurrentQuizQuestionId = (session: QuizSession): number => session.questionIds[session.currentQuestion];

/** Whether the "next" button is live: the current question has an answer. */
export const canAdvanceQuizQuestion = (session: QuizSession): boolean => session.answers[session.currentQuestion] != null;

export const canGoBackQuizQuestion = (session: QuizSession): boolean => session.currentQuestion > 0;

export const isLastQuizQuestion = (session: QuizSession): boolean => session.currentQuestion >= session.questionIds.length - 1;

export const selectQuizAnswer = (session: QuizSession, answerId: number): QuizSession => {
    const answers = [...session.answers];

    answers[session.currentQuestion] = answerId;

    return { ...session, answers };
};

/**
 * Ensures the current question has a shuffled answer order (kept for the
 * whole session so going back shows the same order) and returns it.
 */
export const ensureQuizAnswerOrder = (session: QuizSession, answerCount: number, random: RandomSource = Math.random): QuizSession => {
    if (session.answerOrders[session.currentQuestion]) return session;

    const answerOrders = [...session.answerOrders];

    answerOrders[session.currentQuestion] = drawRandomOrder(answerCount, random);

    return { ...session, answerOrders };
};

/** Answer options of the current question in their shuffled display order. */
export const getOrderedQuizAnswers = (session: QuizSession, answers: QuizAnswerOption[]): QuizAnswerOption[] => {
    const order = session.answerOrders[session.currentQuestion];

    if (!order) return answers;

    return order.map((index) => answers[index]).filter((answer) => !!answer);
};

export interface QuizStepResult {
    session: QuizSession;
    /** True when stepping past the last question: the answers must be graded. */
    submit: boolean;
}

/** Official setCurrentQuestion: past the end submits, below zero is ignored. */
export const goToQuizQuestion = (session: QuizSession, index: number): QuizStepResult => {
    if (index >= session.questionIds.length) return { session, submit: true };
    if (index < 0) return { session, submit: false };

    return { session: { ...session, currentQuestion: index }, submit: false };
};

export const applyQuizResults = (session: QuizSession, wrongQuestionIds: number[]): QuizSession => ({
    ...session,
    wrongQuestionIds: [...wrongQuestionIds],
    page: wrongQuestionIds.length === 0 ? QuizPage.SUCCESS : QuizPage.FAILURE
});

export const showQuizAnalysis = (session: QuizSession): QuizSession => ({ ...session, page: QuizPage.ANALYSIS });

export const getQuizCorrectCount = (session: QuizSession): number => session.questionIds.length - session.wrongQuestionIds.length;

/** The answer the player gave to a question id (for the result review). */
export const getQuizGivenAnswer = (session: QuizSession, questionId: number): number | null => {
    const position = session.questionIds.indexOf(questionId);

    return position < 0 ? null : session.answers[position];
};

/** Answer ids (one per question, in question order) as posted to the server. */
export const getQuizAnswerIds = (session: QuizSession): number[] => session.answers.map((answer) => (answer == null ? -1 : answer));

/** Local grading for the static fallback: every question whose answer is not the keyed one is wrong. */
export const gradeQuizLocally = (session: QuizSession, answerKey: Readonly<Record<number, number>>): number[] =>
    session.questionIds.filter((questionId, position) => answerKey[questionId] !== session.answers[position]);

/**
 * Correct answer per `quiz.HabboWay1.question.<id>` of the official texts,
 * used only when the server does not grade. Inferred from the texts: the
 * explanation of a wrong answer scolds it, while the slot of the right answer
 * carries a joke the official client never shows.
 */
export const HABBO_WAY_STATIC_ANSWER_KEY: Readonly<Record<number, number>> = Object.freeze({
    0: 2, // betting room: call a moderator and find other games
    1: 1, // sell the furni in the marketplace
    2: 2, // ignore the trash talker
    3: 0, // show the five most beautiful rooms
    4: 1, // helpers help everyone for free
    5: 3, // the invite is a gesture of friendship
    6: 1, // laugh the prank off
    7: 3, // the kissing booth is innocent fun
    8: 0, // share opinions without insults
    9: 0 // call a moderator, it is harassment
});
