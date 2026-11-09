import { PerkAllowancesMessageEvent } from '@octane/renderer';
import { useCallback, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { useMessageEvent } from '../events';

const NO_PERKS: ReadonlySet<string> = new Set();

// The perks arrive once at login, before most views mount, so the listener is a shared source registered here.
const usePerkAllowancesStore = () => {
    const [allowed, setAllowed] = useState<ReadonlySet<string>>(NO_PERKS);

    const onPerkAllowances = useCallback((event: PerkAllowancesMessageEvent) => {
        const perks = event.getParser()?.perks ?? [];

        setAllowed(new Set(perks.filter((perk) => perk.isAllowed).map((perk) => perk.code)));
    }, []);

    useMessageEvent<PerkAllowancesMessageEvent>(PerkAllowancesMessageEvent, onPerkAllowances);

    return { allowed };
};

/** Whether the server allows this perk (a PerkEnum code) for the logged-in user. */
export const usePerkAllowed = (perkCode: string): boolean => useSharedHook(usePerkAllowancesStore).allowed.has(perkCode);

registerSharedHook(usePerkAllowancesStore);
