import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const renderer = vi.hoisted(() => ({
    CancelAllMarketplaceOffersMessageComposer: class {},
    CancelMarketplaceOfferMessageComposer: class {
        public constructor(public readonly offerId: number) {}
    },
    ClearOwnMarketplaceHistoryMessageComposer: class {
        public constructor(public readonly state: number) {}
    },
    GetMarketplaceOwnOffersMessageComposer: class {},
    MarketplaceCancelAllOffersResultEvent: class {},
    MarketplaceCancelOfferResultEvent: class {},
    MarketplaceClearOwnHistoryResultEvent: class {},
    MarketplaceOwnOffersEvent: class {},
    RedeemMarketplaceOfferCreditsMessageComposer: class {}
}));

const api = vi.hoisted(() => ({
    SendMessageComposer: vi.fn(),
    MarketplaceOfferData: class {
        public static TYPE_FLOOR = 1;
        public static TYPE_WALL = 2;
        public timeLeftMinutes = -1;
        public constructor(
            public offerId: number,
            public furniId: number,
            public furniType: number,
            public extraData: string,
            public stuffData: unknown,
            public price: number,
            public status: number,
            public averagePrice: number,
            public offerCount: number
        ) {}
    }
}));

const handlers = vi.hoisted(() => new Map<unknown, (event: unknown) => void>());
const confirm = vi.hoisted(() => ({ onConfirm: null as null | (() => void) }));

vi.mock('@octane/renderer', () => renderer);

vi.mock('../../../../../../api', () => ({
    LocalizeText: (key: string, _parameters?: string[], replacements?: string[]) => (replacements ? `${key}:${replacements.join(',')}` : key),
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    MarketPlaceOfferState: { ONGOING: 1, ONGOING_OWN: 1, SOLD: 2, EXPIRED: 3 },
    MarketplaceOfferData: api.MarketplaceOfferData,
    NotificationAlertType: { DEFAULT: 'default' },
    SendMessageComposer: api.SendMessageComposer
}));

vi.mock('../../../../../../common', () => ({
    Button: ({ children, onClick, disabled }: { children: unknown; onClick?: () => void; disabled?: boolean }) => (
        <button disabled={disabled} type="button" onClick={onClick}>
            {children as string}
        </button>
    ),
    Column: ({ children }: { children: unknown }) => <div>{children as string}</div>,
    Text: ({ children }: { children: unknown }) => <span>{children as string}</span>
}));

vi.mock('../../../../../../layout', () => ({
    OctaneInput: (props: Record<string, unknown>) => <input {...props} />
}));

vi.mock('../../../../../../hooks', () => ({
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => handlers.set(type, handler),
    useNotification: () => ({
        simpleAlert: vi.fn(),
        showConfirm: (_message: string, onConfirm: () => void) => {
            confirm.onConfirm = onConfirm;
        }
    })
}));

vi.mock('./CatalogLayoutMarketplaceItemView', () => ({
    OWN_OFFER: 1,
    CatalogLayoutMarketplaceItemView: ({ offerData }: { offerData: { offerId: number } }) => <div data-testid="own-offer">{offerData.offerId}</div>
}));

import { CatalogLayoutMarketplaceOwnItemsView } from './CatalogLayoutMarketplaceOwnItemsView';

const dispatchOwnOffers = (offers: { offerId: number; furniId: number; status: number; timeLeftMinutes?: number }[]) =>
    act(() =>
        handlers.get(renderer.MarketplaceOwnOffersEvent)?.({
            getParser: () => ({
                creditsWaiting: 0,
                offers: offers.map((offer) => ({
                    ...offer,
                    furniType: 1,
                    extraData: '',
                    stuffData: null,
                    price: 5,
                    averagePrice: 5,
                    offerCount: 1,
                    timeLeftMinutes: offer.timeLeftMinutes ?? 10
                }))
            })
        })
    );

beforeEach(() => {
    handlers.clear();
    confirm.onConfirm = null;
    api.SendMessageComposer.mockClear();
});

afterEach(cleanup);

describe('CatalogLayoutMarketplaceOwnItemsView', () => {
    it('lists one category at a time and narrows it with the search', () => {
        render(<CatalogLayoutMarketplaceOwnItemsView hideNavigation={() => undefined} page={null} />);
        dispatchOwnOffers([
            { offerId: 1, furniId: 10, status: 1 },
            { offerId: 2, furniId: 11, status: 2 },
            { offerId: 3, furniId: 12, status: 1, timeLeftMinutes: 0 }
        ]);

        expect(screen.getAllByTestId('own-offer').map((node) => node.textContent)).toEqual(['1']);
        expect(screen.getByText('catalog.marketplace.items_found:1')).toBeInTheDocument();

        fireEvent.change(screen.getByTestId('marketplace-own-category'), { target: { value: '3' } });

        expect(screen.getAllByTestId('own-offer').map((node) => node.textContent)).toEqual(['3']);

        fireEvent.change(screen.getByTestId('marketplace-own-category'), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText('generic.search'), { target: { value: 'nothing matches' } });
        fireEvent.keyDown(screen.getByLabelText('generic.search'), { key: 'Enter' });

        expect(screen.queryAllByTestId('own-offer')).toHaveLength(0);
        expect(screen.getByText('catalog.marketplace.no_items')).toBeInTheDocument();
    });

    it('recalls every open offer with one request and drops the offers the server returns', () => {
        render(<CatalogLayoutMarketplaceOwnItemsView hideNavigation={() => undefined} page={null} />);
        dispatchOwnOffers([
            { offerId: 1, furniId: 10, status: 1 },
            { offerId: 2, furniId: 11, status: 2 },
            { offerId: 3, furniId: 12, status: 1 }
        ]);
        api.SendMessageComposer.mockClear();

        fireEvent.click(screen.getByText('Recall all'));
        expect(api.SendMessageComposer).not.toHaveBeenCalled();

        act(() => confirm.onConfirm?.());

        const sent = api.SendMessageComposer.mock.calls.map((call) => call[0]);

        expect(sent.filter((composer) => composer instanceof renderer.CancelAllMarketplaceOffersMessageComposer)).toHaveLength(1);
        expect(sent.filter((composer) => composer instanceof renderer.CancelMarketplaceOfferMessageComposer)).toHaveLength(0);

        act(() =>
            handlers.get(renderer.MarketplaceCancelAllOffersResultEvent)?.({
                getParser: () => ({ offerIds: [1, 3], success: true })
            })
        );

        expect(screen.queryAllByTestId('own-offer')).toHaveLength(0);
    });

    it('clears the sold list through the server once the tab is marked as seen', () => {
        render(<CatalogLayoutMarketplaceOwnItemsView hideNavigation={() => undefined} page={null} />);
        dispatchOwnOffers([{ offerId: 2, furniId: 11, status: 2 }]);

        fireEvent.change(screen.getByTestId('marketplace-own-category'), { target: { value: '2' } });
        expect(screen.getAllByTestId('own-offer')).toHaveLength(1);
        api.SendMessageComposer.mockClear();

        fireEvent.click(screen.getByText('Mark as seen'));
        act(() => confirm.onConfirm?.());

        const cleared = api.SendMessageComposer.mock.calls
            .map((call) => call[0])
            .filter((composer) => composer instanceof renderer.ClearOwnMarketplaceHistoryMessageComposer)
            .map((composer) => (composer as { state: number }).state);

        expect(cleared).toEqual([2]);
        // Nothing disappears until the server confirms the tab was cleared.
        expect(screen.getAllByTestId('own-offer')).toHaveLength(1);

        act(() => handlers.get(renderer.MarketplaceClearOwnHistoryResultEvent)?.({ getParser: () => ({ success: true }) }));

        expect(screen.queryAllByTestId('own-offer')).toHaveLength(0);
    });
});
