/* @vitest-environment jsdom */

import { GetSessionDataManager } from '@octane/renderer';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    send: vi.fn(),
    showConfirm: vi.fn(),
    simpleAlert: vi.fn(),
    handlers: new Map<unknown, (event: any) => void>()
}));

vi.mock('@octane/renderer', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@octane/renderer')>();
    const composer = (name: string) =>
        class {
            public readonly name = name;
            public readonly args: unknown[];
            constructor(...args: unknown[]) {
                this.args = args;
            }
        };
    const event = (name: string) =>
        class {
            public static readonly eventName = name;
        };

    return {
        ...actual,
        BuyMarketplaceOfferMessageComposer: composer('buy'),
        GetMarketplaceOffersMessageComposer: composer('getOffers'),
        GetMarketplaceOwnOffersMessageComposer: composer('getOwnOffers'),
        CancelMarketplaceOfferMessageComposer: composer('cancel'),
        CancelAllMarketplaceOffersMessageComposer: composer('cancelAll'),
        ClearOwnMarketplaceHistoryMessageComposer: composer('clearHistory'),
        RedeemMarketplaceOfferCreditsMessageComposer: composer('redeem'),
        MarketPlaceOffersEvent: event('offers'),
        MarketplaceBuyOfferResultEvent: event('buyResult'),
        MarketplaceOwnOffersEvent: event('ownOffers'),
        MarketplaceCancelOfferResultEvent: event('cancelResult'),
        MarketplaceCancelAllOffersResultEvent: event('cancelAllResult'),
        MarketplaceClearOwnHistoryResultEvent: event('clearHistoryResult')
    };
});

vi.mock('../../../../../../api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../../../../api')>();

    return {
        ...actual,
        GetImageIconUrlForProduct: (_type: string, id: number) => `icon://${id}`,
        SendMessageComposer: mocks.send
    };
});

vi.mock('../../../../../../hooks', () => ({
    useMarketplaceConfiguration: () => ({ data: { displayTime: 7 } }),
    useMarketplaceItemStats: () => null,
    useMessageEvent: (type: { eventName: string }, handler: (event: any) => void) => {
        mocks.handlers.set(type.eventName, handler);
    },
    useNotification: () => ({ showConfirm: mocks.showConfirm, simpleAlert: mocks.simpleAlert }),
    usePurse: () => ({ getCurrencyAmount: () => 1000 })
}));

import { CatalogLayoutMarketplaceOwnItemsView } from './CatalogLayoutMarketplaceOwnItemsView';
import { CatalogLayoutMarketplacePublicItemsView } from './CatalogLayoutMarketplacePublicItemsView';

const emit = (name: string, parser: object) => act(() => mocks.handlers.get(name)({ getParser: () => parser }));

const offer = (offerId: number, furniId: number, extra: object = {}) => ({
    offerId,
    furniId,
    furniType: 1,
    extraData: '',
    stuffData: null,
    price: 25,
    status: 1,
    averagePrice: 20,
    offerCount: 3,
    timeLeftMinutes: 125,
    ...extra
});

const sent = (name: string) => mocks.send.mock.calls.map((call) => call[0]).filter((composer) => composer.name === name);

describe('marketplace catalog pages', () => {
    beforeEach(() => {
        mocks.send.mockClear();
        mocks.showConfirm.mockClear();
        mocks.simpleAlert.mockClear();
        mocks.handlers.clear();
        vi.mocked(GetSessionDataManager).mockReturnValue({
            getFloorItemData: (id: number) => (id === 2270 ? { name: 'Troon', className: 'throne', description: 'Voor belangrijke Habbis' } : null),
            getWallItemData: () => null
        } as any);
    });

    afterEach(() => {
        vi.useRealTimers();
        cleanup();
        vi.mocked(GetSessionDataManager).mockReset();
    });

    it('searches by activity on open and lists rows with the furnidata name, icon and AIR texts', () => {
        render(<CatalogLayoutMarketplacePublicItemsView page={null} hideNavigation={null} />);

        expect(sent('getOffers')[0].args).toEqual([-1, -1, '', 3, true]);
        expect(screen.getByTestId('marketplace-status').textContent).toBe('Searching...');

        emit('offers', { offers: [offer(1, 2270), offer(2, 2270, { averagePrice: 0 })], totalItemsFound: 2 });

        const rows = screen.getAllByTestId('marketplace-public-row');

        expect(rows).toHaveLength(2);
        expect(within(rows[0]).getByText('Troon')).toBeTruthy();
        expect(rows[0].textContent).not.toContain('roomItem.name');
        expect(rows[0].querySelector('img').getAttribute('src')).toBe('icon://2270');
        expect(within(rows[0]).getByText('Price: 25 (Average: 20)')).toBeTruthy();
        expect(rows[1].querySelector('.marketplace-row-price').textContent).toBe('Price: 25 (Average:  - )');
        expect(within(rows[0]).getByText('Offers: 3')).toBeTruthy();
        expect(screen.getByTestId('marketplace-status').textContent).toBe('2 furni found');
    });

    it('switches tabs with their sort types and searches the advanced form only on its button', () => {
        render(<CatalogLayoutMarketplacePublicItemsView page={null} hideNavigation={null} />);

        fireEvent.click(screen.getByRole('tab', { name: 'By value' }));
        expect(sent('getOffers').at(-1).args).toEqual([-1, -1, '', 1, true]);

        fireEvent.click(screen.getByRole('tab', { name: 'Advanced' }));
        expect(sent('getOffers')).toHaveLength(2);

        fireEvent.change(screen.getByLabelText('Search furni...'), { target: { value: 'troon' } });
        fireEvent.change(document.getElementById('marketplace-search-min-price'), { target: { value: '1a0' } });
        fireEvent.click(screen.getByRole('checkbox'));
        expect(sent('getOffers').at(-1).args).toEqual([10, -1, 'troon', 1, false]);

        fireEvent.click(screen.getByRole('button', { name: 'Search' }));
        expect(sent('getOffers').at(-1).args).toEqual([10, -1, 'troon', 1, false]);
        expect(sent('getOffers')).toHaveLength(4);
    });

    it('opens the details panel from "Furni info" and buys through the confirmation', () => {
        render(<CatalogLayoutMarketplacePublicItemsView page={null} hideNavigation={null} />);
        emit('offers', { offers: [offer(1, 2270)], totalItemsFound: 1 });

        fireEvent.click(screen.getByRole('button', { name: 'Furni info' }));
        expect(document.querySelector('.octane-marketplace-offer-details').textContent).toContain('Troon');

        fireEvent.click(screen.getByRole('button', { name: 'Back to the Marketplace' }));
        fireEvent.click(screen.getByRole('button', { name: 'Buy' }));
        act(() => mocks.showConfirm.mock.calls[0][1]());
        expect(sent('buy')[0].args).toEqual([1]);

        emit('buyResult', { result: 1 });
        expect(sent('getOffers').at(-1).args).toEqual([-1, -1, '', 3, true]);
    });

    it('shows the own offers per category with their state texts, cancel and the bottom actions', () => {
        vi.useFakeTimers();
        render(<CatalogLayoutMarketplaceOwnItemsView page={null} hideNavigation={null} />);

        expect(sent('getOwnOffers')).toHaveLength(1);

        emit('ownOffers', {
            creditsWaiting: 40,
            offers: [offer(1, 2270), offer(2, 2270, { status: 2 }), offer(3, 2270, { status: 3 })]
        });

        expect(screen.getByTestId('marketplace-own-info').textContent).toContain('Credits earned: 40');

        let rows = screen.getAllByTestId('marketplace-own-row');

        expect(rows).toHaveLength(1);
        expect(within(rows[0]).getByText('Troon')).toBeTruthy();
        expect(within(rows[0]).getByText('Voor belangrijke Habbis')).toBeTruthy();
        expect(within(rows[0]).getByText('Time left: 2 hours 5 minutes')).toBeTruthy();

        fireEvent.click(within(rows[0]).getByRole('button', { name: 'Cancel' }));
        expect(sent('cancel')[0].args).toEqual([1]);

        fireEvent.click(screen.getByRole('button', { name: 'Recall all' }));
        act(() => mocks.showConfirm.mock.calls[0][1]());
        expect(sent('cancelAll')).toHaveLength(1);

        fireEvent.click(screen.getByRole('combobox'));
        fireEvent.click(screen.getByRole('option', { name: 'SOLD' }));
        expect(sent('getOwnOffers')).toHaveLength(2);

        emit('ownOffers', { creditsWaiting: 40, offers: [offer(1, 2270), offer(2, 2270, { status: 2 })] });
        rows = screen.getAllByTestId('marketplace-own-row');
        expect(rows).toHaveLength(1);
        expect(within(rows[0]).getByText('This furni has been sold!')).toBeTruthy();
        expect(within(rows[0]).queryByRole('button')).toBeNull();

        act(() => vi.advanceTimersByTime(2100));
        fireEvent.click(screen.getByRole('button', { name: 'Mark as seen' }));
        act(() => mocks.showConfirm.mock.calls.at(-1)[1]());
        expect(sent('clearHistory')[0].args).toEqual([2]);

        const listsBefore = sent('getOwnOffers').length;
        fireEvent.click(screen.getByRole('button', { name: 'Collect credits' }));
        expect(sent('redeem')).toHaveLength(1);
        // The server's own list follows, so a refused redeem does not leave the credits shown as collected.
        expect(sent('getOwnOffers')).toHaveLength(listsBefore + 1);
    });

    it('filters the own offers by the search field', () => {
        vi.mocked(GetSessionDataManager).mockReturnValue({
            getFloorItemData: (id: number) => ({ 1: { name: 'Troon', className: 'throne' }, 2: { name: 'Bank', className: 'sofa' } })[id] ?? null,
            getWallItemData: () => null
        } as any);

        render(<CatalogLayoutMarketplaceOwnItemsView page={null} hideNavigation={null} />);
        emit('ownOffers', { creditsWaiting: 0, offers: [offer(1, 1), offer(2, 2)] });

        fireEvent.change(screen.getByLabelText('Search...'), { target: { value: 'BANK' } });
        expect(screen.getAllByTestId('marketplace-own-row')).toHaveLength(2);

        fireEvent.keyDown(screen.getByLabelText('Search...'), { key: 'Enter' });
        expect(screen.getAllByTestId('marketplace-own-row')).toHaveLength(1);
        expect(screen.getByTestId('marketplace-status').textContent).toBe('1 furni found');

        fireEvent.click(screen.getByRole('button', { name: 'clear' }));
        expect(screen.getAllByTestId('marketplace-own-row')).toHaveLength(2);
    });
});
