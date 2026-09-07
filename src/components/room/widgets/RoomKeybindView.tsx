import { PressKeybindComposer } from '@octane/renderer';
import { FC, useEffect } from 'react';
import { SendMessageComposer } from '../../../api';

/**
 * Captures in-room key presses and forwards the pressed key code to the server (outgoing header 9311),
 * which fires the wired `press_keybind` trigger (server matches on the configured key code).
 *
 * Guards:
 * - Skips while the user is typing in any input/textarea/contenteditable (e.g. the chat box) so it
 *   never steals typed keys.
 * - Ignores lone modifier keys and auto-repeat.
 * - Observes on the capture phase WITHOUT preventDefault, so normal behaviour (focusing chat) still
 *   happens — i.e. it never breaks chat.
 *
 * NOTE (UX, needs in-room verification): for printable keys this fires AND the key may also type into
 * chat once it focuses. Best paired with non-printable keys; if you want a printable key, consider
 * gating on a modifier (Ctrl/Alt) here after testing. See docs/plans/press-keybind-implementation-plan.md.
 */
export const RoomKeybindView: FC<{}> = () =>
{
    useEffect(() =>
    {
        const onKeyDown = (event: KeyboardEvent) =>
        {
            if (event.repeat) return;

            const active = document.activeElement;

            if ((active instanceof HTMLInputElement) || (active instanceof HTMLTextAreaElement) ||
                ((active instanceof HTMLElement) && active.isContentEditable))
            {
                return;
            }

            switch (event.key)
            {
                case 'Shift':
                case 'Control':
                case 'Alt':
                case 'Meta':
                    return;
            }

            SendMessageComposer(new PressKeybindComposer(event.keyCode));
        };

        document.addEventListener('keydown', onKeyDown, true);

        return () => document.removeEventListener('keydown', onKeyDown, true);
    }, []);

    return null;
};
