import { ConcurrentUsersGoalProgressMessageEvent, GetConcurrentUsersGoalProgressMessageComposer, GetConcurrentUsersRewardMessageComposer } from '@octane/renderer';
import { useCallback, useEffect, useState } from 'react';
import { SendMessageComposer } from '../../api';
import { CONCURRENT_USERS_POLL_MS, getConcurrentUsersView } from '../../api/hotel-view/LandingViewWidgets';
import { useMessageEvent } from '../events';

/**
 * ConcurrentUsersInfoElementHandler: the users-online goal (GetConcurrentUsersGoalProgress 1343 ->
 * ConcurrentUsersGoalProgress 2737), polled every five seconds until it is reached, and its reward
 * (GetConcurrentUsersReward 3872).
 */
export const useConcurrentUsersGoal = () => {
    const [state, setState] = useState(-1);
    const [userCount, setUserCount] = useState(-1);
    const [userCountGoal, setUserCountGoal] = useState(-1);
    const [claiming, setClaiming] = useState(false);

    useMessageEvent<ConcurrentUsersGoalProgressMessageEvent>(ConcurrentUsersGoalProgressMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        setState(parser.state);
        setUserCount(parser.userCount);
        setUserCountGoal(parser.userCountGoal);
        setClaiming(false);
    });

    const requestProgress = useCallback(() => SendMessageComposer(new GetConcurrentUsersGoalProgressMessageComposer()), []);

    /** onClick: claim, ask again, and keep the button disabled until the answer. */
    const claimReward = useCallback(() => {
        setClaiming(true);
        SendMessageComposer(new GetConcurrentUsersRewardMessageComposer());
        SendMessageComposer(new GetConcurrentUsersGoalProgressMessageComposer());
    }, []);

    const polling = getConcurrentUsersView(state).polling;

    useEffect(() => {
        requestProgress();
    }, [requestProgress]);

    useEffect(() => {
        if (!polling) return;

        const interval = window.setInterval(requestProgress, CONCURRENT_USERS_POLL_MS);

        return () => window.clearInterval(interval);
    }, [polling, requestProgress]);

    return { state, userCount, userCountGoal, claiming, claimReward };
};
