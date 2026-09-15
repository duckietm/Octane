import { ChatStyleNotificationMessageEvent, PurchasableChatStylesMessageEvent } from '@octane/renderer';
import { useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { useMessageEvent } from '../events';

/**
 * The chat bubble styles this account bought (`SessionDataManager._purchasableChatStyles`).
 * The whole list arrives with the user data (event 946) and every later change on its own
 * (event 2580), so the chat style selector can offer them next to the styles `chat.styles`
 * already allows by rank, club or ambassador flag.
 */
const usePurchasableChatStylesState = () => {
    const [purchasableChatStyleIds, setPurchasableChatStyleIds] = useState<number[]>([]);

    useMessageEvent<PurchasableChatStylesMessageEvent>(PurchasableChatStylesMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        setPurchasableChatStyleIds([...parser.chatStyleIds]);
    });

    useMessageEvent<ChatStyleNotificationMessageEvent>(ChatStyleNotificationMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        setPurchasableChatStyleIds((styleIds) => {
            if (parser.added) return styleIds.indexOf(parser.styleId) >= 0 ? styleIds : [...styleIds, parser.styleId];

            return styleIds.filter((styleId) => styleId !== parser.styleId);
        });
    });

    return { purchasableChatStyleIds };
};

export const usePurchasableChatStyles = () => useSharedHook(usePurchasableChatStylesState);

registerSharedHook(usePurchasableChatStylesState);
