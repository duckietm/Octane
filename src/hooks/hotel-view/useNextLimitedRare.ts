import { GetLimitedOfferAppearingNextComposer, LimitedOfferAppearingNextMessageEvent } from '@octane/renderer';
import { useCallback, useEffect, useState } from 'react';
import { SendMessageComposer } from '../../api';
import { NEXT_LIMITED_RARE_REFRESH_MS } from '../../api/hotel-view/LandingViewWidgets';
import { useMessageEvent } from '../events';

export interface NextLimitedRare {
    appearsInSeconds: number;
    pageId: number;
    offerId: number;
    productType: string;
    receivedAt: number;
}

/**
 * NextLimitedRareCountdownWidget: the next limited rare (GetLimitedOfferAppearingNext 410 ->
 * LimitedOfferAppearingNext 44): a countdown, then the page and offer once it is out. The widget
 * asks again every thirty seconds and when the countdown runs out.
 */
export const useNextLimitedRare = (enabled: boolean) => {
    const [rare, setRare] = useState<NextLimitedRare>(null);

    useMessageEvent<LimitedOfferAppearingNextMessageEvent>(LimitedOfferAppearingNextMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        setRare({
            appearsInSeconds: parser.appearsInSeconds ?? -1,
            pageId: parser.pageId ?? -1,
            offerId: parser.offerId ?? -1,
            productType: parser.productType ?? '',
            receivedAt: Date.now()
        });
    });

    const request = useCallback(() => SendMessageComposer(new GetLimitedOfferAppearingNextComposer()), []);

    useEffect(() => {
        if (!enabled) return;

        request();

        const interval = window.setInterval(request, NEXT_LIMITED_RARE_REFRESH_MS);

        return () => window.clearInterval(interval);
    }, [enabled, request]);

    // _rcc601b2adde9c2: one more request a second after the countdown ends.
    useEffect(() => {
        if (!enabled || !rare || rare.appearsInSeconds <= 0) return;

        const timeout = window.setTimeout(request, (rare.appearsInSeconds + 1) * 1000);

        return () => window.clearTimeout(timeout);
    }, [enabled, rare, request]);

    return { rare };
};
