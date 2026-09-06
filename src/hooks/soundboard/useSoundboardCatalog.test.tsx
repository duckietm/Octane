/* @vitest-environment jsdom */

import { SoundboardCatalogEvent, SoundboardCatalogResultEvent } from '@octane/renderer';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSoundboardCatalog } from './useSoundboardCatalog';

const mocks = vi.hoisted(() => ({
    handlers: new Map<unknown, (event: any) => void>(),
    sendMessage: vi.fn()
}));

vi.mock('@octane/renderer', () => {
    class SoundboardCatalogEvent {}
    class SoundboardCatalogResultEvent {}
    class SoundboardCatalogRequestComposer {}
    class SoundboardCatalogReorderComposer {
        constructor(public ids: number[]) {}
    }
    class SoundboardCatalogUpsertComposer {
        public values: any[];
        constructor(...values: any[]) {
            this.values = values;
        }
    }

    return {
        SoundboardCatalogEvent,
        SoundboardCatalogResultEvent,
        SoundboardCatalogRequestComposer,
        SoundboardCatalogReorderComposer,
        SoundboardCatalogUpsertComposer
    };
});

vi.mock('../../api', () => ({ SendMessageComposer: mocks.sendMessage }));
vi.mock('../events', () => ({
    useMessageEvent: (type: unknown, handler: (event: any) => void) => mocks.handlers.set(type, handler)
}));

describe('useSoundboardCatalog', () => {
    beforeEach(() => {
        mocks.handlers.clear();
        mocks.sendMessage.mockClear();
    });

    it('stores the full catalog and explicitly refreshes after a successful mutation', () => {
        const { result } = renderHook(() => useSoundboardCatalog());
        const sounds = [{ id: 7, name: 'Bell', classname: '', url: '/bell.mp3', enabled: true, sortOrder: 10, minRank: 1 }];

        act(() => mocks.handlers.get(SoundboardCatalogEvent)?.({ getParser: () => ({ sounds }) }));
        expect(result.current.sounds).toEqual(sounds);

        act(() =>
            mocks.handlers.get(SoundboardCatalogResultEvent)?.({
                getParser: () => ({ operation: 1, resultCode: 0, soundId: 7 })
            })
        );
        expect(result.current.lastResult).toEqual({ operation: 1, resultCode: 0, soundId: 7 });
        expect(result.current.pendingOperation).toBeNull();
        expect(mocks.sendMessage).toHaveBeenCalledOnce();
    });

    it('blocks duplicate mutations until the server responds', () => {
        const { result } = renderHook(() => useSoundboardCatalog());
        const draft = { id: 0, name: 'Bell', classname: '', url: '/bell.mp3', minRank: 1, enabled: true };

        act(() => {
            expect(result.current.upsert(draft)).toBe(true);
            expect(result.current.upsert(draft)).toBe(false);
        });

        expect(result.current.pendingOperation).toBe(1);
        expect(mocks.sendMessage).toHaveBeenCalledOnce();
    });
});
