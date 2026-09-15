import {
    CompetitionEntrySubmitResultEvent,
    CompetitionRoomsSearchMessageComposer,
    CompetitionVotingInfoMessageEvent,
    ForwardToASubmittableRoomMessageComposer,
    NavigatorOpenRoomCreatorEvent,
    RoomCompetitionInitMessageComposer,
    SubmitRoomToCompetitionMessageComposer,
    VoteForRoomMessageComposer
} from '@octane/renderer';
import { useEffect, useRef, useState } from 'react';
import { CreateLinkEvent, SendMessageComposer } from '../../../api';
import { useMessageEvent } from '../../events';
import { useRoom } from '../useRoom';

/** The confirm levels the official window walks, in order. */
export const COMPETITION_LEVEL_REFRESH = 0;
export const COMPETITION_LEVEL_ACCEPT_RULES = 1;
export const COMPETITION_LEVEL_SUBMIT = 2;
export const COMPETITION_LEVEL_CONFIRM = 3;

const HIDDEN_STORAGE_KEY = 'octane.roomcompetition.hidden';

export interface IRoomCompetitionState {
    mode: 'submit' | 'vote';
    goalId: number;
    goalCode: string;
    result: number;
    requiredFurnis: string[];
    missingFurnis: string[];
    votesRemaining: number;
}

/** The day, as the "don't show me this again today" switch stores it. */
const today = () => new Date().toISOString().slice(0, 10);

const isHiddenToday = () => {
    try {
        return window.localStorage.getItem(HIDDEN_STORAGE_KEY) === today();
    } catch {
        return false;
    }
};

const useRoomCompetitionState = () => {
    const [competition, setCompetition] = useState<IRoomCompetitionState>(null);
    const [noOwnedRooms, setNoOwnedRooms] = useState(false);

    /** Whether a submit is waiting for its answer; only then is the room creator packet ours. */
    const awaitingSubmitAnswer = useRef(false);
    const { roomSession = null } = useRoom();

    const close = () => setCompetition(null);

    const hideForToday = () => {
        try {
            window.localStorage.setItem(HIDDEN_STORAGE_KEY, today());
        } catch {
            // A viewer with site data blocked simply sees the window again.
        }

        close();
    };

    const send = (level: number) => {
        if (!competition) return;

        // The answer to a submit can be the room creator packet, which says "you have no room of
        // your own". Nothing else does, so the question has to be remembered to recognise it.
        awaitingSubmitAnswer.current = true;
        SendMessageComposer(new SubmitRoomToCompetitionMessageComposer(competition.goalCode, level));
    };

    const vote = () => {
        if (!competition) return;

        SendMessageComposer(new VoteForRoomMessageComposer(competition.goalCode));
    };

    const findSubmittableRoom = () => SendMessageComposer(new ForwardToASubmittableRoomMessageComposer());

    // The official window's "see all participants": the hotel answers with an ordinary navigator
    // search result, so the list lands where every other room list does.
    const showParticipants = () => {
        if (!competition) return;

        SendMessageComposer(new CompetitionRoomsSearchMessageComposer(competition.goalId, 0));
        CreateLinkEvent('navigator/show');
    };

    // The official client asks on every room entry, and stops asking for the day
    // once the visitor ticked "don't show me this again".
    useEffect(() => {
        setCompetition(null);

        if (!roomSession || isHiddenToday()) return;

        SendMessageComposer(new RoomCompetitionInitMessageComposer());
    }, [roomSession]);

    useMessageEvent<CompetitionEntrySubmitResultEvent>(CompetitionEntrySubmitResultEvent, (event) => {
        const parser = event.getParser();

        awaitingSubmitAnswer.current = false;
        const requiredFurnis = parser.requiredFurnis ?? [];

        setCompetition({
            mode: 'submit',
            goalId: parser.goalId,
            goalCode: parser.goalCode,
            result: parser.result,
            requiredFurnis,
            missingFurnis: requiredFurnis.filter((name) => parser.isMissing(name)),
            votesRemaining: 0
        });
    });

    useMessageEvent<CompetitionVotingInfoMessageEvent>(CompetitionVotingInfoMessageEvent, (event) => {
        const parser = event.getParser();

        setCompetition({
            mode: 'vote',
            goalId: parser.goalId,
            goalCode: parser.goalCode,
            result: parser.resultCode,
            requiredFurnis: [],
            missingFurnis: [],
            votesRemaining: parser.votesRemaining
        });
    });

    /**
     * The hotel answers "you have no room of your own" with the packet that opens the room creator:
     * one header, two meanings. Without the pending question this banner would appear every time
     * the navigator opens the creator for its own reasons.
     */
    useMessageEvent<NavigatorOpenRoomCreatorEvent>(NavigatorOpenRoomCreatorEvent, () => {
        if (!awaitingSubmitAnswer.current) return;

        awaitingSubmitAnswer.current = false;
        setNoOwnedRooms(true);
    });

    return {
        competition,
        noOwnedRooms,
        dismissNoOwnedRooms: () => setNoOwnedRooms(false),
        acceptRules: () => send(COMPETITION_LEVEL_ACCEPT_RULES),
        submitRoom: () => send(COMPETITION_LEVEL_SUBMIT),
        confirmSubmit: () => send(COMPETITION_LEVEL_CONFIRM),
        refresh: () => send(COMPETITION_LEVEL_REFRESH),
        vote,
        findSubmittableRoom,
        showParticipants,
        hideForToday,
        close
    };
};

export const useRoomCompetition = useRoomCompetitionState;
