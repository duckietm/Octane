import { CreateLinkEvent, GetSessionDataManager } from '@octane/renderer';
import { FC, ReactNode, useEffect, useState } from 'react';
import { localizeWithFallback } from '../../../api';
import { getCountdownParts, getNextLimitedRareMode, getSecondsLeft, padCountdown } from '../../../api/hotel-view/LandingViewWidgets';
import { BaseButton } from '../../../common/BaseButton';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { useNextLimitedRare } from '../../../hooks';

/**
 * NextLimitedRareCountdownWidget (next_ltd_available.xml) fed by LimitedOfferAppearingNext: the
 * countdown to the next limited rare, then a "get" button with the rare's name that opens its offer.
 * Without an answer (the emulator's countdown is off) the slot keeps its configured countdown.
 */
export const HotelViewNextLimitedRareWidget: FC<{ fallback: ReactNode; title: string; body: string }> = ({ fallback, title, body }) => {
    const { rare = null } = useNextLimitedRare(true);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const interval = window.setInterval(() => setNow(Date.now()), 1000);

        return () => window.clearInterval(interval);
    }, []);

    if (!rare) return <>{fallback}</>;

    const seconds = getSecondsLeft(rare.appearsInSeconds, rare.receivedAt, now);
    const mode = getNextLimitedRareMode(seconds, rare.pageId);

    if (mode === 'hidden') return <>{fallback}</>;

    const countdown = getCountdownParts(seconds);
    const productName = rare.productType ? (GetSessionDataManager().getProductData(rare.productType)?.name ?? GetSessionDataManager().getFloorItemDataByName(rare.productType)?.name ?? '') : '';

    const open = () => {
        if (rare.offerId > 0) CreateLinkEvent(`catalog/open/offerId/${rare.offerId}`);
        else if (rare.pageId > 0) CreateLinkEvent(`catalog/open/${rare.pageId}`);
    };

    return (
        <NativeTextTree>
            <>
                <h2>{localizeWithFallback('landing.view.next.ltd.header', title || 'Next limited rare')}</h2>
                {body && <p>{body}</p>}
                {mode === 'countdown' && (
                    <strong className="hotelview-countdown hotelview-ltd-countdown">
                        <span className="hotelview-ltd-countdown-values">
                            {padCountdown(countdown.days)}:{padCountdown(countdown.hours)}:{padCountdown(countdown.minutes)}:{padCountdown(countdown.seconds)}
                        </span>
                        <small>Days Hours Minutes Seconds</small>
                    </strong>
                )}
                {mode === 'available' && (
                    <BaseButton type="button" onClick={open}>
                        {productName || localizeWithFallback('landing.view.next.ltd.get', 'Get it now!')}
                    </BaseButton>
                )}
                <BaseButton type="button" onClick={open} disabled={mode !== 'available'}>
                    {localizeWithFallback('landing.view.next.ltd.opencatalogue', 'Open catalogue')}
                </BaseButton>
            </>
        </NativeTextTree>
    );
};
