import { CatalogPageMessageOfferData, ClubGiftData, ClubGiftInfoEvent, ClubGiftInfoParser, GetClubGiftInfo } from '@octane/renderer';
import { useEffect, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

/** The club gift page's state as one message left it. */
export interface ClubGiftsSnapshot {
    daysUntilNextGift: number;
    giftsAvailable: number;
    offers: CatalogPageMessageOfferData[];
    getOfferExtraData(offerId: number): ClubGiftData;
}

/**
 * A copy of the parser's values. The renderer reuses one parser object for every ClubGiftInfoEvent, so keeping the
 * parser itself would hand React the same object after each message and the page would not redraw: the number of
 * gifts left stayed as it was after a gift was taken.
 */
export const snapshotClubGifts = (parser: ClubGiftInfoParser | null | undefined): ClubGiftsSnapshot | null => {
    if (!parser) return null;

    const giftData = new Map(parser.giftData ?? []);

    return {
        daysUntilNextGift: parser.daysUntilNextGift ?? 0,
        giftsAvailable: parser.giftsAvailable ?? 0,
        offers: [...(parser.offers ?? [])],
        getOfferExtraData: (offerId: number) => giftData.get(offerId) ?? null
    };
};

/**
 * Habbo Club gifts: how many may be taken, the days until the next one and the gift list. The server answers
 * GetClubGiftInfo and sends the same message again after a gift is taken; every message replaces the state. Shared
 * and registered, so the listener is there whichever window asks.
 */
const useClubGiftsState = () => {
    const [data, setData] = useState<ClubGiftsSnapshot | null>(null);

    useMessageEvent<ClubGiftInfoEvent>(ClubGiftInfoEvent, (event) => setData(snapshotClubGifts(event.getParser())));

    return { data };
};

export const useClubGifts = (options: { enabled?: boolean } = {}): { data: ClubGiftsSnapshot | null } => {
    const { enabled = true } = options;
    const shared = useSharedHook(useClubGiftsState);

    // Asked each time a consumer opens: the gifts may have changed since the last answer.
    useEffect(() => {
        if (!enabled) return;

        SendMessageComposer(new GetClubGiftInfo());
    }, [enabled]);

    return { data: shared?.data ?? null };
};

registerSharedHook(useClubGiftsState);
