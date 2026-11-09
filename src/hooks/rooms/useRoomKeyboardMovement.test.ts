/* @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { isTyping } from './useRoomKeyboardMovement';

const focus = (el: HTMLElement) => {
    document.body.appendChild(el);
    el.focus();

    return el;
};

afterEach(() => {
    document.body.innerHTML = '';
});

describe('arrow-key movement guard', () => {
    it('does not treat an empty chat box as typing', () => {
        const input = document.createElement('input');

        input.className = 'swf-chat-input-field';
        focus(input);

        // The chat input takes focus on the first keystroke and keeps it, so
        // this is the state the player is in for the whole session.
        expect(document.activeElement).toBe(input);
        expect(isTyping()).toBe(false);
    });

    it('treats a chat box with a message in it as typing', () => {
        const input = document.createElement('input');

        input.className = 'swf-chat-input-field';
        input.value = 'ciao';
        focus(input);

        expect(isTyping()).toBe(true);
    });

    it('still treats other text fields as typing even when empty', () => {
        const input = document.createElement('input');

        focus(input);

        expect(isTyping()).toBe(true);
    });

    it('reports nothing focused as not typing', () => {
        (document.activeElement as HTMLElement)?.blur();

        expect(isTyping()).toBe(false);
    });
});
