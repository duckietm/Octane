import { IPollQuestion } from '@octane/renderer';
import { describe, expect, it } from 'vitest';
import { buildPollAnswers, countPollPages, nextPollQuestion, POLL_CURSOR_START } from './PollFlow';

const question = (questionId: number, questionType: number, extra: Partial<IPollQuestion> = {}): IPollQuestion => ({
    questionId,
    questionType,
    sortOrder: questionId,
    questionText: `q${questionId}`,
    questionCategory: 0,
    questionAnswerType: 0,
    questionAnswerCount: 0,
    children: [],
    questionChoices: [],
    ...extra
});

describe('PollFlow', () => {
    it('walks main questions in order and skips unsupported types', () => {
        const questions = [question(1, 1), question(2, 5), question(3, 3)];

        const first = nextPollQuestion(questions, POLL_CURSOR_START, false, 0);
        const second = nextPollQuestion(questions, first.cursor, false, 0);

        expect(first.question.questionId).toBe(1);
        expect(second.question.questionId).toBe(3);
        expect(nextPollQuestion(questions, second.cursor, false, 0)).toBeNull();
    });

    it('branches to the child with the chosen category in an NPS poll only', () => {
        const child = question(10, 3, { questionCategory: 2 });
        const questions = [question(1, 1, { children: [child] }), question(2, 3)];
        const first = nextPollQuestion(questions, POLL_CURSOR_START, true, 0);

        expect(nextPollQuestion(questions, first.cursor, true, 2).question.questionId).toBe(10);
        expect(nextPollQuestion(questions, first.cursor, true, 0).question.questionId).toBe(2);
        expect(nextPollQuestion(questions, first.cursor, false, 2).question.questionId).toBe(2);

        const afterChild = nextPollQuestion(questions, first.cursor, true, 2);
        expect(nextPollQuestion(questions, afterChild.cursor, true, 2).question.questionId).toBe(2);
    });

    it('counts an extra page for each question that can branch', () => {
        expect(countPollPages([question(1, 1, { children: [question(5, 3)] }), question(2, 3)])).toBe(3);
        expect(countPollPages(null)).toBe(0);
    });

    it('sends choice values for selections and the trimmed line for text', () => {
        const choices = [{ value: 'a', choiceText: 'A', choiceType: 0 }, { value: 'b', choiceText: 'B', choiceType: 1 }];

        expect(buildPollAnswers(question(1, 2, { questionChoices: choices }), [1, 0, 7], '')).toEqual(['b', 'a']);
        expect(buildPollAnswers(question(2, 3), [], '  hi  ')).toEqual(['hi']);
    });
});
