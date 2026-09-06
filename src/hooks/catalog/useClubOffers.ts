import { ClubOfferData, GetClubOffersMessageComposer, HabboClubOffersMessageEvent } from '@octane/renderer';
import { useEffect } from 'react';
import { SendMessageComposer } from '../../api';
import { useMessageEventState } from '../events';

const offersCache = new Map<number, ClubOfferData[]>();

export const useClubOffers = (windowId: number, options: { enabled?: boolean } = {}): { data: ClubOfferData[] | null } => {
    const enabled = options.enabled !== false;

    const data = useMessageEventState<HabboClubOffersMessageEvent, ClubOfferData[] | null>(
        HabboClubOffersMessageEvent,
        (event) => {
            const parser = event.getParser();
            if (!parser || parser.windowId !== windowId) return offersCache.get(windowId) ?? null;

            const offers = parser.offers || [];
            offersCache.set(windowId, offers);
            return offers;
        },
        () => offersCache.get(windowId) ?? null
    );

    useEffect(() => {
        if (!enabled) return;
        if (offersCache.has(windowId)) return;

        SendMessageComposer(new GetClubOffersMessageComposer(windowId));
    }, [enabled, windowId]);

    return { data };
};
