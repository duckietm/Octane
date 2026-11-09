import {
    AddLinkEventTracker,
    GetQuizQuestionsComposer,
    ILinkEventTracker,
    PostQuizAnswersComposer,
    QuizDataMessageEvent,
    QuizResultsMessageEvent,
    RemoveLinkEventTracker
} from '@octane/renderer';
import { useEffect, useState } from 'react';
import {
    applyQuizResults,
    createQuizState,
    getQuizAnswersToPost,
    getQuizAnswerTexts,
    HABBO_WAY_QUIZ_CODE,
    IQuizState,
    LocalizeText,
    moveQuizQuestion,
    SAFETY_QUIZ_CODE,
    selectQuizAnswer,
    SendMessageComposer,
    showQuizAnalysis
} from '../../api';
import { useMessageEvent } from '../events';

const localizeOrEmpty = (key: string): string => {
    const value = LocalizeText(key);

    return value && value !== key ? value : '';
};

/**
 * AIR help/HabboWayController, SafetyBookletController and HabboWayQuizController: the paged
 * Habbo Way and safety booklet windows and the quiz they lead to. Opened by `help/habboway`,
 * `help/safetybooklet` and `help/quiz/<code>`.
 */
export const useHabboWay = () => {
    const [habboWayPage, setHabboWayPage] = useState<number>(-1);
    const [bookletPage, setBookletPage] = useState<number>(-1);
    const [quiz, setQuiz] = useState<IQuizState>(null);

    const startQuiz = (quizCode: string) => SendMessageComposer(new GetQuizQuestionsComposer(quizCode));

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                switch (parts[1]) {
                    case 'habboway':
                        setHabboWayPage(0);
                        return;
                    case 'safetybooklet':
                        setBookletPage(0);
                        return;
                    case 'quiz':
                        startQuiz(parts[2] === 'safety' || parts[2] === SAFETY_QUIZ_CODE ? SAFETY_QUIZ_CODE : HABBO_WAY_QUIZ_CODE);
                        return;
                }
            },
            eventUrlPrefix: 'help/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useMessageEvent<QuizDataMessageEvent>(QuizDataMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        const answerCounts = parser.questionIds.map((questionId) => getQuizAnswerTexts(parser.quizCode, questionId, localizeOrEmpty).length);

        // _rc945f4bc23fedd: the quiz replaces the Habbo Way and the safety booklet windows.
        setHabboWayPage(-1);
        setBookletPage(-1);
        setQuiz(createQuizState(parser.quizCode, parser.questionIds, answerCounts));
    });

    useMessageEvent<QuizResultsMessageEvent>(QuizResultsMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        setQuiz((current) => (current && current.quizCode === parser.quizCode ? applyQuizResults(current, parser.questionIdsForWrongAnswers) : current));
    });

    const moveQuestion = (index: number) => {
        if (!quiz) return;

        const next = moveQuizQuestion(quiz, index);

        if (next.submitted && !quiz.submitted) {
            SendMessageComposer(new PostQuizAnswersComposer(quiz.quizCode, getQuizAnswersToPost(quiz.answers)));
        }

        setQuiz(next);
    };

    return {
        habboWayPage,
        setHabboWayPage,
        bookletPage,
        setBookletPage,
        quiz,
        startQuiz,
        selectAnswer: (answer: number) => setQuiz((current) => (current ? selectQuizAnswer(current, answer) : current)),
        moveQuestion,
        reviewQuiz: () => setQuiz((current) => (current ? showQuizAnalysis(current) : current)),
        closeQuiz: () => setQuiz(null)
    };
};
