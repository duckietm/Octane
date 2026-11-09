/**
 * Pure rules of AIR's help/HabboWayQuizController, HabboWayController and SafetyBookletController:
 * the quiz codes, where their texts and pictures live and how the answers of a question are listed.
 */

export const HABBO_WAY_QUIZ_CODE = 'HabboWay1';
export const SAFETY_QUIZ_CODE = 'SafetyQuiz1';

export const QUIZ_PAGE_QUESTION = 1;
export const QUIZ_PAGE_SUCCESS = 2;
export const QUIZ_PAGE_FAILURE = 3;
export const QUIZ_PAGE_ANALYSIS = 4;

/** SafetyBookletController.FINAL_PAGE: pages 0..6, then the quiz page. */
export const SAFETY_BOOKLET_FINAL_PAGE = 7;

/** HabboWayController.finalPage: `help.habboway.page.count`, 6 by default. */
export const HABBO_WAY_DEFAULT_PAGE_COUNT = 6;

/** HabboWayQuizController.getRawLocalizationKey: the Habbo Way quiz keeps its own key prefix. */
export const getQuizRawKey = (quizCode: string, key: string): string =>
    quizCode === HABBO_WAY_QUIZ_CODE ? `habbo.way.quiz.${key}` : `quiz.${quizCode}.${key}`;

export const getQuizQuestionKey = (quizCode: string, questionId: number): string => `quiz.${quizCode}.question.${questionId}`;

export const getQuizAnswerKey = (quizCode: string, questionId: number, answer: number): string => `quiz.${quizCode}.answer.${questionId}.${answer}`;

export const getQuizExplanationKey = (quizCode: string, questionId: number, answer: number): string =>
    `quiz.${quizCode}.explanation.${questionId}.${answer}`;

/**
 * setCurrentQuestion: the answers of a question are `quiz.<code>.answer.<id>.<n>` for n = 0, 1, ...
 * up to the first one without a text. `localize` returns '' for a missing text.
 */
export const getQuizAnswerTexts = (quizCode: string, questionId: number, localize: (key: string) => string): string[] => {
    const answers: string[] = [];

    for (let index = 0; index < 32; index++) {
        const text = localize(getQuizAnswerKey(quizCode, questionId, index));

        if (!text) break;

        answers.push(text);
    }

    return answers;
};

/** The answers are shown in a random order, drawn once per question and kept while paging. */
export const shuffleAnswerOrder = (count: number, random: () => number = Math.random): number[] => {
    const pool = Array.from({ length: count }, (_, index) => index);
    const order: number[] = [];

    while (pool.length) order.push(pool.splice(Math.trunc(random() * pool.length), 1)[0]);

    return order;
};

/** PostQuizAnswers carries an answer per question; a question left open counts as answer 0. */
export const getQuizAnswersToPost = (answers: (number | null)[]): number[] => answers.map((answer) => answer ?? 0);

export interface IQuizImages {
    question: string;
    indicator: string;
    success: string;
    failure: string;
    explanation: string;
}

/** showWindow: the pictures of each quiz (the Habbo Way ones keep the dove for the indicator). */
export const getQuizImages = (quizCode: string, imageLibraryUrl: string, dove: string, doveQuiz: string): IQuizImages => {
    if (quizCode === SAFETY_QUIZ_CODE) {
        return {
            question: `${imageLibraryUrl}safetyquiz/question_illustration.png`,
            indicator: `${imageLibraryUrl}safetyquiz/safety_on.png`,
            success: `${imageLibraryUrl}safetyquiz/result_success.png`,
            failure: `${imageLibraryUrl}safetyquiz/result_failure.png`,
            explanation: `${imageLibraryUrl}safetyquiz/safety_on.png`
        };
    }

    return {
        question: `${imageLibraryUrl}habboway/quiz_question.png`,
        indicator: dove,
        success: `${imageLibraryUrl}habboway/quiz_success.png`,
        failure: `${imageLibraryUrl}habboway/quiz_failure.png`,
        explanation: doveQuiz
    };
};

/** The number of right answers shown on the failure page. */
export const getQuizCorrectCount = (questionIds: number[], wrongQuestionIds: number[]): number => questionIds.length - wrongQuestionIds.length;

export interface IQuizState {
    quizCode: string;
    questionIds: number[];
    /** The chosen answer (original index) per question, null while unanswered. */
    answers: (number | null)[];
    /** The shuffled order the answers of each question are shown in. */
    answerOrders: number[][];
    current: number;
    page: number;
    wrongQuestionIds: number[];
    /** True once the answers went to the server. */
    submitted: boolean;
}

export const createQuizState = (quizCode: string, questionIds: number[], answerCounts: number[], random: () => number = Math.random): IQuizState => ({
    quizCode,
    questionIds: [...questionIds],
    answers: questionIds.map(() => null),
    answerOrders: answerCounts.map((count) => shuffleAnswerOrder(count, random)),
    current: 0,
    page: QUIZ_PAGE_QUESTION,
    wrongQuestionIds: [],
    submitted: false
});

/** A server that still holds the retry lockout answers with no questions at all. */
export const isQuizLocked = (state: IQuizState): boolean => !!state && state.questionIds.length === 0;

export const selectQuizAnswer = (state: IQuizState, answer: number): IQuizState => {
    const answers = [...state.answers];

    answers[state.current] = answer;

    return { ...state, answers };
};

/**
 * setCurrentQuestion: moving before the first question does nothing; moving past the last one
 * hands the answers over (the caller sends PostQuizAnswers when `submitted` flips).
 */
export const moveQuizQuestion = (state: IQuizState, index: number): IQuizState => {
    if (index >= state.questionIds.length) return { ...state, submitted: true };

    if (index < 0) return state;

    return { ...state, current: index };
};

/** The QuizResults answer: success when nothing was wrong, the failure page otherwise. */
export const applyQuizResults = (state: IQuizState, wrongQuestionIds: number[]): IQuizState => ({
    ...state,
    wrongQuestionIds: [...wrongQuestionIds],
    page: wrongQuestionIds.length === 0 ? QUIZ_PAGE_SUCCESS : QUIZ_PAGE_FAILURE
});

export const showQuizAnalysis = (state: IQuizState): IQuizState => ({ ...state, page: QUIZ_PAGE_ANALYSIS });

/** The analysis page lists each wrong question with the answer that was given. */
export const getQuizAnalysis = (state: IQuizState): { questionId: number; answer: number }[] =>
    state.wrongQuestionIds.map((questionId) => {
        const index = state.questionIds.indexOf(questionId);

        return { questionId, answer: (index >= 0 ? state.answers[index] : null) ?? 0 };
    });
