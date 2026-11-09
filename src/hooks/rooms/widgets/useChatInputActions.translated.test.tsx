/* @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    sent: [] as string[],
    session: null as unknown,
    pending: new Map<string, (value: { translatedText: string }) => void>()
}));

vi.mock('../../notification', () => ({ useNotification: () => ({}) }));
vi.mock('../../translation', () => ({
    useTranslation: () => ({
        settings: { enabled: true },
        translateOutgoing: (text: string) => new Promise((resolve) => state.pending.set(text, resolve)),
        enqueueOutgoingTranslation: () => undefined
    })
}));
vi.mock('../useRoom', () => ({ useRoom: () => ({ roomSession: state.session }) }));

import { ChatMessageTypeEnum } from '../../../api';
import { useChatInputActions } from './useChatInputActions';

const session = () => ({ sendChatMessage: (message: string) => state.sent.push(message) });

describe('translated outgoing chat', () => {
    it('leaves in the order it was typed, whichever translation finishes first', async () => {
        state.sent = [];
        state.session = session();
        const { result } = renderHook(() => useChatInputActions());

        act(() => {
            result.current.sendChat('first', ChatMessageTypeEnum.CHAT_DEFAULT);
            result.current.sendChat('second', ChatMessageTypeEnum.CHAT_DEFAULT);
        });

        await act(async () => state.pending.get('second')?.({ translatedText: 'zweite' }));
        await act(async () => state.pending.get('first')?.({ translatedText: 'erste' }));

        expect(state.sent).toEqual(['erste', 'zweite']);
    });

    it('drops a line whose room has changed before its translation came back', async () => {
        state.sent = [];
        state.session = session();
        const { result, rerender } = renderHook(() => useChatInputActions());

        act(() => {
            result.current.sendChat('hello', ChatMessageTypeEnum.CHAT_DEFAULT);
        });
        state.session = session();
        rerender();

        await act(async () => state.pending.get('hello')?.({ translatedText: 'hallo' }));

        expect(state.sent).toEqual([]);
    });
});
