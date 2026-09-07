import { describe, expect, it } from 'vitest';
import {
    applyQuizResults,
    canAdvanceQuizQuestion,
    createQuizSession,
    discoverQuizAnswers,
    discoverQuizQuestionIds,
    drawRandomOrder,
    ensureQuizAnswerOrder,
    getOrderedQuizAnswers,
    getQuizAnswerIds,
    getQuizCorrectCount,
    getQuizGivenAnswer,
    getQuizLocalizationKey,
    goToQuizQuestion,
    gradeQuizLocally,
    HABBO_WAY_QUIZ_CODE,
    HABBO_WAY_STATIC_ANSWER_KEY,
    pickStaticQuizQuestions,
    QuizPage,
    selectQuizAnswer,
    showQuizAnalysis
} from './habboWayQuiz';

/** Texts of a three-question quiz with two or three answers each; a missing key echoes the key. */
const texts: Record<string, string> = {
    'quiz.HabboWay1.question.0': 'q0',
    'quiz.HabboWay1.answer.0.0': 'a00',
    'quiz.HabboWay1.answer.0.1': 'a01',
    'quiz.HabboWay1.answer.0.2': 'a02',
    'quiz.HabboWay1.question.1': 'q1',
    'quiz.HabboWay1.answer.1.0': 'a10',
    'quiz.HabboWay1.answer.1.1': 'a11',
    'quiz.HabboWay1.question.2': 'q2',
    'quiz.HabboWay1.answer.2.0': 'a20',
    'quiz.HabboWay1.answer.2.1': 'a21'
};
const lookup = (key: string) => texts[key] ?? key;

const sequence = (...values: number[]) => {
    let index = 0;

    return () => values[index++ % values.length];
};

describe('habboWayQuiz keys', () => {
    it('uses the habbo.way.quiz prefix for the Habbo Way quiz and quiz.<code> for the others', () => {
        expect(getQuizLocalizationKey(HABBO_WAY_QUIZ_CODE, 'success.title')).toBe('habbo.way.quiz.success.title');
        expect(getQuizLocalizationKey('SafetyQuiz1', 'success.title')).toBe('quiz.SafetyQuiz1.success.title');
    });

    it('discovers questions and answers by probing the texts until one is missing', () => {
        expect(discoverQuizQuestionIds(HABBO_WAY_QUIZ_CODE, lookup)).toEqual([0, 1, 2]);
        expect(discoverQuizAnswers(HABBO_WAY_QUIZ_CODE, 0, lookup).map((answer) => answer.id)).toEqual([0, 1, 2]);
        expect(discoverQuizAnswers(HABBO_WAY_QUIZ_CODE, 1, lookup).map((answer) => answer.text)).toEqual(['a10', 'a11']);
        expect(discoverQuizAnswers(HABBO_WAY_QUIZ_CODE, 9, lookup)).toEqual([]);
    });
});

describe('habboWayQuiz shuffling', () => {
    it('draws every answer once, in the order the random source picks', () => {
        expect(drawRandomOrder(3, sequence(0.99, 0, 0))).toEqual([2, 0, 1]);
        expect(drawRandomOrder(0)).toEqual([]);
    });

    it('keeps the order of a question for the whole session', () => {
        let session = createQuizSession(HABBO_WAY_QUIZ_CODE, [0, 1, 2], true);

        session = ensureQuizAnswerOrder(session, 3, sequence(0.99, 0, 0));
        expect(session.answerOrders[0]).toEqual([2, 0, 1]);

        const again = ensureQuizAnswerOrder(session, 3, sequence(0));

        expect(again).toBe(session);
        expect(getOrderedQuizAnswers(session, discoverQuizAnswers(HABBO_WAY_QUIZ_CODE, 0, lookup)).map((answer) => answer.id)).toEqual([2, 0, 1]);
    });

    it('picks the static question subset without repeats and keeps short lists whole', () => {
        expect(pickStaticQuizQuestions([0, 1, 2], 5)).toEqual([0, 1, 2]);

        const picked = pickStaticQuizQuestions([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 5, sequence(0.5));

        expect(picked).toHaveLength(5);
        expect(new Set(picked).size).toBe(5);
    });
});

describe('habboWayQuiz stepping', () => {
    it('only advances once the current question has an answer', () => {
        let session = createQuizSession(HABBO_WAY_QUIZ_CODE, [0, 1, 2], true);

        expect(canAdvanceQuizQuestion(session)).toBe(false);

        session = selectQuizAnswer(session, 2);

        expect(canAdvanceQuizQuestion(session)).toBe(true);
        expect(session.answers).toEqual([2, null, null]);
    });

    it('clamps below zero, moves inside the range and submits past the end', () => {
        const session = createQuizSession(HABBO_WAY_QUIZ_CODE, [0, 1, 2], true);

        expect(goToQuizQuestion(session, -1)).toEqual({ session, submit: false });
        expect(goToQuizQuestion(session, 2).session.currentQuestion).toBe(2);
        expect(goToQuizQuestion(session, 3)).toEqual({ session, submit: true });
    });

    it('posts the answers in question order, -1 for a skipped one', () => {
        let session = createQuizSession(HABBO_WAY_QUIZ_CODE, [4, 7], true);

        session = selectQuizAnswer(session, 3);

        expect(getQuizAnswerIds(session)).toEqual([3, -1]);
        expect(getQuizGivenAnswer(session, 4)).toBe(3);
        expect(getQuizGivenAnswer(session, 7)).toBeNull();
        expect(getQuizGivenAnswer(session, 9)).toBeNull();
    });
});

describe('habboWayQuiz results', () => {
    it('shows the success page without wrong answers and the failure page otherwise', () => {
        const session = createQuizSession(HABBO_WAY_QUIZ_CODE, [0, 1, 2], true);

        const success = applyQuizResults(session, []);

        expect(success.page).toBe(QuizPage.SUCCESS);
        expect(getQuizCorrectCount(success)).toBe(3);

        const failure = applyQuizResults(session, [1, 2]);

        expect(failure.page).toBe(QuizPage.FAILURE);
        expect(failure.wrongQuestionIds).toEqual([1, 2]);
        expect(getQuizCorrectCount(failure)).toBe(1);
        expect(showQuizAnalysis(failure).page).toBe(QuizPage.ANALYSIS);
    });

    it('grades the static session against the answer key', () => {
        let session = createQuizSession(HABBO_WAY_QUIZ_CODE, [0, 1, 2], false);

        session = selectQuizAnswer(session, HABBO_WAY_STATIC_ANSWER_KEY[0]);
        session = goToQuizQuestion(session, 1).session;
        session = selectQuizAnswer(session, HABBO_WAY_STATIC_ANSWER_KEY[1] + 1);
        session = goToQuizQuestion(session, 2).session;
        session = selectQuizAnswer(session, HABBO_WAY_STATIC_ANSWER_KEY[2]);

        expect(gradeQuizLocally(session, HABBO_WAY_STATIC_ANSWER_KEY)).toEqual([1]);
    });

    it('keys every official Habbo Way question to one of its four answers', () => {
        for (let questionId = 0; questionId < 10; questionId++) {
            const correct = HABBO_WAY_STATIC_ANSWER_KEY[questionId];

            expect(correct).toBeGreaterThanOrEqual(0);
            expect(correct).toBeLessThan(4);
        }
    });
});
