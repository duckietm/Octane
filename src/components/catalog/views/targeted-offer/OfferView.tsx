import { GetTargetedOfferComposer, SetTargetedOfferStateComposer, TargetedOfferData, TargetedOfferEvent } from '@octane/renderer';
import { useEffect, useState } from 'react';
import { getTargetedOfferSecondsLeft, SendMessageComposer, TargetedOfferTrackingState } from '../../../../api';
import { useOctaneQuery } from '../../../../api/octane-query';
import { OfferBubbleView } from './OfferBubbleView';
import { OfferWindowView } from './OfferWindowView';

export const OfferView = () => {
    const { data: offer } = useOctaneQuery<TargetedOfferEvent, TargetedOfferData>({
        key: ['octane', 'catalog', 'targeted-offer'],
        request: () => new GetTargetedOfferComposer(),
        parser: TargetedOfferEvent,
        select: (evt) => evt.getParser()?.data ?? null,
        staleTime: Infinity
    });

    // null follows the state the server remembered: open unless the user minimized it last time.
    const [opened, setOpened] = useState<boolean>(null);
    const [now, setNow] = useState(() => Date.now());
    const hasExpiration = (offer?.expirationTime ?? 0) > 0;

    useEffect(() => {
        if (!hasExpiration) return;

        const interval = setInterval(() => setNow(Date.now()), 1000);

        return () => clearInterval(interval);
    }, [hasExpiration]);

    if (!offer || offer.trackingState === TargetedOfferTrackingState.REJECTED) return null;

    const secondsLeft = getTargetedOfferSecondsLeft(offer.expirationTime, now);

    if (secondsLeft === 0) return null;

    const isOpen = opened ?? offer.trackingState !== TargetedOfferTrackingState.MINIMIZED;

    const setOpen = (open: boolean) => {
        setOpened(open);
        SendMessageComposer(
            new SetTargetedOfferStateComposer(offer.id, open ? TargetedOfferTrackingState.MAXIMIZED : TargetedOfferTrackingState.MINIMIZED)
        );
    };

    return isOpen ? (
        <OfferWindowView offer={offer} secondsLeft={secondsLeft} onMinimize={() => setOpen(false)} />
    ) : (
        <OfferBubbleView offer={offer} secondsLeft={secondsLeft} onOpen={() => setOpen(true)} />
    );
};
