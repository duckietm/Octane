import {
    CommunityGoalHallOfFameData,
    CommunityGoalHallOfFameMessageEvent,
    CurrentTimingCodeMessageEvent,
    GetCommunityGoalHallOfFameMessageComposer,
    GetCurrentTimingCodeMessageComposer
} from '@octane/renderer';
import { useEffect, useState } from 'react';
import { SendMessageComposer } from '../../api';
import { acceptTimingCode } from '../../api/hotel-view/LandingViewWidgets';
import { useMessageEvent } from '../events';

/**
 * CommunityGoalHallOfFameWidget: the slot's schedule (`landing.view.dynamic.slot.<n>.conf`) is sent
 * as GetCurrentTimingCode 2912; the CurrentTimingCode 1745 answer for that schedule names the goal,
 * which is asked with GetCommunityGoalHallOfFame 2167 -> CommunityGoalHallOfFame 3005.
 *
 * `goalCode` (the slot's own code, or the active community goal) skips the schedule. Only the answer
 * for the code asked is kept: the server also sends the legacy hall of fame with the news list.
 */
export const useCommunityGoalHallOfFame = (goalCode: string, schedulingStr: string) => {
    const [data, setData] = useState<CommunityGoalHallOfFameData>(null);
    const [requestedCode, setRequestedCode] = useState('');

    useMessageEvent<CommunityGoalHallOfFameMessageEvent>(CommunityGoalHallOfFameMessageEvent, (event) => {
        const next = event.getParser()?.data ?? null;

        if (!next || !requestedCode || next.goalCode !== requestedCode) return;

        setData(next);
    });

    useMessageEvent<CurrentTimingCodeMessageEvent>(CurrentTimingCodeMessageEvent, (event) => {
        if (!schedulingStr) return;

        const parser = event.getParser();

        if (!parser || !acceptTimingCode(schedulingStr, parser.schedulingStr, parser.code)) return;

        setRequestedCode(parser.code);
        SendMessageComposer(new GetCommunityGoalHallOfFameMessageComposer(parser.code));
    });

    useEffect(() => {
        if (schedulingStr) {
            SendMessageComposer(new GetCurrentTimingCodeMessageComposer(schedulingStr));
            return;
        }

        if (!goalCode) return;

        setRequestedCode(goalCode);
        SendMessageComposer(new GetCommunityGoalHallOfFameMessageComposer(goalCode));
    }, [goalCode, schedulingStr]);

    return data;
};
