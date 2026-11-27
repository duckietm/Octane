import { SetStateAction } from 'react';
import { createOctaneStore } from './createOctaneStore';

/** How the phone composer sends a line that carries no mode keyword of its own. */
export type HandheldChatMode = 'say' | 'shout' | 'whisper';

/**
 * What the phone's room chat composer remembers for the session: the unsent text, the chosen send mode and who a
 * whisper goes to. It lives outside the composer so closing it (or leaving the room) loses nothing; only a sent
 * line empties the text.
 */
interface HandheldChatComposerState {
    draft: string;
    mode: HandheldChatMode;
    /** The name whispers go to; empty until somebody was chosen. */
    recipient: string;
    setDraft: (draft: SetStateAction<string>) => void;
    setMode: (mode: HandheldChatMode) => void;
    setRecipient: (recipient: string) => void;
}

export const useHandheldChatComposerStore = createOctaneStore<HandheldChatComposerState>()((set, get) => ({
    draft: '',
    mode: 'say',
    recipient: '',
    setDraft: (draft) => {
        const next = typeof draft === 'function' ? draft(get().draft) : draft;

        if (next !== get().draft) set({ draft: next });
    },
    setMode: (mode) => {
        if (get().mode !== mode) set({ mode });
    },
    setRecipient: (recipient) => {
        if (get().recipient !== recipient) set({ recipient });
    }
}));
