import { CatalogGroupsComposer, GroupPurchasedEvent, GuildMembershipsMessageEvent, HabboGroupEntryData } from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

/** AIR UsersInGroup: the memberships are asked for again at most once per 5 s. */
export const USER_GROUPS_REFRESH_MS = 5000;

export const useUserGroupsStore = () => {
    const [groups, setGroups] = useState<HabboGroupEntryData[]>([]);
    const lastRequestRef = useRef<number>(null);

    const request = useCallback(() => {
        lastRequestRef.current = Date.now();
        SendMessageComposer(new CatalogGroupsComposer());
    }, []);

    const refresh = useCallback(() => {
        if (lastRequestRef.current !== null && Date.now() - lastRequestRef.current < USER_GROUPS_REFRESH_MS) return;

        request();
    }, [request]);

    const onGuildMemberships = useCallback((event: GuildMembershipsMessageEvent) => {
        setGroups(event.getParser()?.groups || []);
    }, []);

    useMessageEvent<GuildMembershipsMessageEvent>(GuildMembershipsMessageEvent, onGuildMemberships);

    // A new group is a new membership.
    useMessageEvent<GroupPurchasedEvent>(GroupPurchasedEvent, request);

    useEffect(() => {
        request();
    }, [request]);

    return { groups, refresh };
};

export const useUserGroups = (): { data: HabboGroupEntryData[]; refresh: () => void } => {
    const { groups, refresh } = useSharedHook(useUserGroupsStore);

    return { data: groups, refresh };
};

registerSharedHook(useUserGroupsStore);
