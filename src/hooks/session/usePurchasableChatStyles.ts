import { ChatStyleNotificationMessageEvent, PurchasableChatStylesMessageEvent } from '@octane/renderer';
import { useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { useMessageEvent } from '../events';

/** AIR SessionDataManager.onPurchasableChatStyles (event 946): the whole owned list replaces the old one. */
export const applyPurchasableChatStyles = (styleIds: readonly number[]): number[] => {
    const next: number[] = [];

    for (const styleId of styleIds ?? []) {
        if (Number.isInteger(styleId) && !next.includes(styleId)) next.push(styleId);
    }

    return next;
};

/**
 * AIR SessionDataManager.onPurchasableChatStyleChanged (event 2580). AIR only ever adds; the
 * server also sends `added = false` when staff take a style back, so that removes it here.
 */
export const applyChatStyleNotification = (current: readonly number[], added: boolean, styleId: number): readonly number[] => {
    const owned = current.includes(styleId);

    if (added) return owned ? current : [...current, styleId];

    return owned ? current.filter((id) => id !== styleId) : current;
};

const usePurchasableChatStylesState = () => {
    const [ownedStyleIds, setOwnedStyleIds] = useState<readonly number[]>([]);

    useMessageEvent<PurchasableChatStylesMessageEvent>(PurchasableChatStylesMessageEvent, (event) => {
        setOwnedStyleIds(applyPurchasableChatStyles(event.getParser().chatStyleIds));
    });

    useMessageEvent<ChatStyleNotificationMessageEvent>(ChatStyleNotificationMessageEvent, (event) => {
        const parser = event.getParser();

        setOwnedStyleIds((current) => applyChatStyleNotification(current, parser.added, parser.styleId));
    });

    return { ownedStyleIds };
};

/** The purchasable chat bubble styles this account owns (AIR `hasPurchasableChatStyle`). */
export const usePurchasableChatStyles = () => useSharedHook(usePurchasableChatStylesState).ownedStyleIds;

registerSharedHook(usePurchasableChatStylesState);
