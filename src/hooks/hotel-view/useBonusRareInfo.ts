import { BonusRareInfoMessageEvent, GetBonusRareInfoMessageComposer } from '@octane/renderer';
import { useEffect, useState } from 'react';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

export interface BonusRareInfo {
    productType: string;
    productClassId: number;
    totalCoinsForBonus: number;
    coinsStillRequiredToBuy: number;
}

/**
 * BonusRarePromoWidget: the bonus rare of the credits bonus bag (GetBonusRareInfo 957 ->
 * BonusRareInfo 1533). The server also pushes it after a purchase or a wired reward, so the bar
 * follows without asking again.
 */
export const useBonusRareInfo = () => {
    const [info, setInfo] = useState<BonusRareInfo>(null);

    useMessageEvent<BonusRareInfoMessageEvent>(BonusRareInfoMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        setInfo({
            productType: parser.productType ?? '',
            productClassId: parser.productClassId ?? -1,
            totalCoinsForBonus: parser.totalCoinsForBonus ?? 0,
            coinsStillRequiredToBuy: parser.coinsStillRequiredToBuy ?? 0
        });
    });

    useEffect(() => {
        SendMessageComposer(new GetBonusRareInfoMessageComposer());
    }, []);

    return { info };
};
