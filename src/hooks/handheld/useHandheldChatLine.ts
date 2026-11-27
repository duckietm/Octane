import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { HandheldChatMode, useHandheldChatComposerStore } from '../../state/handheldChatComposerStore';
import { useHandheldHudStore } from '../../state/handheldHudStore';
import { useIsHandheld } from './useHandheldLayout';

/** The element the room chat input is mounted in (ToolbarView draws it, ChatInputView fills it). */
export const HANDHELD_CHAT_HOST_ID = 'toolbar-chat-input-container';

const findChatField = (): HTMLInputElement | null => document.querySelector<HTMLInputElement>(`#${HANDHELD_CHAT_HOST_ID} input`);

/**
 * Shows the phone's chat composer and puts the cursor in it. Called straight from the tap, so the phone opens its
 * keyboard: a focus that comes later than the gesture is ignored by mobile Safari.
 */
export const openHandheldChatLine = (): void => {
    // Nothing is mounted for a spectator: opening would only take the dock away.
    if (!document.getElementById(HANDHELD_CHAT_HOST_ID)?.childElementCount) return;

    useHandheldHudStore.getState().setChatOpen(true);
    findChatField()?.focus();
};

/** Puts the composer away. What was typed and the chosen mode stay in the composer store for the next time. */
export const closeHandheldChatLine = (): void => {
    useHandheldHudStore.getState().setChatOpen(false);
    findChatField()?.blur();
};

/** Opens the composer set to whisper to this player (an avatar's "Whisper" entry). */
export const openHandheldWhisper = (name: string): void => {
    const composer = useHandheldChatComposerStore.getState();

    composer.setRecipient(name);
    composer.setMode('whisper');
    openHandheldChatLine();
};

/**
 * Phone layout: the room chat composer stays away until it is asked for. It opens when its field gets the focus
 * (the dock's chat button, a whisper started from an avatar's menu, the first key of a hardware keyboard) and is
 * put away by its close button or when the room is left.
 *
 * @returns whether the composer is shown; always false outside the phone layout.
 */
export const useHandheldChatLine = (isInRoom: boolean): boolean => {
    const isHandheld = useIsHandheld();
    const chatOpen = useHandheldHudStore((state) => state.chatOpen);
    const setChatOpen = useHandheldHudStore((state) => state.setChatOpen);

    useEffect(() => {
        if (!isHandheld || !isInRoom) {
            setChatOpen(false);
            return;
        }

        const onFocusIn = (event: FocusEvent) => {
            const target = event.target;

            if (target instanceof Element && target.closest(`#${HANDHELD_CHAT_HOST_ID}`)) setChatOpen(true);
        };

        document.addEventListener('focusin', onFocusIn);

        return () => document.removeEventListener('focusin', onFocusIn);
    }, [isHandheld, isInRoom, setChatOpen]);

    return isHandheld && isInRoom && chatOpen;
};

/**
 * The text of the room chat field. On desktop it belongs to the field and goes with it; on a phone it is the
 * composer's draft, which outlives the composer being closed.
 */
export const useChatDraft = (): [string, Dispatch<SetStateAction<string>>] => {
    const isHandheld = useIsHandheld();
    const local = useState('');
    const draft = useHandheldChatComposerStore((state) => state.draft);
    const setDraft = useHandheldChatComposerStore((state) => state.setDraft);

    return isHandheld ? [draft, setDraft] : local;
};

/** The phone composer's send mode and whisper recipient. */
export const useHandheldChatMode = () => {
    const mode = useHandheldChatComposerStore((state) => state.mode);
    const recipient = useHandheldChatComposerStore((state) => state.recipient);
    const setMode = useHandheldChatComposerStore((state) => state.setMode);
    const setRecipient = useHandheldChatComposerStore((state) => state.setRecipient);

    return { mode, recipient, setMode, setRecipient };
};

export type { HandheldChatMode };
