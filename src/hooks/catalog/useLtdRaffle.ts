import { LtdRaffleEnteredMessageEvent, LtdRaffleResultMessageEvent } from '@octane/renderer';
import { useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { localizeWithFallback, NotificationBubbleType } from '../../api';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';

/**
 * The AIR 13 limited-edition raffle (`HabboCatalog.onLtdRaffleEntered` /
 * `onLtdRaffleResult`). A purchase that goes into a raffle keeps the confirmation dialog
 * open with its "hold on" line running until the draw; the result closes the dialog and
 * posts the won/lost notification the official client posts with the "ltd" bubble.
 */
const useLtdRaffleState = () => {
    const [raffleClassName, setRaffleClassName] = useState<string>(null);
    const { showSingleBubble = null } = useNotification();

    useMessageEvent<LtdRaffleEnteredMessageEvent>(LtdRaffleEnteredMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        setRaffleClassName(parser.className);
    });

    useMessageEvent<LtdRaffleResultMessageEvent>(LtdRaffleResultMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        setRaffleClassName(null);

        showSingleBubble(
            parser.hasWon
                ? localizeWithFallback('notification.raffle.won', 'You won the raffle and got the LTD item!')
                : localizeWithFallback('notification.raffle.lost', 'Somebody else won the raffle for this LTD item.'),
            NotificationBubbleType.LTD
        );
    });

    return { raffleActive: raffleClassName !== null, raffleClassName };
};

export const useLtdRaffle = () => useSharedHook(useLtdRaffleState);

registerSharedHook(useLtdRaffleState);
