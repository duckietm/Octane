import { IPollQuestion } from '@octane/renderer';
import { describe, expect, it } from 'vitest';
import {
    advanceToRenderableQuestion,
    countAnswerableQuestions,
    createPollAnswerSelection,
    createPollFlowCursor,
    formatPollQuestionNumber,
    getNextPollQuestion,
    POLL_QUESTION_TYPE_CHECKBOX,
    POLL_QUESTION_TYPE_RADIO,
    POLL_QUESTION_TYPE_TEXT_AREA,
    POLL_QUESTION_TYPE_TEXT_LINE,
    resolvePollAnswer
} from './pollQuestionFlow';

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

const choice = (value: string, choiceType = 0) => ({ value, choiceText: value, choiceType });

describe('countAnswerableQuestions', () => {
    it('counts every top-level question and one more for each that has children', () => {
        const questions = [
            question(1, POLL_QUESTION_TYPE_RADIO, { children: [question(10, POLL_QUESTION_TYPE_TEXT_LINE)] }),
            question(2, POLL_QUESTION_TYPE_CHECKBOX),
            question(3, POLL_QUESTION_TYPE_RADIO, { children: [question(30, POLL_QUESTION_TYPE_TEXT_LINE), question(31, POLL_QUESTION_TYPE_TEXT_LINE)] })
        ];

        expect(countAnswerableQuestions(questions)).toBe(5);
        expect(countAnswerableQuestions([])).toBe(0);
        expect(countAnswerableQuestions(null)).toBe(0);
    });
});

describe('getNextPollQuestion', () => {
    it('walks the top-level questions in order and ends with null', () => {
        const questions = [question(1, POLL_QUESTION_TYPE_RADIO), question(2, POLL_QUESTION_TYPE_TEXT_LINE)];

        let step = getNextPollQuestion(questions, createPollFlowCursor(), false);
        expect(step.question.questionId).toBe(1);

        step = getNextPollQuestion(questions, step.cursor, false);
        expect(step.question.questionId).toBe(2);

        step = getNextPollQuestion(questions, step.cursor, false);
        expect(step.question).toBeNull();
    });

    it('shows the NPS child that matches the chosen category, once, before moving on', () => {
        const child = question(10, POLL_QUESTION_TYPE_TEXT_AREA, { questionCategory: 2 });
        const other = question(11, POLL_QUESTION_TYPE_TEXT_AREA, { questionCategory: 3 });
        const questions = [question(1, POLL_QUESTION_TYPE_RADIO, { children: [other, child] }), question(2, POLL_QUESTION_TYPE_RADIO)];

        let step = getNextPollQuestion(questions, createPollFlowCursor(), true);
        expect(step.question.questionId).toBe(1);

        // the radio answer selected category 2
        step = getNextPollQuestion(questions, { ...step.cursor, selectedCategory: 2 }, true);
        expect(step.question.questionId).toBe(10);

        // the child was consumed: the next call goes to the second top-level question
        step = getNextPollQuestion(questions, step.cursor, true);
        expect(step.question.questionId).toBe(2);
    });

    it('skips the children when no category was selected, or when the poll is not an NPS poll', () => {
        const child = question(10, POLL_QUESTION_TYPE_TEXT_AREA, { questionCategory: 2 });
        const questions = [question(1, POLL_QUESTION_TYPE_RADIO, { children: [child] }), question(2, POLL_QUESTION_TYPE_RADIO)];

        const first = getNextPollQuestion(questions, createPollFlowCursor(), true);

        expect(getNextPollQuestion(questions, first.cursor, true).question.questionId).toBe(2);
        expect(getNextPollQuestion(questions, { ...first.cursor, selectedCategory: 2 }, false).question.questionId).toBe(2);
    });

    it('skips a child whose category matches nothing', () => {
        const child = question(10, POLL_QUESTION_TYPE_TEXT_AREA, { questionCategory: 2 });
        const questions = [question(1, POLL_QUESTION_TYPE_RADIO, { children: [child] }), question(2, POLL_QUESTION_TYPE_RADIO)];

        const first = getNextPollQuestion(questions, createPollFlowCursor(), true);

        expect(getNextPollQuestion(questions, { ...first.cursor, selectedCategory: 9 }, true).question.questionId).toBe(2);
    });
});

describe('advanceToRenderableQuestion', () => {
    it('jumps over question types the dialog cannot render', () => {
        const questions = [question(1, 7), question(2, 0), question(3, POLL_QUESTION_TYPE_CHECKBOX)];

        const step = advanceToRenderableQuestion(questions, createPollFlowCursor(), false);

        expect(step.question.questionId).toBe(3);
        expect(advanceToRenderableQuestion(questions, step.cursor, false).question).toBeNull();
    });
});

describe('resolvePollAnswer', () => {
    it('sends the chosen radio value and, in an NPS poll, its choice type as the category', () => {
        const radio = question(1, POLL_QUESTION_TYPE_RADIO, { questionChoices: [choice('a', 1), choice('b', 2)] });

        expect(resolvePollAnswer(radio, { ...createPollAnswerSelection(), radioIndex: 1 }, true)).toEqual({ answers: ['b'], selectedCategory: 2 });
        expect(resolvePollAnswer(radio, { ...createPollAnswerSelection(), radioIndex: 1 }, false)).toEqual({ answers: ['b'], selectedCategory: 0 });
        expect(resolvePollAnswer(radio, createPollAnswerSelection(), true)).toEqual({ answers: [], selectedCategory: 0 });
    });

    it('sends every ticked checkbox value in list order', () => {
        const checkbox = question(1, POLL_QUESTION_TYPE_CHECKBOX, { questionChoices: [choice('a'), choice('b'), choice('c')] });

        expect(resolvePollAnswer(checkbox, { ...createPollAnswerSelection(), checkedIndices: [2, 0, 5] }, false)).toEqual({
            answers: ['a', 'c'],
            selectedCategory: 0
        });
        expect(resolvePollAnswer(checkbox, createPollAnswerSelection(), false).answers).toEqual([]);
    });

    it('sends the free text as a single answer for both text types', () => {
        expect(resolvePollAnswer(question(1, POLL_QUESTION_TYPE_TEXT_LINE), { ...createPollAnswerSelection(), text: 'hi' }, false).answers).toEqual(['hi']);
        expect(resolvePollAnswer(question(1, POLL_QUESTION_TYPE_TEXT_AREA), { ...createPollAnswerSelection(), text: '' }, false).answers).toEqual(['']);
    });
});

describe('formatPollQuestionNumber', () => {
    it('fills both placeholders', () => {
        expect(formatPollQuestionNumber('Question %number%/%count%', 2, 5)).toBe('Question 2/5');
    });

    it('appends the count to the shipped template that lost its placeholder', () => {
        expect(formatPollQuestionNumber('Question %number%/', 1, 3)).toBe('Question 1/3');
    });
});
