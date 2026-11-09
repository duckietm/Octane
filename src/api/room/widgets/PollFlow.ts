import { IPollQuestion } from '@octane/renderer';

/** Habbo's poll question types; 5 (rating) and 6 (binary) are skipped like the official client does. */
export const POLL_QUESTION_RADIO = 1;
export const POLL_QUESTION_CHECKBOX = 2;
export const POLL_QUESTION_TEXT = 3;
export const POLL_QUESTION_TEXT_ALT = 4;

/** Choice type 0 never branches. */
export const POLL_CHOICE_NO_BRANCH = 0;

export interface PollCursor {
    /** Index of the current main question, -1 before the first. */
    index: number;
    /** Main question whose children may follow the next answer, -1 when none. */
    branchFrom: number;
}

export const POLL_CURSOR_START: PollCursor = { index: -1, branchFrom: -1 };

export const isSupportedPollQuestion = (question: IPollQuestion): boolean =>
    !!question && question.questionType >= POLL_QUESTION_RADIO && question.questionType <= POLL_QUESTION_TEXT_ALT;

/** Page count as Habbo shows it: every main question, plus one for each that can branch. */
export const countPollPages = (questions: IPollQuestion[]): number =>
    (questions ?? []).reduce((total, question) => total + 1 + ((question?.children?.length ?? 0) > 0 ? 1 : 0), 0);

/**
 * The question after the current one. In an NPS poll a radio answer whose choice type is not 0
 * jumps to the child question with that category; otherwise the next main question follows.
 */
export const nextPollQuestion = (
    questions: IPollQuestion[],
    cursor: PollCursor,
    npsPoll: boolean,
    lastChoiceType: number
): { question: IPollQuestion; cursor: PollCursor } => {
    if (!questions) return null;

    if (npsPoll && cursor.branchFrom >= 0 && lastChoiceType !== POLL_CHOICE_NO_BRANCH) {
        const parent = questions[cursor.branchFrom];
        const child = (parent?.children ?? []).find((value) => value && value.questionCategory === lastChoiceType);

        if (child) return { question: child, cursor: { index: cursor.index, branchFrom: -1 } };
    }

    let index = cursor.index;

    while (++index < questions.length) {
        const question = questions[index];

        if (isSupportedPollQuestion(question)) return { question, cursor: { index, branchFrom: index } };
    }

    return null;
};

/** Answers to send for one question; text questions always send their (trimmed) line. */
export const buildPollAnswers = (question: IPollQuestion, selected: number[], text: string): string[] => {
    if (!question) return [];

    const choices = question.questionChoices ?? [];

    switch (question.questionType) {
        case POLL_QUESTION_RADIO:
        case POLL_QUESTION_CHECKBOX:
            return selected.filter((index) => index >= 0 && index < choices.length).map((index) => choices[index].value);
        default:
            return [(text ?? '').trim()];
    }
};
