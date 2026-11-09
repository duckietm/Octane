import {
    ChatReviewGuideDecidesOnOfferMessageComposer,
    ChatReviewGuideDetachedMessageComposer,
    ChatReviewGuideVoteMessageComposer,
    ChatReviewSessionDetachedMessageEvent,
    ChatReviewSessionOfferedToGuideMessageEvent,
    ChatReviewSessionResultsMessageEvent,
    ChatReviewSessionStartedMessageEvent,
    ChatReviewSessionVotingStatusMessageEvent
} from '@octane/renderer';
import { useCallback, useReducer } from 'react';
import { GuideSessionState, IChatReviewRecord, parseChatReviewRecord, SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

/**
 * The guardian's side of a bully report, AIR GuideSessionController's five chat review states:
 * offered (accept or skip, with a countdown), waiting for the other voters, voting on the
 * anonymous chat log (with a countdown), waiting for the results, and the results.
 */
export interface IGuardianChatReviewState {
    /** One of the GuideSessionState.GUARDIAN_CHAT_REVIEW_* states, or null when there is no review. */
    state: string | null;
    /** The countdown of the current window, restarted whenever `countdownId` changes. */
    countdownSeconds: number;
    countdownId: number;
    record: IChatReviewRecord | null;
    /** This guardian's vote code (0 ok, 1 bad, 2 very bad), -2 before voting. */
    ownVote: number;
    /** The other guardians' statuses (ChatReviewSessionVotingStatus codes). */
    statuses: number[];
    /** The verdict's vote code, -1 for a review that ended without one. */
    winningVote: number;
}

export type GuardianChatReviewAction =
    | { type: 'offered'; acceptanceTimeout: number }
    | { type: 'accepted' }
    | { type: 'started'; votingTimeout: number; chatRecord: string }
    | { type: 'voted'; vote: number }
    | { type: 'status'; statuses: number[] }
    | { type: 'results'; winningVote: number; ownVote: number; statuses: number[] }
    | { type: 'closed' };

export const GUARDIAN_NO_VOTE = -2;

export const initialGuardianChatReviewState: IGuardianChatReviewState = {
    state: null,
    countdownSeconds: -1,
    countdownId: 0,
    record: null,
    ownVote: GUARDIAN_NO_VOTE,
    statuses: [],
    winningVote: GUARDIAN_NO_VOTE
};

export const guardianChatReviewReducer = (state: IGuardianChatReviewState, action: GuardianChatReviewAction): IGuardianChatReviewState => {
    switch (action.type) {
        case 'offered':
            return {
                ...initialGuardianChatReviewState,
                state: GuideSessionState.GUARDIAN_CHAT_REVIEW_ACCEPT,
                countdownSeconds: action.acceptanceTimeout,
                countdownId: state.countdownId + 1
            };
        case 'accepted':
            // The waiting window has no countdown of its own: the voting one starts with the log.
            return { ...state, state: GuideSessionState.GUARDIAN_CHAT_REVIEW_WAIT_FOR_VOTERS, countdownSeconds: -1, countdownId: state.countdownId + 1 };
        case 'started':
            return {
                ...state,
                state: GuideSessionState.GUARDIAN_CHAT_REVIEW_VOTE,
                countdownSeconds: action.votingTimeout,
                countdownId: state.countdownId + 1,
                record: parseChatReviewRecord(action.chatRecord)
            };
        case 'voted':
            return {
                ...state,
                state: GuideSessionState.GUARDIAN_CHAT_REVIEW_WAIT_FOR_RESULTS,
                countdownSeconds: -1,
                countdownId: state.countdownId + 1,
                ownVote: action.vote,
                statuses: []
            };
        case 'status':
            // AIR only draws the running tally in the "waiting for results" window.
            if (state.state !== GuideSessionState.GUARDIAN_CHAT_REVIEW_WAIT_FOR_RESULTS) return state;

            return { ...state, statuses: [...action.statuses] };
        case 'results':
            return {
                ...state,
                state: GuideSessionState.GUARDIAN_CHAT_REVIEW_RESULTS,
                countdownSeconds: -1,
                countdownId: state.countdownId + 1,
                winningVote: action.winningVote,
                ownVote: action.ownVote,
                statuses: [...action.statuses]
            };
        case 'closed':
            return { ...initialGuardianChatReviewState, countdownId: state.countdownId + 1 };
    }

    return state;
};

export const useGuardianChatReview = () => {
    const [review, dispatch] = useReducer(guardianChatReviewReducer, initialGuardianChatReviewState);

    useMessageEvent<ChatReviewSessionOfferedToGuideMessageEvent>(ChatReviewSessionOfferedToGuideMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser) dispatch({ type: 'offered', acceptanceTimeout: parser.acceptanceTimeout });
    });

    useMessageEvent<ChatReviewSessionStartedMessageEvent>(ChatReviewSessionStartedMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser) dispatch({ type: 'started', votingTimeout: parser.votingTimeout, chatRecord: parser.chatRecord });
    });

    useMessageEvent<ChatReviewSessionVotingStatusMessageEvent>(ChatReviewSessionVotingStatusMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser) dispatch({ type: 'status', statuses: parser.status ?? [] });
    });

    useMessageEvent<ChatReviewSessionResultsMessageEvent>(ChatReviewSessionResultsMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser) dispatch({ type: 'results', winningVote: parser.winningVoteCode, ownVote: parser.ownVoteCode, statuses: parser.finalStatus ?? [] });
    });

    useMessageEvent<ChatReviewSessionDetachedMessageEvent>(ChatReviewSessionDetachedMessageEvent, () => dispatch({ type: 'closed' }));

    /** accept_button: take the review and wait for the other guardians. */
    const accept = useCallback(() => {
        SendMessageComposer(new ChatReviewGuideDecidesOnOfferMessageComposer(true));
        dispatch({ type: 'accepted' });
    }, []);

    /** skip_link: "I can't help with this request". */
    const skip = useCallback(() => {
        SendMessageComposer(new ChatReviewGuideDecidesOnOfferMessageComposer(false));
        dispatch({ type: 'closed' });
    }, []);

    /** vote_ok / vote_bad / vote_very_bad. */
    const vote = useCallback((code: number) => {
        SendMessageComposer(new ChatReviewGuideVoteMessageComposer(code));
        dispatch({ type: 'voted', vote: code });
    }, []);

    /** close_link / close_button: leave the review; the server stops sending its updates. */
    const close = useCallback(() => {
        SendMessageComposer(new ChatReviewGuideDetachedMessageComposer());
        dispatch({ type: 'closed' });
    }, []);

    return { review, accept, skip, vote, close };
};
