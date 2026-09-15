import { GetCommunication, PerkAllowancesMessageEvent } from '@octane/renderer';
import { createOctaneStore } from '../../state/createOctaneStore';
import { useMessageEvent } from '../events';

/**
 * Perk allowances (`PerkAllowancesMessageEvent`, the official `SessionDataManager.isPerkAllowed`).
 *
 * The packet lands once during login, before most widgets mount, so the store is filled by a
 * module-level listener (the same trick as `useChatCommandSelector`) and refreshed by the hook.
 * Until the server has said anything every perk counts as allowed: the gates this feeds
 * (camera entries, `:cam`) must not vanish because of a slow login packet.
 */
interface PerkAllowancesStore {
    hasReceivedPerks: boolean;
    perks: ReadonlyMap<string, boolean>;
    setPerks: (perks: ReadonlyMap<string, boolean>) => void;
}

const usePerkAllowancesStore = createOctaneStore<PerkAllowancesStore>()((set) => ({
    hasReceivedPerks: false,
    perks: new Map<string, boolean>(),
    setPerks: (perks) => set({ perks, hasReceivedPerks: true })
}));

const readPerks = (event: PerkAllowancesMessageEvent): ReadonlyMap<string, boolean> => {
    const perks = new Map<string, boolean>();

    for (const perk of event.getParser().perks) perks.set(perk.code, perk.isAllowed);

    return perks;
};

let isListenerRegistered = false;

const ensureGlobalListener = (): void => {
    if (isListenerRegistered) return;

    try {
        GetCommunication().registerMessageEvent(
            new PerkAllowancesMessageEvent((event: PerkAllowancesMessageEvent) => usePerkAllowancesStore.getState().setPerks(readPerks(event)))
        );
        isListenerRegistered = true;
    } catch {
        // Communication not ready yet; the in-hook listener covers later mounts.
    }
};

ensureGlobalListener();

export const isPerkAllowedNow = (
    perkCode: string,
    state: Pick<PerkAllowancesStore, 'hasReceivedPerks' | 'perks'> = usePerkAllowancesStore.getState()
): boolean => {
    if (!state.hasReceivedPerks) return true;

    return state.perks.get(perkCode) === true;
};

export const usePerkAllowances = () => {
    const hasReceivedPerks = usePerkAllowancesStore((state) => state.hasReceivedPerks);
    const perks = usePerkAllowancesStore((state) => state.perks);
    const setPerks = usePerkAllowancesStore((state) => state.setPerks);

    ensureGlobalListener();

    useMessageEvent<PerkAllowancesMessageEvent>(PerkAllowancesMessageEvent, (event) => setPerks(readPerks(event)));

    const isPerkAllowed = (perkCode: string) => isPerkAllowedNow(perkCode, { hasReceivedPerks, perks });

    return { hasReceivedPerks, isPerkAllowed };
};

export const setPerkAllowancesForTests = (perks: Record<string, boolean> | null) => {
    if (!perks) {
        usePerkAllowancesStore.setState({ perks: new Map(), hasReceivedPerks: false });
        return;
    }

    usePerkAllowancesStore.getState().setPerks(new Map(Object.entries(perks)));
};
