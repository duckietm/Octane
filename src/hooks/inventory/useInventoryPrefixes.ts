import {
    ActivePrefixUpdatedEvent,
    DeletePrefixComposer,
    PrefixReceivedEvent,
    RequestPrefixesComposer,
    SetActivePrefixComposer,
    UserNickIconsEvent,
    UserPrefixesEvent
} from '@octane/renderer';
import { useEffect, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { IPrefixItem, SendMessageComposer, UnseenItemCategory } from '../../api';
import { useMessageEvent } from '../events';
import { useSharedVisibility } from '../useSharedVisibility';
import { useInventoryUnseenTracker } from './useInventoryUnseenTracker';

const useInventoryPrefixesState = () => {
    const [needsUpdate, setNeedsUpdate] = useState(true);
    const [prefixes, setPrefixes] = useState<IPrefixItem[]>([]);
    const [activePrefix, setActivePrefix] = useState<IPrefixItem | null>(null);
    const [selectedPrefix, setSelectedPrefix] = useState<IPrefixItem | null>(null);
    const { isVisible = false, activate = null, deactivate = null } = useSharedVisibility();
    const { isUnseen = null, resetCategory = null } = useInventoryUnseenTracker();

    useMessageEvent<UserPrefixesEvent>(UserPrefixesEvent, (event) => {
        const parser = event.getParser();
        const newPrefixes: IPrefixItem[] = parser.prefixes.map((p) => ({
            id: p.id,
            text: p.text,
            color: p.color,
            icon: p.icon || '',
            effect: p.effect || '',
            font: p.font || '',
            active: p.active
        }));

        setPrefixes(newPrefixes);

        const active = newPrefixes.find((p) => p.active) || null;
        setActivePrefix(active);
    });

    useMessageEvent<UserNickIconsEvent>(UserNickIconsEvent, (event) => {
        const parser = event.getParser();
        const newPrefixes: IPrefixItem[] = parser.ownedPrefixes.map((prefix) => ({
            id: prefix.id,
            displayName: prefix.displayName,
            text: prefix.text,
            color: prefix.color,
            icon: prefix.icon || '',
            effect: prefix.effect || '',
            font: prefix.font || '',
            active: prefix.active,
            isCustom: prefix.isCustom,
            points: prefix.points,
            pointsType: prefix.pointsType,
            catalogPrefixId: prefix.catalogPrefixId
        }));

        setPrefixes(newPrefixes);
        setActivePrefix(newPrefixes.find((prefix) => prefix.active) || null);
    });

    useMessageEvent<PrefixReceivedEvent>(PrefixReceivedEvent, (event) => {
        const parser = event.getParser();
        const newPrefix: IPrefixItem = {
            id: parser.id,
            text: parser.text,
            color: parser.color,
            icon: parser.icon || '',
            effect: parser.effect || '',
            font: parser.font || '',
            active: false
        };

        setPrefixes((prevValue) => [newPrefix, ...prevValue]);
    });

    useMessageEvent<ActivePrefixUpdatedEvent>(ActivePrefixUpdatedEvent, (event) => {
        const parser = event.getParser();

        setPrefixes((prevValue) => {
            const next = prevValue.map((p) => ({
                ...p,
                active: p.id === parser.prefixId
            }));

            // Derive the active prefix from the freshly-mapped list, not from
            // the `prefixes` closure (which lags a render and is stale when the
            // prefix was added earlier in the same event batch).
            if (parser.prefixId === 0) {
                setActivePrefix(null);
            } else {
                const found = next.find((p) => p.id === parser.prefixId);

                setActivePrefix(
                    found
                        ? { ...found, active: true, font: parser.font || found.font || '' }
                        : {
                              id: parser.prefixId,
                              text: parser.text,
                              color: parser.color,
                              icon: parser.icon || '',
                              effect: parser.effect || '',
                              font: parser.font || '',
                              active: true
                          }
                );
            }

            return next;
        });
    });

    const activatePrefix = (prefixId: number) => {
        SendMessageComposer(new SetActivePrefixComposer(prefixId));
    };

    const deactivatePrefix = () => {
        SendMessageComposer(new SetActivePrefixComposer(0));
    };

    const deletePrefix = (prefixId: number) => {
        SendMessageComposer(new DeletePrefixComposer(prefixId));
    };

    useEffect(() => {
        if (!prefixes || !prefixes.length) return;

        setSelectedPrefix((prevValue) => {
            if (prevValue && prefixes.find((p) => p.id === prevValue.id)) return prevValue;
            return prefixes[0];
        });
    }, [prefixes]);

    useEffect(() => {
        if (!isVisible) return;

        return () => {
            resetCategory(UnseenItemCategory.PREFIX);
        };
    }, [isVisible, resetCategory]);

    useEffect(() => {
        if (!isVisible || !needsUpdate) return;

        SendMessageComposer(new RequestPrefixesComposer());

        setNeedsUpdate(false);
    }, [isVisible, needsUpdate]);

    return { prefixes, activePrefix, selectedPrefix, setSelectedPrefix, activatePrefix, deactivatePrefix, deletePrefix, activate, deactivate };
};

export const useInventoryPrefixes = () => useSharedHook(useInventoryPrefixesState);

registerSharedHook(useInventoryPrefixesState);
