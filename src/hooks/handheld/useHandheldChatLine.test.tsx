import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DESKTOP_LAYOUT } from '../../api/handheld/handheldLayout';
import { useHandheldChatComposerStore } from '../../state/handheldChatComposerStore';
import { useHandheldHudStore } from '../../state/handheldHudStore';
import { useHandheldStore } from '../../state/handheldStore';
import { closeHandheldChatLine, openHandheldChatLine, openHandheldWhisper, useChatDraft, useHandheldChatLine } from './useHandheldChatLine';

let field: HTMLInputElement;
let other: HTMLInputElement;

const phone = () => act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
const keyboard = (inset: number) => act(() => useHandheldStore.setState({ keyboardInset: inset }));

beforeEach(() => {
    document.body.innerHTML = '<div id="toolbar-chat-input-container"><input type="text" /></div><input id="other" type="text" />';
    field = document.querySelector('#toolbar-chat-input-container input');
    other = document.querySelector('#other');
});

afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    act(() => {
        useHandheldStore.setState({ layout: DESKTOP_LAYOUT, keyboardInset: 0 });
        useHandheldHudStore.setState({ chatOpen: false });
        useHandheldChatComposerStore.setState({ draft: '', mode: 'say', recipient: '' });
    });
});

describe('useHandheldChatLine', () => {
    it('keeps the composer away on a phone until its field gets the focus', () => {
        phone();

        const { result } = renderHook(() => useHandheldChatLine(true));

        expect(result.current).toBe(false);

        act(() => other.focus());

        expect(result.current).toBe(false);

        act(() => field.focus());

        expect(result.current).toBe(true);
    });

    it('stays open when the keyboard is dismissed, typed in or not: only its close button puts it away', () => {
        phone();

        const { result } = renderHook(() => useHandheldChatLine(true));

        act(() => field.focus());
        keyboard(300);
        keyboard(0);

        expect(result.current).toBe(true);

        act(() => closeHandheldChatLine());

        expect(result.current).toBe(false);
        expect(document.activeElement).not.toBe(field);
    });

    it('closes when the room is left', () => {
        phone();

        const { result, rerender } = renderHook(({ inRoom }) => useHandheldChatLine(inRoom), { initialProps: { inRoom: true } });

        act(() => field.focus());
        expect(result.current).toBe(true);

        rerender({ inRoom: false });

        expect(result.current).toBe(false);
        expect(useHandheldHudStore.getState().chatOpen).toBe(false);
    });

    it('never reports the composer as shown outside the phone layout', () => {
        const { result } = renderHook(() => useHandheldChatLine(true));

        act(() => field.focus());

        expect(result.current).toBe(false);
        expect(useHandheldHudStore.getState().chatOpen).toBe(false);
    });
});

describe('opening the composer', () => {
    it('opens with the cursor in the field', () => {
        act(() => openHandheldChatLine());

        expect(useHandheldHudStore.getState().chatOpen).toBe(true);
        expect(document.activeElement).toBe(field);
    });

    it('does nothing while no composer is mounted (a spectator has none)', () => {
        document.getElementById('toolbar-chat-input-container').innerHTML = '';

        act(() => openHandheldChatLine());

        expect(useHandheldHudStore.getState().chatOpen).toBe(false);
    });

    it('opens in whisper mode for a player, keeping what was typed', () => {
        act(() => useHandheldChatComposerStore.getState().setDraft('half a line'));
        act(() => openHandheldWhisper('Bob'));

        expect(useHandheldChatComposerStore.getState()).toMatchObject({ mode: 'whisper', recipient: 'Bob', draft: 'half a line' });
        expect(useHandheldHudStore.getState().chatOpen).toBe(true);
    });
});

describe('useChatDraft', () => {
    it('keeps the phone draft in the store, so it outlives the field', () => {
        phone();

        const first = renderHook(() => useChatDraft());

        act(() => first.result.current[1]('Meet you in the'));
        act(() => first.result.current[1]((value) => `${value} lobby!`));

        expect(first.result.current[0]).toBe('Meet you in the lobby!');

        first.unmount();

        expect(renderHook(() => useChatDraft()).result.current[0]).toBe('Meet you in the lobby!');
    });

    it('keeps the desktop text with the field, as before', () => {
        const first = renderHook(() => useChatDraft());

        act(() => first.result.current[1]('desktop line'));

        expect(first.result.current[0]).toBe('desktop line');
        expect(useHandheldChatComposerStore.getState().draft).toBe('');

        first.unmount();

        expect(renderHook(() => useChatDraft()).result.current[0]).toBe('');
    });
});
