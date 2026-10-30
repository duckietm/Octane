import { FC } from 'react';
import {
    GetConfigurationValue,
    getQuizAnalysis,
    getQuizAnswerKey,
    getQuizAnswerTexts,
    getQuizCorrectCount,
    getQuizExplanationKey,
    getQuizImages,
    getQuizQuestionKey,
    getQuizRawKey,
    HABBO_WAY_QUIZ_CODE,
    IQuizState,
    isQuizLocked,
    LocalizeText,
    localizeWithFallback,
    QUIZ_PAGE_ANALYSIS,
    QUIZ_PAGE_FAILURE,
    QUIZ_PAGE_QUESTION,
    QUIZ_PAGE_SUCCESS
} from '../../../api';
import declineIcon from '../../../assets/images/help/habboway/help_decline_icon.png';
import doveOn from '../../../assets/images/help/habboway/help_habboway_dove_on.png';
import doveQuiz from '../../../assets/images/help/habboway/help_habboway_dove_quizz.png';
import { AirModalDialog, Radio } from '../../../common';
import { BaseButton } from '../../../common/BaseButton';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { HabboWayNavButtonView, LibraryImageView } from './HabboWayPagerView';

interface HabboWayQuizViewProps {
    quiz: IQuizState;
    selectAnswer: (answer: number) => void;
    moveQuestion: (index: number) => void;
    reviewQuiz: () => void;
    closeQuiz: () => void;
}

const localizeOrEmpty = (key: string): string => {
    const value = LocalizeText(key);

    return value && value !== key ? value : '';
};

const PAGE_TITLES: Record<number, [string, string]> = {
    [QUIZ_PAGE_QUESTION]: ['question.title', 'The Quiz'],
    [QUIZ_PAGE_SUCCESS]: ['success.title', 'Success!'],
    [QUIZ_PAGE_FAILURE]: ['failure.title', 'Your results'],
    [QUIZ_PAGE_ANALYSIS]: ['analysis.title', 'Your results in detail']
};

/**
 * Official HabboWayQuizController (`habbo_way_quiz` layout, 499x470): one question per page with
 * the answers in a random order, then the success page, or the failure page and its review of the
 * wrong answers with their explanations.
 */
export const HabboWayQuizView: FC<HabboWayQuizViewProps> = ({ quiz, selectAnswer, moveQuestion, reviewQuiz, closeQuiz }) => {
    const { quizCode, questionIds, current, page } = quiz;
    const library = GetConfigurationValue<string>('image.library.url', '');
    const images = getQuizImages(quizCode, library, doveOn, doveQuiz);
    const key = (name: string, fallback: string, parameters: string[] = null, replacements: string[] = null) =>
        localizeWithFallback(getQuizRawKey(quizCode, name), fallback, parameters, replacements);
    const locked = isQuizLocked(quiz);
    const count = questionIds.length.toString();
    const [titleKey, titleFallback] = PAGE_TITLES[page];
    const caption = locked ? key('title', 'The Quiz') : key(titleKey, titleFallback);
    const showIndicator = !locked && (page === QUIZ_PAGE_QUESTION || page === QUIZ_PAGE_ANALYSIS);
    const indicator =
        page === QUIZ_PAGE_QUESTION
            ? key('question.page', `PART ${current + 1}/${count}`, ['current_page', 'page_count'], [(current + 1).toString(), count])
            : key('analysis.top', 'WRONG ANSWERS');
    const waitKey = quizCode === HABBO_WAY_QUIZ_CODE ? 'habbo.way.quiz.wait.indication' : `quiz.${quizCode}.wait.indication`;

    const renderQuestion = () => {
        const questionId = questionIds[current];
        const answers = getQuizAnswerTexts(quizCode, questionId, localizeOrEmpty);
        const order = quiz.answerOrders[current] ?? answers.map((_, index) => index);

        return (
            <NativeTextTree>
                <div className="octane-habboway-quiz__question">
                    <div className="octane-habboway-quiz__contents">
                        <div className="octane-habboway-quiz__question-text">{localizeWithFallback(getQuizQuestionKey(quizCode, questionId), '')}</div>
                        <div className="octane-habboway-quiz__answers">
                            {order.map((answer) => (
                                <label key={answer} className="octane-habboway-quiz__answer">
                                    <Radio checked={quiz.answers[current] === answer} name="habboway-quiz-answer" onCheckedChange={() => selectAnswer(answer)} />
                                    <span>{answers[answer]}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <LibraryImageView className="octane-habboway-quiz__question-image" src={images.question} />
                </div>
            </NativeTextTree>
        );
    };

    return (
        <NativeTextTree>
            <AirModalDialog caption={caption} className="octane-habboway-quiz" width={499} onClose={closeQuiz}>
                <div className="octane-habboway-quiz__indicator">
                    {showIndicator && <LibraryImageView src={images.indicator} />}
                    {showIndicator && <span>{indicator}</span>}
                </div>
                <div className="octane-habboway-quiz__body">
                    {!locked && page === QUIZ_PAGE_QUESTION && renderQuestion()}
                    {page === QUIZ_PAGE_SUCCESS && (
                        <div className="octane-habboway-quiz__result">
                            <div className="octane-habboway-quiz__result-title">
                                {key('success.results', `${count} of ${count}!`, ['question_count'], [count])}
                            </div>
                            <LibraryImageView className="octane-habboway-quiz__result-image" src={images.success} />
                        </div>
                    )}
                    {page === QUIZ_PAGE_FAILURE && (
                        <div className="octane-habboway-quiz__result">
                            <div className="octane-habboway-quiz__result-title">
                                {key(
                                    'failure.results',
                                    `${getQuizCorrectCount(questionIds, quiz.wrongQuestionIds)} of ${count}`,
                                    ['correct_count', 'total_count'],
                                    [getQuizCorrectCount(questionIds, quiz.wrongQuestionIds).toString(), count]
                                )}
                            </div>
                            <div className="octane-habboway-quiz__result-advice">{key('failure.advice', 'Have a look at your results and try again later.')}</div>
                            <LibraryImageView className="octane-habboway-quiz__result-image" src={images.failure} />
                        </div>
                    )}
                    {page === QUIZ_PAGE_ANALYSIS && (
                        <div className="octane-habboway-quiz__analysis">
                            {getQuizAnalysis(quiz).map(({ questionId, answer }, index, list) => (
                                <div key={questionId} className="octane-habboway-quiz__analysis-item">
                                    <div className="octane-habboway-quiz__analysis-question">{localizeWithFallback(getQuizQuestionKey(quizCode, questionId), '')}</div>
                                    <div className="octane-habboway-quiz__analysis-answer">
                                        <img alt="" src={declineIcon} />
                                        <span>{localizeWithFallback(getQuizAnswerKey(quizCode, questionId, answer), '')}</span>
                                    </div>
                                    <div className="octane-habboway-quiz__analysis-explanation">
                                        <LibraryImageView src={images.explanation} />
                                        <span>{localizeWithFallback(getQuizExplanationKey(quizCode, questionId, answer), '')}</span>
                                    </div>
                                    {index < list.length - 1 && <hr />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="octane-habboway-quiz__footer">
                    {!locked && page === QUIZ_PAGE_QUESTION && (
                        <div className="octane-habboway__buttons">
                            <HabboWayNavButtonView
                                caption={localizeWithFallback('habbo.way.previous.button', 'Previous')}
                                direction="prev"
                                disabled={current <= 0}
                                onClick={() => moveQuestion(current - 1)}
                            />
                            <HabboWayNavButtonView
                                caption={localizeWithFallback('habbo.way.next.button', 'Show next')}
                                direction="next"
                                disabled={quiz.answers[current] === null || quiz.submitted}
                                onClick={() => moveQuestion(current + 1)}
                            />
                        </div>
                    )}
                    {page === QUIZ_PAGE_FAILURE && (
                        <div className="octane-habboway__buttons">
                            <BaseButton className="octane-habboway__action" type="button" onClick={reviewQuiz}>
                                {localizeWithFallback(quizCode === HABBO_WAY_QUIZ_CODE ? 'habbo.way.quiz.review.button' : `quiz.${quizCode}.review.button`, 'Review my results')}
                            </BaseButton>
                            <BaseButton className="octane-habboway__action" type="button" onClick={closeQuiz}>
                                {localizeWithFallback('habbo.way.quiz.exit.button', 'Exit')}
                            </BaseButton>
                        </div>
                    )}
                    {(locked || page === QUIZ_PAGE_SUCCESS || page === QUIZ_PAGE_ANALYSIS) && (
                        <div className="octane-habboway-quiz__exit">
                            <BaseButton className="octane-habboway__action" type="button" onClick={closeQuiz}>
                                {localizeWithFallback('habbo.way.quiz.exit.button', 'Exit')}
                            </BaseButton>
                            {locked && <span className="octane-habboway-quiz__wait">{localizeWithFallback(waitKey, 'You can try again in 2 hours')}</span>}
                        </div>
                    )}
                </div>
            </AirModalDialog>
        </NativeTextTree>
    );
};
