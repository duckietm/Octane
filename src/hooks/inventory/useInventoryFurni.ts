import {
    FurnitureListAddOrUpdateEvent,
    FurnitureListComposer,
    FurnitureListEvent,
    FurnitureListInvalidateEvent,
    FurnitureListItemParser,
    FurnitureListRemovedEvent
} from '@octane/renderer';
import { useEffect, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { DispatchUiEvent, getGroupItemKey, GroupItem, mergeFurniFragments, SendMessageComposer, UnseenItemCategory } from '../../api';
import { InventoryFurniAddedEvent } from '../../events';
import { useMessageEvent } from '../events';
import { useSharedVisibility } from '../useSharedVisibility';
import {
    applyFurnitureListAddOrUpdate,
    applyFurnitureListRemoved,
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

    const buildContext = (): FurniReducerContext => ({
        isUnseen,
        dispatchAdded: (id, type, category) => queueMicrotask(() => DispatchUiEvent(new InventoryFurniAddedEvent(id, type, category)))
    });

    useMessageEvent<FurnitureListAddOrUpdateEvent>(FurnitureListAddOrUpdateEvent, (event) => {
        setGroupItems((prev) => applyFurnitureListAddOrUpdate(prev, event, buildContext()));
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

        setGroupItems((prev) => applyMergedFurnitureList(prev, merged, context));
    });

    useMessageEvent<FurnitureListInvalidateEvent>(FurnitureListInvalidateEvent, () => {
        setNeedsUpdate(true);
    });

    useMessageEvent<FurnitureListRemovedEvent>(FurnitureListRemovedEvent, (event) => {
        setGroupItems((prev) => applyFurnitureListRemoved(prev, event));
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
                setGroupItems((prev) => clearUnseenFlags(prev));
            }
        };
    }, [isVisible, resetCategory]);

    useEffect(() => {
        if (!isVisible || !needsUpdate) return;

        SendMessageComposer(new FurnitureListComposer());

        setNeedsUpdate(false);
    }, [isVisible, needsUpdate]);

    useEffect(() => {
        const refreshFurnitureLocalization = () => {
            setGroupItems((prev) => refreshGroupItemsLocalization(prev));

            setSelectedItem((prevValue) => {
                if (!prevValue) return prevValue;

                const nextGroupItem = prevValue.clone();

                nextGroupItem.refreshLocalization();

                return nextGroupItem;
            });
        };

        window.addEventListener('octane-localization-updated', refreshFurnitureLocalization);

        return () => window.removeEventListener('octane-localization-updated', refreshFurnitureLocalization);
    }, []);

    return { isVisible, groupItems, setGroupItems, selectedItem, setSelectedItem, activate, deactivate, getWallItemById, getFloorItemById, getItemsByType };
};

export const useInventoryFurni = () => useSharedHook(useInventoryFurniState);

registerSharedHook(useInventoryFurniState);
