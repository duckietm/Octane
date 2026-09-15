import { IPollChoice, IPollQuestion } from '@octane/renderer';

/**
 * The official `PollContentDialog` walks the question list with three cursors: the index of
 * the current top-level question, the index of the top-level question whose children are still
 * pending (NPS polls only) and the choice category the last radio answer selected. Everything
 * below is that walk, without the window.
 */

/** `questionType` as the server numbers it (`PollContentDialog.nextQuestion` switches on `type - 1`). */
export const POLL_QUESTION_TYPE_RADIO = 1;
export const POLL_QUESTION_TYPE_CHECKBOX = 2;
export const POLL_QUESTION_TYPE_TEXT_LINE = 3;
export const POLL_QUESTION_TYPE_TEXT_AREA = 4;

export interface PollFlowCursor {
    /** Index of the current top-level question; -1 before the first one. */
    index: number;
    /** Top-level question whose NPS children may still follow; -1 once they were consumed. */
    pendingParentIndex: number;
    /** `choiceType` of the last radio answer, the category an NPS child must carry to be shown. 0 = none. */
    selectedCategory: number;
}

export const createPollFlowCursor = (): PollFlowCursor => ({ index: -1, pendingParentIndex: -1, selectedCategory: 0 });

/** The counter in the footer: every top-level question, plus one for each that has children. */
export const countAnswerableQuestions = (questions: IPollQuestion[]): number =>
    (questions || []).reduce((total, question) => total + 1 + (question?.children?.length ? 1 : 0), 0);

export const isSupportedQuestionType = (questionType: number): boolean =>
    questionType >= POLL_QUESTION_TYPE_RADIO && questionType <= POLL_QUESTION_TYPE_TEXT_AREA;

/**
 * `PollContentDialog.getNextQuestion`: in an NPS poll a child of the current question whose
 * category matches the chosen answer comes first (once); otherwise the next top-level question.
 * Returns the question and the moved cursor, or a null question when the poll is finished.
 */
export const getNextPollQuestion = (
    questions: IPollQuestion[],
    cursor: PollFlowCursor,
    npsPoll: boolean
): { question: IPollQuestion | null; cursor: PollFlowCursor } => {
    const list = questions || [];

    if (npsPoll && cursor.pendingParentIndex >= 0 && cursor.selectedCategory !== 0) {
        const parent = list[cursor.pendingParentIndex];
        const child = (parent?.children || []).find((entry) => entry && entry.questionCategory === cursor.selectedCategory);

        if (child) return { question: child, cursor: { ...cursor, pendingParentIndex: -1 } };
    }

    const index = cursor.index + 1;

    if (index < list.length) return { question: list[index], cursor: { ...cursor, index, pendingParentIndex: index } };

    return { question: null, cursor: { ...cursor, index } };
};

/**
 * Skips the question types the official dialog cannot render (it recurses to the next one).
 * Returns the first renderable question from the cursor, or null when none is left.
 */
export const advanceToRenderableQuestion = (
    questions: IPollQuestion[],
    cursor: PollFlowCursor,
    npsPoll: boolean
): { question: IPollQuestion | null; cursor: PollFlowCursor } => {
    let step = getNextPollQuestion(questions, cursor, npsPoll);

    while (step.question && !isSupportedQuestionType(step.question.questionType)) step = getNextPollQuestion(questions, step.cursor, npsPoll);

    return step;
};

export interface PollAnswerSelection {
    /** Index of the chosen radio choice, -1 for none. */
    radioIndex: number;
    /** Indices of the ticked checkbox choices. */
    checkedIndices: number[];
    /** Free text for the text line / text area types. */
    text: string;
}

export const createPollAnswerSelection = (): PollAnswerSelection => ({ radioIndex: -1, checkedIndices: [], text: '' });

/**
 * `PollContentDialog.answerPollQuestion`: the values sent for the question, and the category
 * the answer selects for the NPS follow-up (only a radio answer in an NPS poll sets one).
 */
export const resolvePollAnswer = (
    question: IPollQuestion,
    selection: PollAnswerSelection,
    npsPoll: boolean
): { answers: string[]; selectedCategory: number } => {
    const choices: IPollChoice[] = question?.questionChoices || [];

    switch (question?.questionType) {
        case POLL_QUESTION_TYPE_RADIO: {
            const choice = choices[selection.radioIndex];

            if (!choice) return { answers: [], selectedCategory: 0 };

            return { answers: [choice.value], selectedCategory: npsPoll ? choice.choiceType : 0 };
        }
        case POLL_QUESTION_TYPE_CHECKBOX:
            return {
                answers: [...selection.checkedIndices]
                    .sort((a, b) => a - b)
                    .filter((index) => !!choices[index])
                    .map((index) => choices[index].value),
                selectedCategory: 0
            };
        case POLL_QUESTION_TYPE_TEXT_LINE:
        case POLL_QUESTION_TYPE_TEXT_AREA:
            return { answers: [selection.text ?? ''], selectedCategory: 0 };
        default:
            return { answers: [], selectedCategory: 0 };
    }
};

/**
 * `poll_question_number` is "Question %number%/%count%" in the official texts. Our shipped
 * text file lost the count placeholder ("Question %number%/"), so a template without it gets
 * the count appended rather than printing a dangling slash.
 */
export const formatPollQuestionNumber = (template: string, number: number, count: number): string => {
    const withCount = (template || '').includes('%count%') ? template : `${template || ''}%count%`;

    return withCount.replace('%number%', String(number)).replace('%count%', String(count));
};
