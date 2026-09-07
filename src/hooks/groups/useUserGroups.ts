import { CatalogGroupsComposer, GuildMembershipsMessageEvent, HabboGroupEntryData } from '@octane/renderer';
import { useCallback, useEffect, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

const useUserGroupsStore = () => {
    const [groups, setGroups] = useState<HabboGroupEntryData[]>([]);

    const onGuildMemberships = useCallback((event: GuildMembershipsMessageEvent) => {
        setGroups(event.getParser()?.groups || []);
    }, []);

    useMessageEvent<GuildMembershipsMessageEvent>(GuildMembershipsMessageEvent, onGuildMemberships);

    useEffect(() => {
        SendMessageComposer(new CatalogGroupsComposer());
    }, []);

    return { groups };
};

export const useUserGroups = (): { data: HabboGroupEntryData[] } => {
    const { groups } = useSharedHook(useUserGroupsStore);

    return { data: groups };
};

registerSharedHook(useUserGroupsStore);
