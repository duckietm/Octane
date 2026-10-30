import {
    BotAddedToInventoryEvent,
    BotData,
    BotInventoryMessageEvent,
    BotRemovedFromInventoryEvent,
    CreateLinkEvent,
    GetBotInventoryComposer
} from '@octane/renderer';
import { useEffect, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { cancelRoomObjectPlacement, getPlacingItemId, IBotItem, SendMessageComposer, UnseenItemCategory } from '../../api';
import { useMessageEvent } from '../events';
import { useSharedVisibility } from '../useSharedVisibility';
import { useInventoryUnseenTracker } from './useInventoryUnseenTracker';

const useInventoryBotsState = () => {
    const [needsUpdate, setNeedsUpdate] = useState(true);
    const [botItems, setBotItems] = useState<IBotItem[]>([]);
    const [selectedBot, setSelectedBot] = useState<IBotItem>(null);
    const { isVisible = false, activate = null, deactivate = null } = useSharedVisibility();
    const { isUnseen = null, resetCategory = null } = useInventoryUnseenTracker();

    // Each change is worked out from the latest list and committed once; the placement side effects run outside any
    // state updater, which React may run twice (it cancelled the placement and opened the inventory twice).
    const botItemsRef = useRef(botItems);
    botItemsRef.current = botItems;

    const commitBotItems = (next: IBotItem[]) => {
        botItemsRef.current = next;
        setBotItems(next);
    };

    useMessageEvent<BotInventoryMessageEvent>(BotInventoryMessageEvent, (event) => {
        const parser = event.getParser();
        const newValue = [...botItemsRef.current];
        const existingIds = newValue.map((item) => item.botData.id);
        const addedDatas: BotData[] = [];
        let placingRemoved = false;

        for (const botData of parser.items.values()) existingIds.indexOf(botData.id) === -1 && addedDatas.push(botData);

        for (const existingId of existingIds) {
            let remove = true;

            for (const botData of parser.items.values()) {
                if (botData.id === existingId) {
                    remove = false;

                    break;
                }
            }

            if (!remove) continue;

            const index = newValue.findIndex((item) => item.botData.id === existingId);
            const botItem = newValue[index];

            if (index === -1 || !botItem) continue;

            if (getPlacingItemId() === botItem.botData.id) placingRemoved = true;

            newValue.splice(index, 1);
        }

        for (const botData of addedDatas) {
            const botItem = { botData };
            const unseen = isUnseen(UnseenItemCategory.BOT, botData.id);

            if (unseen) newValue.unshift(botItem);
            else newValue.push(botItem);
        }

        commitBotItems(newValue);

        if (placingRemoved) {
            cancelRoomObjectPlacement();

            CreateLinkEvent('inventory/open');
        }
    });

    useMessageEvent<BotAddedToInventoryEvent>(BotAddedToInventoryEvent, (event) => {
        const parser = event.getParser();
        const prevValue = botItemsRef.current;

        if (prevValue.some((item) => item.botData.id === parser.item.id)) return;

        const newValue = [...prevValue];
        const botItem = { botData: parser.item };
        const unseen = isUnseen(UnseenItemCategory.BOT, botItem.botData.id);

        if (unseen) newValue.unshift(botItem);
        else newValue.push(botItem);

        commitBotItems(newValue);
    });

    useMessageEvent<BotRemovedFromInventoryEvent>(BotRemovedFromInventoryEvent, (event) => {
        const parser = event.getParser();
        const index = botItemsRef.current.findIndex((item) => item.botData.id === parser.itemId);

        if (index === -1) return;

        const newValue = [...botItemsRef.current];

        newValue.splice(index, 1);
        commitBotItems(newValue);

        if (getPlacingItemId() === parser.itemId) {
            cancelRoomObjectPlacement();

            CreateLinkEvent('inventory/show');
        }
    });

    useEffect(() => {
        if (!botItems || !botItems.length) return;

        setSelectedBot((prevValue) => {
            let newValue = prevValue;

            if (newValue && botItems.indexOf(newValue) === -1) newValue = null;

            if (!newValue) newValue = botItems[0];

            return newValue;
        });
    }, [botItems]);

    useEffect(() => {
        if (!isVisible) return;

        return () => {
            resetCategory(UnseenItemCategory.BOT);
        };
    }, [isVisible, resetCategory]);

    useEffect(() => {
        if (!isVisible || !needsUpdate) return;

        SendMessageComposer(new GetBotInventoryComposer());

        setNeedsUpdate(false);
    }, [isVisible, needsUpdate]);

    return { botItems, selectedBot, setSelectedBot, activate, deactivate };
};

export const useInventoryBots = () => useSharedHook(useInventoryBotsState);

registerSharedHook(useInventoryBotsState);
