import { IPollQuestion } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { localizeWithFallback } from '../../../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { PollSessionState } from '../../../../hooks';
import { PollCancelConfirmView } from './PollCancelConfirmView';
import {
    advanceToRenderableQuestion,
    countAnswerableQuestions,
    createPollAnswerSelection,
    createPollFlowCursor,
    formatPollQuestionNumber,
    POLL_QUESTION_TYPE_CHECKBOX,
    POLL_QUESTION_TYPE_RADIO,
    POLL_QUESTION_TYPE_TEXT_AREA,
    POLL_QUESTION_TYPE_TEXT_LINE,
    PollAnswerSelection,
    PollFlowCursor,
    resolvePollAnswer
} from './pollQuestionFlow';

interface PollQuestionViewProps {
    session: PollSessionState;
    onAnswer: (pollId: number, questionId: number, answers: string[]) => void;
    onCancel: (pollId: number) => void;
    onFinished: (pollId: number) => void;
}

interface PollQuestionStep {
    question: IPollQuestion | null;
    cursor: PollFlowCursor;
    /** Ordinal shown in the footer: bumps on every rendered question, children included. */
    number: number;
}

/**
 * `poll_question` (382 wide): the start message in the header strip, the question text, the
 * answer control built from `poll_answer_radiobutton_input` / `poll_answer_checkbox_input` /
 * `poll_answer_text_input`, then "Question n/count", a Cancel link and OK. Close and Cancel go
 * through `poll_cancel_confim`; the last OK finishes the poll (`PollWidget.pollFinished`).
 */
export const PollQuestionView: FC<PollQuestionViewProps> = (props) => {
    const { session = null, onAnswer = null, onCancel = null, onFinished = null } = props;
    const [step, setStep] = useState<PollQuestionStep>(() => {
        const first = advanceToRenderableQuestion(session?.questions, createPollFlowCursor(), !!session?.npsPoll);

        return { ...first, number: 1 };
    });
    const [selection, setSelection] = useState<PollAnswerSelection>(createPollAnswerSelection);
    const [confirmingCancel, setConfirmingCancel] = useState(false);
    const questionCount = useMemo(() => countAnswerableQuestions(session?.questions), [session]);

    useEffect(() => {
        if (!session) return;

        if (!step.question) onFinished?.(session.id);
    }, [step, session, onFinished]);

    if (!session || !step.question) return null;

    const question = step.question;

    const answer = () => {
        const { answers, selectedCategory } = resolvePollAnswer(question, selection, session.npsPoll);

        onAnswer?.(session.id, question.questionId, answers);

        const next = advanceToRenderableQuestion(session.questions, { ...step.cursor, selectedCategory }, session.npsPoll);

        setSelection(createPollAnswerSelection());
        setStep({ ...next, number: step.number + 1 });
    };

    const toggleCheckbox = (index: number) =>
        setSelection((prevValue) => ({
            ...prevValue,
            checkedIndices: prevValue.checkedIndices.includes(index)
                ? prevValue.checkedIndices.filter((entry) => entry !== index)
                : [...prevValue.checkedIndices, index]
        }));

    const renderAnswers = () => {
        switch (question.questionType) {
            case POLL_QUESTION_TYPE_RADIO:
                return (
                    <div className="octane-poll-answer-list" role="radiogroup">
                        {question.questionChoices.map((choice, index) => (
                            <label key={index} className="octane-poll-answer-entity">
                                <input
                                    checked={selection.radioIndex === index}
                                    name={`poll-${session.id}-${question.questionId}`}
                                    type="radio"
                                    onChange={() => setSelection((prevValue) => ({ ...prevValue, radioIndex: index }))}
                                />
                                <span>{choice.choiceText}</span>
                            </label>
                        ))}
                    </div>
                );
            case POLL_QUESTION_TYPE_CHECKBOX:
                return (
                    <div className="octane-poll-answer-list">
                        {question.questionChoices.map((choice, index) => (
                            <label key={index} className="octane-poll-answer-entity">
                                <input checked={selection.checkedIndices.includes(index)} type="checkbox" onChange={() => toggleCheckbox(index)} />
                                <span>{choice.choiceText}</span>
                            </label>
                        ))}
                    </div>
                );
            case POLL_QUESTION_TYPE_TEXT_LINE:
            case POLL_QUESTION_TYPE_TEXT_AREA:
                return (
                    <div className="octane-poll-answer-text">
                        <textarea
                            aria-label={question.questionText}
                            className="octane-poll-answer-input"
                            value={selection.text}
                            onChange={(event) => setSelection((prevValue) => ({ ...prevValue, text: event.target.value }))}
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <OctaneCardView className="octane-poll-question" theme="primary-slim" uniqueKey={`poll-question-${session.id}`}>
                <OctaneCardHeaderView headerText={localizeWithFallback('poll_question_title', 'Question')} onCloseClick={() => setConfirmingCancel(true)} />
                <OctaneCardContentView className="octane-poll-question-content" gap={0}>
                    <div className="octane-poll-question-header">
                        <div className="octane-poll-question-portrait" />
                        <div className="octane-poll-question-headline" data-testid="poll-question-headline">
                            {session.startMessage}
                        </div>
                    </div>
                    <div className="octane-poll-question-body">
                        <div className="octane-poll-question-text" data-testid="poll-question-text">
                            {question.questionText}
                        </div>
                        <div className="octane-poll-question-answers">{renderAnswers()}</div>
                    </div>
                    <div className="octane-poll-question-footer">
                        <div className="octane-poll-question-number" data-testid="poll-question-number">
                            {formatPollQuestionNumber(localizeWithFallback('poll_question_number', 'Question %number%/%count%'), step.number, questionCount)}
                        </div>
                        <button className="octane-poll-link" type="button" onClick={() => setConfirmingCancel(true)}>
                            {localizeWithFallback('cancel', 'Cancel')}
                        </button>
                        <Button className="octane-poll-ok" variant="primary" onClick={answer}>
                            {localizeWithFallback('ok', 'OK')}
                        </Button>
                    </div>
                </OctaneCardContentView>
            </OctaneCardView>
            {confirmingCancel && (
                <PollCancelConfirmView
                    pollId={session.id}
                    onConfirm={() => {
                        setConfirmingCancel(false);
                        onCancel?.(session.id);
                    }}
                    onDismiss={() => setConfirmingCancel(false)}
                />
            )}
        </>
    );
};
