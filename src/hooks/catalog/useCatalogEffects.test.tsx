/* @vitest-environment jsdom */
import {
    BuildersClubFurniCountMessageEvent,
    CatalogPublishedMessageEvent,
    LimitedEditionSoldOutEvent,
    ProductOfferEvent,
    PurchaseOKMessageEvent
} from '@octane/renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogNode, CatalogType } from '../../api';
import { mockEventDispatcher } from '../../octane-renderer.mock';
import { INITIAL_CATALOG_UI_STATE, useCatalogStore } from './catalogStore';
import { useCatalogEffects } from './useCatalogEffects';
import { catalogIndexKey, catalogPageKey } from './useCatalogQueries';

vi.mock('../events', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../events')>();

    return {
        ...actual,
        useConnectionState: () => ({
            phase: 'connected',
            reconnectAttempt: 0,
            maxReconnectAttempts: 7,
            authenticated: true,
            closeCode: null,
            closeReason: ''
        })
    };
});
vi.mock('../notification', () => ({ useNotification: () => ({ simpleAlert: vi.fn(), showConfirm: vi.fn() }) }));
vi.mock('./useCatalogPlaceMultipleItems', () => ({ useCatalogPlaceMultipleItems: () => [false, vi.fn()] }));
vi.mock('./useCatalogSkipPurchaseConfirmation', () => ({ useCatalogSkipPurchaseConfirmation: () => [false, vi.fn()] }));
vi.mock('../../api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../api')>();

    return {
        ...actual,
        DispatchUiEvent: vi.fn(),
        GetProductDataForLocalization: () => ({ id: 1 }),
        GetFurnitureData: () => ({ className: 'chair', id: 10 })
    };
});

const makeEvent = (klass: any, parser: any) => {
    const event = new klass();
    event.getParser = () => parser;

    return event;
};

const node = (pageId: number, pageName: string, parent: any, offerIds: number[] = []) => {
    const created = new CatalogNode(
        { visible: true, icon: 0, pageId, parentId: parent?.pageId ?? -1, pageName, localization: pageName, children: [], offerIds } as any,
        parent ? parent.depth + 1 : 0,
        parent
    );

    if (parent) parent.addChild(created);

    return created;
};

let client: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    useCatalogStore.setState({ ...INITIAL_CATALOG_UI_STATE });
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('useCatalogEffects', () => {
    it('binds the query client and creates one room previewer', () => {
        const { unmount } = renderHook(() => useCatalogEffects(), { wrapper });

        expect(useCatalogStore.getState().roomPreviewer).not.toBeNull();

        unmount();

        expect(useCatalogStore.getState().roomPreviewer).toBeNull();
    });

    it('a catalog publish invalidates the index and the pages', () => {
        client.setQueryData(catalogIndexKey(CatalogType.NORMAL), { rootNode: {} as any, offersToNodes: new Map() });
        client.setQueryData(catalogPageKey(CatalogType.NORMAL, 2), { page: null, frontPageItems: [], offerId: -1 });
        renderHook(() => useCatalogEffects(), { wrapper });

        act(() => mockEventDispatcher.dispatchEvent(makeEvent(CatalogPublishedMessageEvent, {})));

        expect(client.getQueryState(catalogIndexKey(CatalogType.NORMAL)).isInvalidated).toBe(true);
        expect(client.getQueryState(catalogPageKey(CatalogType.NORMAL, 2)).isInvalidated).toBe(true);
    });

    it('a purchase or a sold-out invalidates the current page', () => {
        client.setQueryData(catalogPageKey(CatalogType.NORMAL, 2), { page: null, frontPageItems: [], offerId: -1 });
        useCatalogStore.setState({ pageId: 2 });
        renderHook(() => useCatalogEffects(), { wrapper });

        act(() => mockEventDispatcher.dispatchEvent(makeEvent(PurchaseOKMessageEvent, { offer: {} })));
        expect(client.getQueryState(catalogPageKey(CatalogType.NORMAL, 2)).isInvalidated).toBe(true);

        client.setQueryData(catalogPageKey(CatalogType.NORMAL, 2), { page: null, frontPageItems: [], offerId: -1 });
        act(() => mockEventDispatcher.dispatchEvent(makeEvent(LimitedEditionSoldOutEvent, {})));
        expect(client.getQueryState(catalogPageKey(CatalogType.NORMAL, 2)).isInvalidated).toBe(true);
    });

    it('a lazy product offer becomes the current offer with a page attached', () => {
        const root = node(-1, 'root', null);
        const chairs = node(2, 'chairs', root, [100]);
        client.setQueryData(catalogIndexKey(CatalogType.NORMAL), { rootNode: root, offersToNodes: new Map([[100, [chairs]]]) });
        renderHook(() => useCatalogEffects(), { wrapper });

        const parser = {
            offer: {
                offerId: 100,
                localizationId: 'chair',
                rent: false,
                priceCredits: 1,
                priceActivityPoints: 0,
                priceActivityPointsType: 0,
                giftable: false,
                clubLevel: 0,
                products: [{ productType: 's', furniClassId: 10, extraParam: '', productCount: 1, uniqueLimitedItem: false, uniqueLimitedSeriesSize: 0, uniqueLimitedItemsLeft: 0 }],
                bundlePurchaseAllowed: false,
                itemIds: '',
                haveOffer: false
            }
        };

        act(() => mockEventDispatcher.dispatchEvent(makeEvent(ProductOfferEvent, parser)));

        const { currentOffer } = useCatalogStore.getState();
        expect(currentOffer.offerId).toBe(100);
        expect(currentOffer.page.pageId).toBe(2);
    });

    it('builders club counters land in the store', () => {
        renderHook(() => useCatalogEffects(), { wrapper });

        act(() => mockEventDispatcher.dispatchEvent(makeEvent(BuildersClubFurniCountMessageEvent, { furniCount: 7 })));

        expect(useCatalogStore.getState().furniCount).toBe(7);
    });

    it('a pending request resolves once the index is in cache', async () => {
        const root = node(-1, 'root', null);
        const tables = node(3, 'tables', root);
        useCatalogStore.setState({ isVisible: true, pendingRequest: { kind: 'id', id: 3 } });
        renderHook(() => useCatalogEffects(), { wrapper });

        await act(async () => {
            client.setQueryData(catalogIndexKey(CatalogType.NORMAL), { rootNode: root, offersToNodes: new Map() });
        });

        await waitFor(() => expect(useCatalogStore.getState().pendingRequest).toBeNull());
        expect(useCatalogStore.getState().activeNodes.at(-1)).toBe(tables);
    });

    it('a deep link to an offer whose page is already open still selects the offer', async () => {
        const root = node(-1, 'root', null);
        const chairs = node(2, 'chairs', root, [100]);
        const offer = {
            offerId: 100,
            isLazy: false,
            product: { productType: 'floor' }
        };
        client.setQueryData(catalogIndexKey(CatalogType.NORMAL), { rootNode: root, offersToNodes: new Map([[100, [chairs]]]) });
        client.setQueryData(catalogPageKey(CatalogType.NORMAL, 2), { page: { pageId: 2, offers: [offer] }, frontPageItems: [], offerId: -1 });
        useCatalogStore.setState({ isVisible: true, pageId: 2 });
        renderHook(() => useCatalogEffects(), { wrapper });

        act(() => {
            useCatalogStore.getState().openPageByOfferId(100);
        });

        await waitFor(() => expect(useCatalogStore.getState().currentOffer?.offerId).toBe(100));
    });

    it('a localization update bumps the version', () => {
        renderHook(() => useCatalogEffects(), { wrapper });

        act(() => window.dispatchEvent(new CustomEvent('octane-localization-updated')));

        expect(useCatalogStore.getState().catalogLocalizationVersion).toBe(1);
    });
});
