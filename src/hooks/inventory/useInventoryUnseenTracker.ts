import { UnseenItemsEvent, UnseenResetCategoryComposer, UnseenResetItemsComposer } from '@octane/renderer';
import { useCallback, useMemo, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

const sendResetCategoryMessage = (category: number) => SendMessageComposer(new UnseenResetCategoryComposer(category));
const sendResetItemsMessage = (category: number, itemIds: number[]) => SendMessageComposer(new UnseenResetItemsComposer(category, ...itemIds));

const useInventoryUnseenTrackerState = () => {
    const [unseenItems, setUnseenItems] = useState<Map<number, number[]>>(new Map());

    const getCount = useCallback((category: number) => unseenItems.get(category)?.length || 0, [unseenItems]);

    const getFullCount = useMemo(() => {
        let count = 0;

        for (const key of unseenItems.keys()) count += getCount(key);

        return count;
    }, [unseenItems, getCount]);

    const resetCategory = useCallback((category: number) => {
        let didReset = true;

        setUnseenItems((prevValue) => {
            if (!prevValue.has(category)) {
                didReset = false;

                return prevValue;
            }

            const newValue = new Map(prevValue);

            newValue.delete(category);

            sendResetCategoryMessage(category);

            return newValue;
        });

        return didReset;
    }, []);

    const resetItems = useCallback((category: number, itemIds: number[]) => {
        let didReset = true;

        setUnseenItems((prevValue) => {
            if (!prevValue.has(category)) {
                didReset = false;

                return prevValue;
            }

            const newValue = new Map(prevValue);
            const existing = newValue.get(category);

            // Replace the per-category array instead of splicing the one still
            // referenced by the previous Map, and filter (an absent id used to
            // splice(indexOf=-1) and drop the wrong last element).
            if (existing)
                newValue.set(
                    category,
                    existing.filter((id) => !itemIds.includes(id))
                );

            sendResetItemsMessage(category, itemIds);

            return newValue;
        });

        return didReset;
    }, []);

    const isUnseen = useCallback(
        (category: number, itemId: number) => {
            if (!unseenItems.has(category)) return false;

            const items = unseenItems.get(category);

            return items.indexOf(itemId) >= 0;
        },
        [unseenItems]
    );

    const removeUnseen = useCallback((category: number, itemId: number) => {
        setUnseenItems((prevValue) => {
            if (!prevValue.has(category)) return prevValue;

            const newValue = new Map(prevValue);
            const items = newValue.get(category);

            // Clone the array rather than splicing the one shared with prevValue.
            if (items && items.indexOf(itemId) >= 0)
                newValue.set(
                    category,
                    items.filter((id) => id !== itemId)
                );

            return newValue;
        });
    }, []);

    useMessageEvent<UnseenItemsEvent>(UnseenItemsEvent, (event) => {
        const parser = event.getParser();

        setUnseenItems((prevValue) => {
            const newValue = new Map(prevValue);

            for (const category of parser.categories) {
                // Clone the existing array so we never push into the one still
                // referenced by the previous (shallow-copied) Map.
                const merged = [...(newValue.get(category) ?? [])];

                const itemIds = parser.getItemsByCategory(category);

                for (const itemId of itemIds) if (merged.indexOf(itemId) === -1) merged.push(itemId);

                newValue.set(category, merged);
            }

            return newValue;
        });
    });

    return { getCount, getFullCount, resetCategory, resetItems, isUnseen, removeUnseen };
};

export const useInventoryUnseenTracker = () => useSharedHook(useInventoryUnseenTrackerState);

registerSharedHook(useInventoryUnseenTrackerState);
