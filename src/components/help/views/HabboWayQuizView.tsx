import { FC, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { GetConfigurationValue, LocalizeText, localizeWithFallback } from '../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../common';
import { useHabboWay } from '../../../hooks';
import {
    canAdvanceQuizQuestion,
    canGoBackQuizQuestion,
    discoverQuizAnswers,
    getCurrentQuizQuestionId,
    getOrderedQuizAnswers,
    getQuizAnswerKey,
    getQuizCorrectCount,
    getQuizExplanationKey,
    getQuizGivenAnswer,
    getQuizLocalizationKey,
    getQuizQuestionCount,
    getQuizQuestionKey,
    HABBO_WAY_QUIZ_CODE,
    QuizPage
} from '../../../hooks/help/habboWayQuiz';

const lookupText = (key: string): string => LocalizeText(key);

const QUIZ_ILLUSTRATIONS: Readonly<Record<string, { question: string; success: string; failure?: string }>> = Object.freeze({
    [HABBO_WAY_QUIZ_CODE]: { question: 'habboway/quiz_question.png', success: 'habboway/quiz_success.png' },
    SafetyQuiz1: { question: 'safetyquiz/question_illustration.png', success: 'safetyquiz/result_success.png', failure: 'safetyquiz/result_failure.png' }
});

/**
 * The official quiz window (habbo_way_quiz layout): one question per page
 * with shuffled radio answers, then the success or failure page, and the
 * "result review" list of wrong answers with their explanations.
 */
export const HabboWayQuizView: FC<{}> = () => {
    const { quizSession = null, closeQuiz = null, selectAnswer = null, nextQuestion = null, previousQuestion = null, reviewQuizResults = null } = useHabboWay();
    const [brokenImages, setBrokenImages] = useState<string[]>([]);

    if (!quizSession) return null;

    const { quizCode, page } = quizSession;
    const questionCount = getQuizQuestionCount(quizSession);
    const key = (suffix: string) => getQuizLocalizationKey(quizCode, suffix);
    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');
    const illustrations = QUIZ_ILLUSTRATIONS[quizCode] || QUIZ_ILLUSTRATIONS[HABBO_WAY_QUIZ_CODE];

    const renderIllustration = (path: string) => {
        if (!path) return null;

        const url = `${imageLibraryUrl}${path}`;

        if (brokenImages.includes(url)) return null;

        return (
            <div className="flex justify-center">
                <img src={url} alt="" className="max-h-[140px] w-auto [image-rendering:pixelated]" onError={() => setBrokenImages((urls) => [...urls, url])} />
            </div>
        );
    };

    const headerText = (() => {
        switch (page) {
            case QuizPage.SUCCESS:
                return localizeWithFallback(key('success.title'), 'Success!');
            case QuizPage.FAILURE:
                return localizeWithFallback(key('failure.title'), 'Your result');
            case QuizPage.ANALYSIS:
                return localizeWithFallback(key('analysis.title'), 'Your result review');
            default:
                return localizeWithFallback(key('question.title'), 'The Habbo Way Quiz');
        }
    })();

    const renderQuestionPage = () => {
        const questionId = getCurrentQuizQuestionId(quizSession);
        const answers = getOrderedQuizAnswers(quizSession, discoverQuizAnswers(quizCode, questionId, lookupText));
        const selected = quizSession.answers[quizSession.currentQuestion];
        const canGoBack = canGoBackQuizQuestion(quizSession);
        const canAdvance = canAdvanceQuizQuestion(quizSession);

        return (
            <>
                <Text bold className="text-[#5c5c5c]" small>
                    {LocalizeText(key('question.page'), ['CURRENT_PAGE', 'PAGE_COUNT'], [String(quizSession.currentQuestion + 1), String(questionCount)])}
                </Text>
                <Text bold>{localizeWithFallback(getQuizQuestionKey(quizCode, questionId), '')}</Text>
                <div className="flex flex-col gap-1" role="radiogroup">
                    {answers.map((answer) => (
                        <label key={answer.id} className="flex cursor-pointer items-start gap-2">
                            <input
                                type="radio"
                                name={`quiz-answer-${questionId}`}
                                className="mt-1 shrink-0"
                                checked={selected === answer.id}
                                onChange={() => selectAnswer(answer.id)}
                            />
                            <Text small>{answer.text}</Text>
                        </label>
                    ))}
                </div>
                {renderIllustration(illustrations.question)}
                <div className="flex items-center justify-between pt-1">
                    <button type="button" className={`help-link ${canGoBack ? '' : 'opacity-40'}`} disabled={!canGoBack} onClick={previousQuestion}>
                        <FaChevronLeft className="help-link__icon" />
                        {localizeWithFallback('habbo.way.previous.button', 'Previous')}
                    </button>
                    <button type="button" className={`help-link ${canAdvance ? '' : 'opacity-40'}`} disabled={!canAdvance} onClick={nextQuestion}>
                        {localizeWithFallback('habbo.way.next.button', 'Next')}
                        <FaChevronRight className="help-link__icon" />
                    </button>
                </div>
            </>
        );
    };

    const exitButton = (
        <button type="button" className="habbo-btn-green habbo-btn-green--auto" onClick={closeQuiz}>
            {localizeWithFallback(key('exit.button'), 'Exit')}
        </button>
    );

    const waitIndication = (
        <Text className="text-[#5c5c5c]" small>
            {localizeWithFallback(key('wait.indication'), '')}
        </Text>
    );

    const renderSuccessPage = () => (
        <>
            <Text bold>{LocalizeText(key('success.results'), ['QUESTION_COUNT', 'QUESTION_COUNT'], [String(questionCount), String(questionCount)])}</Text>
            {renderIllustration(illustrations.success)}
            <div className="flex items-center justify-between gap-2 pt-1">
                {waitIndication}
                {exitButton}
            </div>
        </>
    );

    const renderFailurePage = () => (
        <>
            <Text bold>
                {LocalizeText(key('failure.results'), ['CORRECT_COUNT', 'TOTAL_COUNT'], [String(getQuizCorrectCount(quizSession)), String(questionCount)])}
            </Text>
            <Text small>{localizeWithFallback(key('failure.advice'), '')}</Text>
            {renderIllustration(illustrations.failure)}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                {waitIndication}
                <div className="flex gap-2">
                    <button type="button" className="habbo-btn-green habbo-btn-green--auto" onClick={reviewQuizResults}>
                        {localizeWithFallback(key('review.button'), 'Review my results')}
                    </button>
                    {exitButton}
                </div>
            </div>
        </>
    );

    const renderAnalysisPage = () => (
        <>
            <Text bold className="text-[#5c5c5c]" small>
                {localizeWithFallback(key('analysis.top'), 'WRONG ANSWERS')}
            </Text>
            <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-1">
                {quizSession.wrongQuestionIds.map((questionId, index) => {
                    const answerId = getQuizGivenAnswer(quizSession, questionId);

                    return (
                        <div
                            key={questionId}
                            className={`flex flex-col gap-1 ${index < quizSession.wrongQuestionIds.length - 1 ? 'border-b border-[#d0d0d0] pb-2' : ''}`}
                        >
                            <Text bold small>
                                {localizeWithFallback(getQuizQuestionKey(quizCode, questionId), '')}
                            </Text>
                            {answerId != null && (
                                <>
                                    <Text small>{localizeWithFallback(getQuizAnswerKey(quizCode, questionId, answerId), '')}</Text>
                                    <div className="rounded border border-[#c8c8c8] bg-[#f1f1f1] p-1.5">
                                        <Text small>{localizeWithFallback(getQuizExplanationKey(quizCode, questionId, answerId), '')}</Text>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-end pt-1">{exitButton}</div>
        </>
    );

    return (
        <OctaneCardView
            className="octane-help octane-habbo-way-quiz min-w-0 w-[min(560px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
            theme="primary-slim"
        >
            <OctaneCardHeaderView headerText={headerText} onCloseClick={closeQuiz} />
            <OctaneCardContentView className="text-black">
                <div className="flex flex-col gap-2">
                    {page === QuizPage.QUESTION && renderQuestionPage()}
                    {page === QuizPage.SUCCESS && renderSuccessPage()}
                    {page === QuizPage.FAILURE && renderFailurePage()}
                    {page === QuizPage.ANALYSIS && renderAnalysisPage()}
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
