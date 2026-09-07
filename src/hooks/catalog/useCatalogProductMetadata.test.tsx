import { CatalogProductMetadataEvent } from '@octane/renderer';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
import { useCatalogProductMetadata } from './useCatalogProductMetadata';

const composerTypes = vi.hoisted(() => {
    class CatalogProductMetadataComposer {
        public constructor(
            public readonly requestId: string,
            public readonly pageId: number,
            public readonly catalogMode: string
        ) {}
    }

    return { CatalogProductMetadataComposer };
});

vi.mock('@octane/renderer', () => ({
    CatalogProductMetadataComposer: composerTypes.CatalogProductMetadataComposer,
    CatalogProductMetadataEvent: class {}
}));

vi.mock('../../api', () => ({ SendMessageComposer: vi.fn() }));
vi.mock('../events', () => ({ useMessageEvent: vi.fn() }));

let metadataHandler: ((event: { getParser: () => any }) => void) | null = null;

beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    metadataHandler = null;
    vi.mocked(useMessageEvent).mockImplementation((_event: unknown, handler: any) => {
        metadataHandler = handler;
    });
});

afterEach(() => vi.useRealTimers());

describe('useCatalogProductMetadata', () => {
    it('accepts only the current correlated page response', () => {
        const { result } = renderHook(() => useCatalogProductMetadata(44, 'NORMAL'));
        const request = vi.mocked(SendMessageComposer).mock.calls[0][0] as unknown as InstanceType<
            typeof composerTypes.CatalogProductMetadataComposer
        >;

        expect(request).toMatchObject({ catalogMode: 'NORMAL', pageId: 44 });

        act(() => {
            metadataHandler?.({
                getParser: () => ({ entries: [{ offerId: 7 }], pageId: 44, protocolVersion: 1, requestId: 'stale' })
            });
        });
        expect(result.current).toBeNull();

        act(() => {
            metadataHandler?.({
                getParser: () => ({
                    entries: [{ offerId: 7, itemBaseId: 70, productClassId: 700, recyclable: true, tradeable: false }],
                    pageId: 44,
                    protocolVersion: 1,
                    requestId: request.requestId
                })
            });
        });

        expect(result.current).toEqual([
            { offerId: 7, itemBaseId: 70, productClassId: 700, recyclable: true, tradeable: false }
        ]);
    });

    it('silently ignores a late response after the optional request times out', () => {
        const { result } = renderHook(() => useCatalogProductMetadata(44, 'NORMAL'));
        const request = vi.mocked(SendMessageComposer).mock.calls[0][0] as unknown as InstanceType<
            typeof composerTypes.CatalogProductMetadataComposer
        >;

        act(() => vi.advanceTimersByTime(3000));
        act(() => {
            metadataHandler?.({
                getParser: () => ({ entries: [{ offerId: 7 }], pageId: 44, protocolVersion: 1, requestId: request.requestId })
            });
        });

        expect(result.current).toBeNull();
    });
});
