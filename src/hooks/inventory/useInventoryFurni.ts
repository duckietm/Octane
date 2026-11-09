import {
    FurnitureListAddOrUpdateEvent,
    FurnitureListComposer,
    FurnitureListEvent,
    FurnitureListInvalidateEvent,
    FurnitureListItemParser,
    FurnitureListRemovedEvent,
    FurnitureListRemoveMultipleEvent
} from '@octane/renderer';
import { SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { DispatchUiEvent, GroupItem, getGroupItemKey, mergeFurniFragments, SendMessageComposer, UnseenItemCategory } from '../../api';
import { InventoryFurniAddedEvent } from '../../events';
import { useMessageEvent } from '../events';
import { useSharedVisibility } from '../useSharedVisibility';
import {
    applyFurnitureListAddOrUpdate,
    applyFurnitureListRemoved,
    applyFurnitureListRemovedMany,
    applyMergedFurnitureList,
    clearUnseenFlags,
    FurniReducerContext,
    refreshGroupItemsLocalization
} from './useInventoryFurni.reducers';
import { useInventoryUnseenTracker } from './useInventoryUnseenTracker';

const useInventoryFurniState = () => {
    const [needsUpdate, setNeedsUpdate] = useState(true);
    const [groupItems, setGroupItems] = useState<GroupItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<GroupItem>(null);
    const fragmentsRef = useRef<Map<number, FurnitureListItemParser>[] | null>(null);
    const { isVisible = false, activate = null, deactivate = null } = useSharedVisibility();
    const { isUnseen = null, resetCategory = null } = useInventoryUnseenTracker();

    const getItemsByType = (type: number) => {
        if (!groupItems || !groupItems.length) return;

        return groupItems.filter((i) => i.type === type);
    };

    const getWallItemById = (id: number) => {
        if (!groupItems || !groupItems.length) return;

        for (const groupItem of groupItems) {
            const item = groupItem.getItemById(id);

            if (item && item.isWallItem) return groupItem;
        }

        return null;
    };

    const getFloorItemById = (id: number) => {
        if (!groupItems || !groupItems.length) return;

        for (const groupItem of groupItems) {
            const item = groupItem.getItemById(id);

            if (item && !item.isWallItem) return groupItem;
        }

        return null;
    };

    // The reducers queue side effects (placement cancel, "furni added" events). They run on the latest list here, in
    // the event handler, and the result is committed once: inside a state updater React may run them twice.
    const groupItemsRef = useRef(groupItems);
    groupItemsRef.current = groupItems;

    // Every change goes through the list the packets read. A functional update queued with React's own setter
    // reached the ref only at the next render, so a packet in the same turn (a trade lock, then an inventory
    // update) was applied to the list before it and the lock was lost.
    const updateGroupItems = useCallback((next: SetStateAction<GroupItem[]>) => {
        const value = typeof next === 'function' ? next(groupItemsRef.current) : next;

        if (value === groupItemsRef.current) return;

        groupItemsRef.current = value;
        setGroupItems(value);
    }, []);

    const buildContext = (): FurniReducerContext => ({
        isUnseen,
        dispatchAdded: (id, type, category) => queueMicrotask(() => DispatchUiEvent(new InventoryFurniAddedEvent(id, type, category)))
    });

    useMessageEvent<FurnitureListAddOrUpdateEvent>(FurnitureListAddOrUpdateEvent, (event) => {
        updateGroupItems(applyFurnitureListAddOrUpdate(groupItemsRef.current, event, buildContext()));
    });

    useMessageEvent<FurnitureListEvent>(FurnitureListEvent, (event) => {
        const parser = event.getParser();

        // Accumulate multi-fragment inventories HERE, in the event handler (runs once per packet),
        // not inside the setState updater (React double-invokes updaters). Only when the last
        // fragment completes the merge do we hand the finished map to the pure reducer.
        if (!fragmentsRef.current) fragmentsRef.current = new Array(parser.totalFragments);

        const merged = mergeFurniFragments(parser.fragment, parser.totalFragments, parser.fragmentNumber, fragmentsRef.current);

        if (!merged) return;

        fragmentsRef.current = null;

        const context = buildContext();

        updateGroupItems(applyMergedFurnitureList(groupItemsRef.current, merged, context));
    });

    useMessageEvent<FurnitureListInvalidateEvent>(FurnitureListInvalidateEvent, () => {
        setNeedsUpdate(true);
    });

    useMessageEvent<FurnitureListRemovedEvent>(FurnitureListRemovedEvent, (event) => {
        updateGroupItems(applyFurnitureListRemoved(groupItemsRef.current, event));
    });

    useMessageEvent<FurnitureListRemoveMultipleEvent>(FurnitureListRemoveMultipleEvent, (event) => {
        const itemIds = event.getParser().stripIds;

        updateGroupItems(applyFurnitureListRemovedMany(groupItemsRef.current, itemIds));
    });

    useEffect(() => {
        if (!groupItems || !groupItems.length) return;

        setSelectedItem((prevValue) => {
            if (!prevValue) return groupItems[0];

            // Same reference still present - keep it.
            if (groupItems.indexOf(prevValue) !== -1) return prevValue;

            // The reducers replace touched groups with clones, so the old reference goes stale on
            // any inventory change. Reconcile by stable identity instead of dropping to groupItems[0],
            // so the selection (and preview panel) doesn't jump to the first tile on every update.
            const key = getGroupItemKey(prevValue);
            const match = groupItems.find((group) => getGroupItemKey(group) === key);

            return match ?? groupItems[0];
        });
    }, [groupItems]);

    useEffect(() => {
        if (!isVisible) return;

        return () => {
            if (resetCategory(UnseenItemCategory.FURNI)) {
                updateGroupItems((prev) => clearUnseenFlags(prev));
            }
        };
    }, [isVisible, resetCategory, updateGroupItems]);

    useEffect(() => {
        if (!isVisible || !needsUpdate) return;

        SendMessageComposer(new FurnitureListComposer());

        setNeedsUpdate(false);
    }, [isVisible, needsUpdate]);

    useEffect(() => {
        const refreshFurnitureLocalization = () => {
            updateGroupItems((prev) => refreshGroupItemsLocalization(prev));

            setSelectedItem((prevValue) => {
                if (!prevValue) return prevValue;

                const nextGroupItem = prevValue.clone();

                nextGroupItem.refreshLocalization();

                return nextGroupItem;
            });
        };

        window.addEventListener('octane-localization-updated', refreshFurnitureLocalization);

        return () => window.removeEventListener('octane-localization-updated', refreshFurnitureLocalization);
    }, [updateGroupItems]);

    return {
        isVisible,
        groupItems,
        setGroupItems: updateGroupItems,
        selectedItem,
        setSelectedItem,
        activate,
        deactivate,
        getWallItemById,
        getFloorItemById,
        getItemsByType
    };
};

export const useInventoryFurni = () => useSharedHook(useInventoryFurniState);

registerSharedHook(useInventoryFurniState);
