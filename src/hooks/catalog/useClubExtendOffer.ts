import { ClubOfferExtendData, HabboClubExtendConfirmMessageComposer, HabboClubExtendOfferMessageEvent } from '@octane/renderer';
import { useCallback, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

/**
 * The AIR 13 club extend confirmation (`ClubExtendController`). Clicking the extend promo
 * asks the server for the offer that would extend the running subscription (composer 352);
 * the answer carries the discounted price, the undiscounted comparison price and the days
 * still left, so the confirmation can say what the extension costs and what it saves before
 * anything is charged.
 */
const useClubExtendOfferState = () => {
    const [clubExtendOffer, setClubExtendOffer] = useState<ClubOfferExtendData>(null);

    useMessageEvent<HabboClubExtendOfferMessageEvent>(HabboClubExtendOfferMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        setClubExtendOffer(parser.offer);
    });

    const requestClubExtendOffer = useCallback(() => SendMessageComposer(new HabboClubExtendConfirmMessageComposer()), []);

    const clearClubExtendOffer = useCallback(() => setClubExtendOffer(null), []);

    return { clubExtendOffer, requestClubExtendOffer, clearClubExtendOffer };
};

export const useClubExtendOffer = () => useSharedHook(useClubExtendOfferState);

registerSharedHook(useClubExtendOfferState);
