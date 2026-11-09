import {
    CommunityGoalData,
    CommunityGoalProgressMessageEvent,
    CommunityGoalVoteMessageComposer,
    CommunityGoalVoteMessageEvent,
    GetCommunityGoalProgressMessageComposer
} from '@octane/renderer';
import { useCallback, useEffect, useState } from 'react';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

/**
 * CommunityGoalWidget (+ VsMode, VsModeWithVoting): the server's community goal
 * (GetCommunityGoalProgress 1145 -> CommunityGoalProgress 2525) and its vote
 * (CommunityGoalVote 3536 -> acknowledgement 1435, which hides the vote buttons).
 */
export const useCommunityGoalProgress = () => {
    const [goal, setGoal] = useState<CommunityGoalData>(null);
    const [receivedAt, setReceivedAt] = useState(0);
    const [voted, setVoted] = useState(false);

    useMessageEvent<CommunityGoalProgressMessageEvent>(CommunityGoalProgressMessageEvent, (event) => {
        const data = event.getParser()?.data ?? null;

        setGoal(data);
        setReceivedAt(Date.now());
    });

    useMessageEvent<CommunityGoalVoteMessageEvent>(CommunityGoalVoteMessageEvent, (event) => {
        if (event.getParser()?.acknowledged) setVoted(true);
    });

    const requestProgress = useCallback(() => SendMessageComposer(new GetCommunityGoalProgressMessageComposer()), []);

    /** The vote buttons hide on click, before the server answers. */
    const vote = useCallback((option: number) => {
        setVoted(true);
        SendMessageComposer(new CommunityGoalVoteMessageComposer(option));
    }, []);

    useEffect(() => {
        requestProgress();
    }, [requestProgress]);

    return { goal, receivedAt, voted, vote, requestProgress };
};
