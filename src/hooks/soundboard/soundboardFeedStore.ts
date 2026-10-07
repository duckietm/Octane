import { createOctaneStore } from '@/state/createOctaneStore';

export const SOUNDBOARD_FEED_LIMIT = 4;
export const SOUNDBOARD_FEED_DURATION_MS = 4_500;

export interface SoundboardFeedEntry {
    key: number;
    username: string;
    soundName: string;
    soundId: number;
}

interface SoundboardFeedState {
    entries: SoundboardFeedEntry[];
    lastPlayed: { soundId: number; at: number } | null;
    // Never reset: a dismiss timer that fires after a clear must not hit a newer entry.
    nextKey: number;
    push: (entry: Omit<SoundboardFeedEntry, 'key'>) => number;
    dismiss: (key: number) => void;
    clear: () => void;
}

export const useSoundboardFeedStore = createOctaneStore<SoundboardFeedState>()((set, get) => ({
    entries: [],
    lastPlayed: null,
    nextKey: 1,
    push: (entry) => {
        const key = get().nextKey;

        set((state) => ({
            entries: [{ ...entry, key }, ...state.entries].slice(0, SOUNDBOARD_FEED_LIMIT),
            lastPlayed: { soundId: entry.soundId, at: Date.now() },
            nextKey: key + 1
        }));

        return key;
    },
    dismiss: (key) => set((state) => ({ entries: state.entries.filter((entry) => entry.key !== key) })),
    clear: () => set({ entries: [], lastPlayed: null })
}));
