import { IPollQuestion } from '@octane/renderer';
import { useCallback, useRef, useState } from 'react';
import { localizeWithFallback, NotificationAlertType, RoomWidgetPollUpdateEvent } from '../../../api';
import { useUiEvent } from '../../events';
import { useNotification } from '../../notification';
import { usePollActions } from './usePollActions';

/** `PollOfferDialog` states: the offer buttons answer only once. */
export type PollOfferState = 'unknown' | 'ok' | 'cancel';

export interface PollSessionState {
    id: number;
    /** `PollSession.showOffer` / `showContent`: which window is up. */
    stage: 'offer' | 'content';
    offerState: PollOfferState;
    headline: string;
    summary: string;
    startMessage: string;
    endMessage: string;
    questions: IPollQuestion[];
    npsPoll: boolean;
}

/**
 * `PollWidget` + `PollSession` of the official client: one session per poll id, created by the
 * offer, replaced by the content, gone when the poll is finished, rejected or postponed. The
 * three renderer events reach this hook through the UI bus (`usePollSubscriptions`).
 */
const usePollSessionsState = () => {
    const [sessions, setSessions] = useState<PollSessionState[]>([]);
    const sessionsRef = useRef<PollSessionState[]>(sessions);
    const { startPoll = null, rejectPoll = null, answerPoll = null } = usePollActions();
    const { simpleAlert = null } = useNotification();

    sessionsRef.current = sessions;

    const removeSession = useCallback((pollId: number) => setSessions((prevValue) => prevValue.filter((session) => session.id !== pollId)), []);

    useUiEvent<RoomWidgetPollUpdateEvent>(RoomWidgetPollUpdateEvent.OFFER, (event) => {
        setSessions((prevValue) => {
            const offer: PollSessionState = {
                id: event.id,
                stage: 'offer',
                offerState: 'unknown',
                headline: event.headline ?? '',
                summary: event.summary ?? '',
                startMessage: '',
                endMessage: '',
                questions: [],
                npsPoll: false
            };

            // The official widget logs "Poll with given id already exists!" and shows the offer again.
            return [...prevValue.filter((session) => session.id !== event.id), offer];
        });
    });

    useUiEvent<RoomWidgetPollUpdateEvent>(RoomWidgetPollUpdateEvent.ERROR, (event) => {
        simpleAlert?.(event.summary ?? '', NotificationAlertType.DEFAULT, null, null, localizeWithFallback('win_error', 'Error!'));
    });

    useUiEvent<RoomWidgetPollUpdateEvent>(RoomWidgetPollUpdateEvent.CONTENT, (event) => {
        setSessions((prevValue) => {
            const existing = prevValue.find((session) => session.id === event.id);

            // `PollWidget.showPollContent`: content for a poll that was never offered is dropped.
            if (!existing) return prevValue;

            const content: PollSessionState = {
                ...existing,
                stage: 'content',
                startMessage: event.startMessage ?? '',
                endMessage: event.endMessage ?? '',
                questions: event.questionArray ?? [],
                npsPoll: !!event.npsPoll
            };

            return prevValue.map((session) => (session.id === event.id ? content : session));
        });
    });

    /** OK on the offer: ask for the content; the offer stays up until it arrives. */
    const acceptOffer = useCallback(
        (pollId: number) => {
            setSessions((prevValue) =>
                prevValue.map((session) => (session.id === pollId && session.offerState === 'unknown' ? { ...session, offerState: 'ok' } : session))
            );

            startPoll?.(pollId);
        },
        [startPoll]
    );

    /** "Cancel..." and the header close on the offer: the server hears the rejection. */
    const rejectOffer = useCallback(
        (pollId: number) => {
            rejectPoll?.(pollId);
            removeSession(pollId);
        },
        [rejectPoll, removeSession]
    );

    /** "Later...": the window goes away and nothing is sent. */
    const postponeOffer = useCallback((pollId: number) => removeSession(pollId), [removeSession]);

    const answerQuestion = useCallback((pollId: number, questionId: number, answers: string[]) => answerPoll?.(pollId, questionId, answers), [answerPoll]);

    /** The cancel confirmation was accepted: `PollWidget.pollCancelled`, no packet. */
    const cancelPoll = useCallback((pollId: number) => removeSession(pollId), [removeSession]);

    /** Past the last question: `PollWidget.pollFinished` shows the thanks alert with the end message. */
    const finishPoll = useCallback(
        (pollId: number) => {
            const session = sessionsRef.current.find((entry) => entry.id === pollId);

            if (session) simpleAlert?.(session.endMessage, NotificationAlertType.DEFAULT, null, null, localizeWithFallback('poll_thanks_title', 'Thanks!'));

            removeSession(pollId);
        },
        [simpleAlert, removeSession]
    );

    return { sessions, acceptOffer, rejectOffer, postponeOffer, answerQuestion, cancelPoll, finishPoll };
};

export const usePollSessions = usePollSessionsState;
