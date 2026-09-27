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
    push: (entry: Omit<SoundboardFeedEntry, 'key'>) => number;
    dismiss: (key: number) => void;
    clear: () => void;
}

let nextKey = 1;

export const useSoundboardFeedStore = createOctaneStore<SoundboardFeedState>()((set) => ({
    entries: [],
    lastPlayed: null,
    push: (entry) => {
        const key = nextKey++;

        set((state) => ({
            entries: [{ ...entry, key }, ...state.entries].slice(0, SOUNDBOARD_FEED_LIMIT),
            lastPlayed: { soundId: entry.soundId, at: Date.now() }
        }));

        return key;
    },
    dismiss: (key) => set((state) => ({ entries: state.entries.filter((entry) => entry.key !== key) })),
    clear: () => set({ entries: [], lastPlayed: null })
}));
