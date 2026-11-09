import { describe, expect, it } from 'vitest';
import {
    applyQuizResults,
    createQuizState,
    getQuizAnalysis,
    getQuizAnswersToPost,
    getQuizAnswerTexts,
    getQuizCorrectCount,
    getQuizImages,
    getQuizRawKey,
    HABBO_WAY_QUIZ_CODE,
    isQuizLocked,
    moveQuizQuestion,
    QUIZ_PAGE_ANALYSIS,
    QUIZ_PAGE_FAILURE,
    QUIZ_PAGE_QUESTION,
    QUIZ_PAGE_SUCCESS,
    SAFETY_QUIZ_CODE,
    selectQuizAnswer,
    showQuizAnalysis,
    shuffleAnswerOrder
} from './HabboWayQuiz';

describe('HabboWayQuiz', () => {
    it('keeps the Habbo Way key prefix apart from the other quizzes', () => {
        expect(getQuizRawKey(HABBO_WAY_QUIZ_CODE, 'question.page')).toBe('habbo.way.quiz.question.page');
        expect(getQuizRawKey(SAFETY_QUIZ_CODE, 'question.page')).toBe('quiz.SafetyQuiz1.question.page');
    });

    it('lists the answers up to the first missing text', () => {
        const texts: Record<string, string> = { 'quiz.SafetyQuiz1.answer.3.0': 'a', 'quiz.SafetyQuiz1.answer.3.1': 'b' };

        expect(getQuizAnswerTexts(SAFETY_QUIZ_CODE, 3, (key) => texts[key] ?? '')).toEqual(['a', 'b']);
    });

    it('shuffles every answer exactly once', () => {
        const order = shuffleAnswerOrder(4, () => 0.99);

        expect([...order].sort()).toEqual([0, 1, 2, 3]);
        expect(shuffleAnswerOrder(3, () => 0)).toEqual([0, 1, 2]);
    });

    it('walks the questions and hands the answers over after the last one', () => {
        let state = createQuizState(HABBO_WAY_QUIZ_CODE, [4, 7], [4, 4], () => 0);

        expect(state.page).toBe(QUIZ_PAGE_QUESTION);
        expect(moveQuizQuestion(state, -1)).toBe(state);

        state = selectQuizAnswer(state, 2);
        state = moveQuizQuestion(state, 1);
        expect(state.current).toBe(1);
        expect(getQuizAnswersToPost(state.answers)).toEqual([2, 0]);

        state = moveQuizQuestion(state, 2);
        expect(state.submitted).toBe(true);

        const failed = applyQuizResults(state, [7]);
        expect(failed.page).toBe(QUIZ_PAGE_FAILURE);
        expect(getQuizCorrectCount(failed.questionIds, failed.wrongQuestionIds)).toBe(1);
        expect(showQuizAnalysis(failed).page).toBe(QUIZ_PAGE_ANALYSIS);
        expect(getQuizAnalysis(failed)).toEqual([{ questionId: 7, answer: 0 }]);

        expect(applyQuizResults(state, []).page).toBe(QUIZ_PAGE_SUCCESS);
    });

    it('treats an empty question list as the retry lockout', () => {
        expect(isQuizLocked(createQuizState(HABBO_WAY_QUIZ_CODE, [], []))).toBe(true);
        expect(isQuizLocked(createQuizState(HABBO_WAY_QUIZ_CODE, [1], [3]))).toBe(false);
    });

    it('takes the safety pictures from the image library', () => {
        expect(getQuizImages(SAFETY_QUIZ_CODE, 'lib/', 'dove', 'quiz').indicator).toBe('lib/safetyquiz/safety_on.png');
        expect(getQuizImages(HABBO_WAY_QUIZ_CODE, 'lib/', 'dove', 'quiz').indicator).toBe('dove');
    });
});
