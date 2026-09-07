import { GetQuizQuestionsComposer, PostQuizAnswersComposer, QuizDataMessageEvent, QuizResultsMessageEvent } from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { GetConfigurationValue, LocalizeText, SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
import { HABBO_WAY_START_PAGE, nextHabboWayPage, previousHabboWayPage, resolveHabboWayPageCount } from './habboWay';
import {
    applyQuizResults,
    createQuizSession,
    discoverQuizAnswers,
    discoverQuizQuestionIds,
    ensureQuizAnswerOrder,
    getCurrentQuizQuestionId,
    getQuizAnswerIds,
    goToQuizQuestion,
    gradeQuizLocally,
    HABBO_WAY_QUIZ_CODE,
    HABBO_WAY_QUIZ_QUESTION_COUNT,
    HABBO_WAY_STATIC_ANSWER_KEY,
    pickStaticQuizQuestions,
    QuizSession,
    SAFETY_QUIZ_CODE,
    selectQuizAnswer,
    showQuizAnalysis
} from './habboWayQuiz';

/**
 * How long the quiz waits for the server's QuizData packet before building
 * the static session from the texts (the emulator has no handler for
 * GetQuizQuestions yet).
 */
export const QUIZ_SERVER_TIMEOUT_MS = 2500;

const lookupText = (key: string): string => LocalizeText(key);

/**
 * The Habbo Way booklet and the quiz window (official HabboWayController and
 * HabboWayQuizController), shared so the help index, the booklet and the quiz
 * drive the same state.
 */
const useHabboWayState = () => {
    const [habboWayVisible, setHabboWayVisible] = useState(false);
    const [habboWayPage, setHabboWayPage] = useState(HABBO_WAY_START_PAGE);
    const [quizSession, setQuizSession] = useState<QuizSession>(null);
    const quizTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

    const habboWayPageCount = resolveHabboWayPageCount(GetConfigurationValue<number>('help.habboway.page.count', 0), lookupText);

    const clearQuizTimeout = useCallback(() => {
        if (!quizTimeoutRef.current) return;

        clearTimeout(quizTimeoutRef.current);
        quizTimeoutRef.current = null;
    }, []);

    const showHabboWay = useCallback(() => {
        setHabboWayPage(HABBO_WAY_START_PAGE);
        setHabboWayVisible(true);
    }, []);

    const closeHabboWay = useCallback(() => setHabboWayVisible(false), []);

    const nextHabboWay = useCallback(() => setHabboWayPage((page) => nextHabboWayPage(page, habboWayPageCount)), [habboWayPageCount]);

    const previousHabboWay = useCallback(() => setHabboWayPage((page) => previousHabboWayPage(page)), []);

    const openQuizSession = useCallback((session: QuizSession) => {
        setHabboWayVisible(false);
        setQuizSession(ensureQuizAnswerOrder(session, discoverQuizAnswers(session.quizCode, getCurrentQuizQuestionId(session), lookupText).length));
    }, []);

    /** Static fallback: the ids the texts know, drawn like the server would. */
    const openStaticQuiz = useCallback(
        (quizCode: string) => {
            const questionIds = pickStaticQuizQuestions(discoverQuizQuestionIds(quizCode, lookupText), HABBO_WAY_QUIZ_QUESTION_COUNT);

            if (!questionIds.length) return;

            openQuizSession(createQuizSession(quizCode, questionIds, false));
        },
        [openQuizSession]
    );

    const startQuiz = useCallback(
        (quizCode: string) => {
            clearQuizTimeout();
            SendMessageComposer(new GetQuizQuestionsComposer(quizCode));

            quizTimeoutRef.current = setTimeout(() => {
                quizTimeoutRef.current = null;
                openStaticQuiz(quizCode);
            }, QUIZ_SERVER_TIMEOUT_MS);
        },
        [clearQuizTimeout, openStaticQuiz]
    );

    const startHabboWayQuiz = useCallback(() => startQuiz(HABBO_WAY_QUIZ_CODE), [startQuiz]);

    const startSafetyQuiz = useCallback(() => startQuiz(SAFETY_QUIZ_CODE), [startQuiz]);

    const closeQuiz = useCallback(() => {
        clearQuizTimeout();
        setQuizSession(null);
    }, [clearQuizTimeout]);

    const selectAnswer = useCallback((answerId: number) => setQuizSession((session) => (session ? selectQuizAnswer(session, answerId) : session)), []);

    const submitQuiz = useCallback((session: QuizSession) => {
        if (session.fromServer) {
            SendMessageComposer(new PostQuizAnswersComposer(session.quizCode, getQuizAnswerIds(session)));

            return;
        }

        setQuizSession((current) => (current ? applyQuizResults(current, gradeQuizLocally(current, HABBO_WAY_STATIC_ANSWER_KEY)) : current));
    }, []);

    const stepQuiz = useCallback(
        (delta: number) => {
            setQuizSession((session) => {
                if (!session) return session;

                const { session: stepped, submit } = goToQuizQuestion(session, session.currentQuestion + delta);

                if (submit) {
                    submitQuiz(session);

                    return session;
                }

                return ensureQuizAnswerOrder(stepped, discoverQuizAnswers(stepped.quizCode, getCurrentQuizQuestionId(stepped), lookupText).length);
            });
        },
        [submitQuiz]
    );

    const nextQuestion = useCallback(() => stepQuiz(1), [stepQuiz]);

    const previousQuestion = useCallback(() => stepQuiz(-1), [stepQuiz]);

    const reviewQuizResults = useCallback(() => setQuizSession((session) => (session ? showQuizAnalysis(session) : session)), []);

    useMessageEvent<QuizDataMessageEvent>(QuizDataMessageEvent, (event) => {
        const parser = event.getParser();

        clearQuizTimeout();
        openQuizSession(createQuizSession(parser.quizCode, parser.questionIds, true));
    });

    useMessageEvent<QuizResultsMessageEvent>(QuizResultsMessageEvent, (event) => {
        const parser = event.getParser();

        setQuizSession((session) => (session && session.quizCode === parser.quizCode ? applyQuizResults(session, parser.questionIdsForWrongAnswers) : session));
    });

    useEffect(() => () => clearQuizTimeout(), [clearQuizTimeout]);

    return {
        habboWayVisible,
        habboWayPage,
        habboWayPageCount,
        showHabboWay,
        closeHabboWay,
        nextHabboWay,
        previousHabboWay,
        quizSession,
        startHabboWayQuiz,
        startSafetyQuiz,
        closeQuiz,
        selectAnswer,
        nextQuestion,
        previousQuestion,
        reviewQuizResults
    };
};

export const useHabboWay = () => useSharedHook(useHabboWayState);

registerSharedHook(useHabboWayState);
