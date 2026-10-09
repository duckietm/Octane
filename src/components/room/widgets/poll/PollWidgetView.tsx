import { IPollQuestion } from '@octane/renderer';
import { FC, useState } from 'react';
import {
    buildPollAnswers,
    countPollPages,
    localizeWithFallback,
    nextPollQuestion,
    NotificationAlertType,
    POLL_CHOICE_NO_BRANCH,
    POLL_CURSOR_START,
    POLL_QUESTION_CHECKBOX,
    POLL_QUESTION_RADIO,
    PollCursor,
    RoomWidgetPollUpdateEvent
} from '../../../../api';
import { Button, Column, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { useNotification, usePollActions, useUiEvent } from '../../../../hooks';

interface PollOffer {
    id: number;
    headline: string;
    summary: string;
    starting: boolean;
}

interface PollContent {
    id: number;
    startMessage: string;
    endMessage: string;
    questions: IPollQuestion[];
    npsPoll: boolean;
    pageCount: number;
    question: IPollQuestion;
    cursor: PollCursor;
}

const MAX_TEXT_ANSWER_LENGTH = 255;

export const PollWidgetView: FC = () => {
    const [offer, setOffer] = useState<PollOffer>(null);
    const [content, setContent] = useState<PollContent>(null);
    const [selected, setSelected] = useState<number[]>([]);
    const [text, setText] = useState('');
    const { startPoll, rejectPoll, answerPoll } = usePollActions();
    const { simpleAlert = null, showConfirm = null } = useNotification();

    const thank = (endMessage: string) =>
        simpleAlert(
            endMessage || localizeWithFallback('poll.default.thanks', 'Thanks for your response.'),
            NotificationAlertType.DEFAULT,
            null,
            null,
            localizeWithFallback('poll_thanks_title', 'Thanks!')
        );

    const showQuestion = (next: PollContent, choiceType: number) => {
        const step = nextPollQuestion(next.questions, next.cursor, next.npsPoll, choiceType);

        setSelected([]);
        setText('');

        if (!step) {
            setContent(null);
            thank(next.endMessage);

            return;
        }

        setContent({ ...next, question: step.question, cursor: step.cursor });
    };

    useUiEvent<RoomWidgetPollUpdateEvent>(RoomWidgetPollUpdateEvent.OFFER, (event) => {
        if (content) return;

        setOffer({ id: event.id, headline: event.headline ?? '', summary: event.summary ?? '', starting: false });
    });

    useUiEvent<RoomWidgetPollUpdateEvent>(RoomWidgetPollUpdateEvent.ERROR, () => {
        setOffer(null);
        setContent(null);
        simpleAlert(
            localizeWithFallback('poll.error', 'The poll could not be loaded.'),
            NotificationAlertType.DEFAULT,
            null,
            null,
            localizeWithFallback('win_error', 'Error!')
        );
    });

    useUiEvent<RoomWidgetPollUpdateEvent>(RoomWidgetPollUpdateEvent.CONTENT, (event) => {
        const questions = event.questionArray ?? [];

        setOffer(null);
        showQuestion(
            {
                id: event.id,
                startMessage: event.startMessage ?? '',
                endMessage: event.endMessage ?? '',
                questions,
                npsPoll: !!event.npsPoll,
                pageCount: countPollPages(questions),
                question: null,
                cursor: POLL_CURSOR_START
            },
            POLL_CHOICE_NO_BRANCH
        );
    });

    const acceptOffer = () => {
        if (!offer || offer.starting) return;

        setOffer({ ...offer, starting: true });
        startPoll(offer.id);
    };

    const rejectOffer = () => {
        if (!offer) return;

        rejectPoll(offer.id);
        setOffer(null);
    };

    // Closing without an answer sends nothing, like Habbo; the poll is offered again on the next visit.
    const cancelContent = () => {
        showConfirm(
            localizeWithFallback('poll_cancel_confirm_long', 'Are you sure you want to stop answering the poll? You can\'t continue later.'),
            () => setContent(null),
            null,
            null,
            null,
            localizeWithFallback('poll_cancel_confirm_title', 'Cancel poll')
        );
    };

    const toggleChoice = (index: number) => {
        if (!content) return;

        if (content.question.questionType === POLL_QUESTION_CHECKBOX) {
            setSelected((prev) => (prev.includes(index) ? prev.filter((value) => value !== index) : [...prev, index]));

            return;
        }

        setSelected([index]);
    };

    const submitAnswer = () => {
        if (!content?.question) return;

        const question = content.question;
        const answers = buildPollAnswers(question, selected, text);

        if (!answers.length || (answers.length === 1 && !answers[0].length)) {
            simpleAlert(
                localizeWithFallback('poll_alert_answer_missing', 'Please give an answer'),
                NotificationAlertType.DEFAULT,
                null,
                null,
                localizeWithFallback('win_error', 'Error!')
            );

            return;
        }

        answerPoll(content.id, question.questionId, answers);

        const choiceType = (content.npsPoll && question.questionType === POLL_QUESTION_RADIO && selected.length)
            ? (question.questionChoices[selected[0]]?.choiceType ?? POLL_CHOICE_NO_BRANCH)
            : POLL_CHOICE_NO_BRANCH;

        showQuestion(content, choiceType);
    };

    if (offer) {
        return (
            <OctaneCardView className="octane-widget-poll" theme="primary-slim">
                <OctaneCardHeaderView headerText={localizeWithFallback('poll_offer_title', 'Poll')} onCloseClick={rejectOffer} />
                <OctaneCardContentView gap={2}>
                    <Text bold>{offer.headline}</Text>
                    <Text>{offer.summary || localizeWithFallback('poll.default.summary', 'We\'d like to ask something...')}</Text>
                    <div className="flex gap-1 justify-end mt-auto">
                        <Button variant="secondary" onClick={() => setOffer(null)}>
                            {localizeWithFallback('poll_offer_later', 'Later...')}
                        </Button>
                        <Button variant="danger" disabled={offer.starting} onClick={rejectOffer}>
                            {localizeWithFallback('generic.cancel', 'Cancel')}
                        </Button>
                        <Button variant="success" disabled={offer.starting} onClick={acceptOffer}>
                            {localizeWithFallback('generic.ok', 'OK')}
                        </Button>
                    </div>
                </OctaneCardContentView>
            </OctaneCardView>
        );
    }

    if (!content?.question) return null;

    const question = content.question;
    const isChoice = question.questionType === POLL_QUESTION_RADIO || question.questionType === POLL_QUESTION_CHECKBOX;
    const pageNumber = Math.min(content.cursor.index + 1, Math.max(content.pageCount, 1));

    return (
        <OctaneCardView className="octane-widget-poll" theme="primary-slim">
            <OctaneCardHeaderView headerText={localizeWithFallback('poll_offer_window', 'Poll')} onCloseClick={cancelContent} />
            <OctaneCardContentView gap={2} overflow="hidden">
                {content.startMessage && <Text bold>{content.startMessage}</Text>}
                <Text small variant="muted">
                    {localizeWithFallback(
                        'poll_question_number',
                        `Question ${pageNumber}/${content.pageCount}`,
                        ['number', 'count'],
                        [pageNumber.toString(), content.pageCount.toString()]
                    )}
                </Text>
                <Text>{question.questionText}</Text>
                <Column gap={1} overflow="auto">
                    {isChoice && (question.questionChoices ?? []).map((choice, index) => (
                        <label key={index} className="flex items-center gap-2 cursor-pointer">
                            <input
                                checked={selected.includes(index)}
                                name={`poll-${content.id}-${question.questionId}`}
                                type={question.questionType === POLL_QUESTION_CHECKBOX ? 'checkbox' : 'radio'}
                                onChange={() => toggleChoice(index)}
                            />
                            <span>{choice.choiceText}</span>
                        </label>
                    ))}
                    {!isChoice && (
                        <input
                            className="form-control form-control-sm"
                            maxLength={MAX_TEXT_ANSWER_LENGTH}
                            type="text"
                            value={text}
                            onChange={(event) => setText(event.target.value)}
                            onKeyDown={(event) => event.key === 'Enter' && submitAnswer()}
                        />
                    )}
                </Column>
                <div className="flex gap-1 justify-end mt-auto">
                    <Button variant="secondary" onClick={cancelContent}>
                        {localizeWithFallback('generic.cancel', 'Cancel')}
                    </Button>
                    <Button variant="success" onClick={submitAnswer}>
                        {localizeWithFallback('generic.ok', 'OK')}
                    </Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
