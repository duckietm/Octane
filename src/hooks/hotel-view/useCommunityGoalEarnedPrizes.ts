import {
    CommunityGoalEarnedPrizesMessageEvent,
    GetCommunityGoalEarnedPrizesMessageComposer,
    PrizeData,
    RedeemCommunityGoalPrizeMessageComposer
} from '@octane/renderer';
import { useCallback, useEffect, useState } from 'react';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

/**
 * The prizes of finished community goals (GetCommunityGoalEarnedPrizes 2688 ->
 * CommunityGoalEarnedPrizes 3319) and their redeem (RedeemCommunityGoalPrize 90, answered with the
 * list that is left). The redeem button stays disabled until that answer.
 */
export const useCommunityGoalEarnedPrizes = () => {
    const [prizes, setPrizes] = useState<PrizeData[]>([]);
    const [redeeming, setRedeeming] = useState(0);

    useMessageEvent<CommunityGoalEarnedPrizesMessageEvent>(CommunityGoalEarnedPrizesMessageEvent, (event) => {
        setPrizes(event.getParser()?.prizes ?? []);
        setRedeeming(0);
    });

    const redeem = useCallback((communityGoalId: number) => {
        setRedeeming(communityGoalId);
        SendMessageComposer(new RedeemCommunityGoalPrizeMessageComposer(communityGoalId));
    }, []);

    useEffect(() => {
        SendMessageComposer(new GetCommunityGoalEarnedPrizesMessageComposer());
    }, []);

    return { prizes, redeeming, redeem };
};
