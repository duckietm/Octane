import { CreateLinkEvent } from '@octane/renderer';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DispatchUiEvent, SendMessageComposer } from '../../../../../api';
import {
    useCatalogActions,
    useCatalogData,
    useCatalogSkipPurchaseConfirmation,
    useCatalogUiState,
    useClubOffers,
    useGiftConfiguration,
    useNotification,
    usePurse
} from '../../../../../hooks';
import { CatalogLayoutVipBuyView } from './CatalogLayoutVipBuyView';

const composerTypes = vi.hoisted(() => {
    class PurchaseFromCatalogComposer {
        public constructor(
            public readonly pageId: number,
            public readonly offerId: number,
            public readonly extraData: string | null,
            public readonly amount: number
        ) {}
    }

    class PurchaseFromCatalogAsGiftComposer {
        public constructor(..._args: unknown[]) {}
    }

    return { PurchaseFromCatalogAsGiftComposer, PurchaseFromCatalogComposer };
});

vi.mock('@octane/renderer', () => ({
    CreateLinkEvent: vi.fn(),
    GiftReceiverNotFoundEvent: class {},
    PurchaseFromCatalogAsGiftComposer: composerTypes.PurchaseFromCatalogAsGiftComposer,
    PurchaseFromCatalogComposer: composerTypes.PurchaseFromCatalogComposer
}));

vi.mock('../../../../../api', () => ({
    CatalogPurchaseState: { CONFIRM: 1, FAILED: 3, NONE: 0, PURCHASE: 2 },
    DispatchUiEvent: vi.fn(),
    GetConfigurationValue: vi.fn((_key: string, fallback: string) => fallback),
    LocalizeText: (key: string, _names?: string[], values?: string[]) => `${key}${values?.length ? `:${values.join(',')}` : ''}`,
    OpenUrl: vi.fn(),
    SanitizeHtml: (value: string) => value,
    SendMessageComposer: vi.fn()
}));

vi.mock('../../../../../common', () => ({
    AutoGrid: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    Button: ({ children, classNames: _classNames, fullWidth: _fullWidth, variant: _variant, ...props }: any) => <button {...props}>{children}</button>,
    Column: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    Flex: ({ alignItems: _alignItems, children, ...props }: any) => <div {...props}>{children}</div>,
    Grid: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    LayoutCurrencyIcon: () => <span />,
    LayoutLoadingSpinnerView: () => <span />,
    OctaneCardContentView: ({ children, classNames = [], overflow: _overflow, ...props }: any) => (
        <div className={classNames.join(' ')} {...props}>
            {children}
        </div>
    ),
    OctaneCardHeaderView: ({ headerText, onCloseClick }: any) => (
        <header>
            <span>{headerText}</span>
            <button aria-label="close" type="button" onClick={onCloseClick} />
        </header>
    ),
    OctaneCardView: ({ children, classNames = [], frameStyle, isResizable: _isResizable, theme: _theme, ...props }: any) => (
        <div className={`${classNames.join(' ')} octane-card-frame-${frameStyle}`} {...props}>
            {children}
        </div>
    ),
    Text: ({ children, ...props }: any) => <span {...props}>{children}</span>
}));

vi.mock('../../../../../events', () => ({
    CatalogEvent: class {},
    CatalogInitGiftEvent: class {
        public constructor(
            public pageId: number,
            public offerId: number,
            public extraData: string,
            public receiverName: string
        ) {}
    },
    CatalogPurchasedEvent: { PURCHASE_SUCCESS: 'purchase-success' },
    CatalogPurchaseFailureEvent: { PURCHASE_FAILED: 'purchase-failed' }
}));

vi.mock('../../../../../hooks', () => ({
    useCatalogActions: vi.fn(),
    useCatalogData: vi.fn(),
    useCatalogSkipPurchaseConfirmation: vi.fn(),
    useCatalogUiState: vi.fn(),
    useClubOffers: vi.fn(),
    useGiftConfiguration: vi.fn(),
    useMessageEvent: vi.fn(),
    useNotification: vi.fn(),
    usePurse: vi.fn(),
    useUiEvent: vi.fn(),
    useUserDataSnapshot: () => ({ userName: 'Owner' })
}));

const makeOffer = (offerId: number, months: number, vip: boolean) => ({
    day: 1,
    extraDays: 0,
    giftable: false,
    month: 1,
    months,
    offerId,
    priceActivityPoints: 0,
    priceActivityPointsType: 0,
    priceCredits: 10,
    vip,
    year: 2030
});

const renderLayout = (layoutCode: string) =>
    render(
        <CatalogLayoutVipBuyView
            page={{ layoutCode, localization: { getImage: () => '', getText: () => '' }, offers: [], pageId: 50 } as any}
            hideNavigation={() => undefined}
        />
    );

afterEach(cleanup);

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCatalogData).mockImplementation(
        () =>
            ({
                currentPage: (screen.queryByTestId('unused') as any) ?? null
            }) as any
    );
    vi.mocked(useClubOffers).mockReturnValue({ data: [makeOffer(1, 1, false), makeOffer(2, 2, true)] } as any);
    vi.mocked(useCatalogActions).mockReturnValue({ resetPlacedOfferData: vi.fn() } as any);
    vi.mocked(useGiftConfiguration).mockReturnValue({ data: { isEnabled: true } } as any);
    vi.mocked(useCatalogSkipPurchaseConfirmation).mockReturnValue([false] as any);
    vi.mocked(useCatalogUiState).mockReturnValue({ giftReceiver: 'Gift Friend' } as any);
    vi.mocked(useNotification).mockReturnValue({ showConfirm: vi.fn(), simpleAlert: vi.fn() } as any);
    vi.mocked(usePurse).mockReturnValue({
        getCurrencyAmount: () => 1000,
        purse: { clubDays: 0, clubPeriods: 0, isVip: false }
    } as any);
});

const setCurrentPage = (layoutCode: string) => {
    vi.mocked(useCatalogData).mockReturnValue({
        currentPage: { layoutCode, localization: { getImage: () => '', getText: () => '' }, offers: [], pageId: 50 }
    } as any);
};

describe('club purchase layout', () => {
    it('renders only VIP offers on the VIP page', () => {
        setCurrentPage('vip_buy');
        renderLayout('vip_buy');

        expect(screen.queryByText('catalog.vip.item.header.months:1')).not.toBeInTheDocument();
        expect(screen.getByText('catalog.vip.item.header.months:2')).toBeInTheDocument();
        expect(document.querySelector('.octane-club-vip-intro')).toBeInTheDocument();
        expect(document.querySelector('.octane-club-vip-offers')).toBeInTheDocument();
        expect(document.querySelector('.octane-club-columns')).not.toBeInTheDocument();
        expect(document.querySelector('.is-vip-page .octane-club-vip-medium-mark')).toBeInTheDocument();
        expect(document.querySelector('.is-vip-page .octane-club-compact-mark')).not.toBeInTheDocument();
    });

    it('renders separate HC and VIP offer groups on the club page', () => {
        setCurrentPage('club_buy');
        renderLayout('club_buy');

        expect(document.querySelector('.octane-club-columns')).toBeInTheDocument();
        expect(document.querySelector('.octane-club-hc-column')).toBeInTheDocument();
        expect(document.querySelector('.octane-club-vip-column')).toBeInTheDocument();
        expect(screen.getByText('catalog.club.item.header:1')).toBeInTheDocument();
        expect(screen.getByText('catalog.club.item.header:2')).toBeInTheDocument();
        expect(screen.getAllByText('catalog.club.price:10')).toHaveLength(2);
        expect(document.querySelector('.octane-club-offer.is-compact .octane-currency-icon')).not.toBeInTheDocument();
        expect(document.querySelector('.octane-club-purchase-panel')).not.toBeInTheDocument();
    });

    it('renders safely while membership data is unavailable', () => {
        setCurrentPage('club_buy');
        vi.mocked(usePurse).mockReturnValue({ getCurrencyAmount: () => 0, purse: null } as any);

        expect(() => renderLayout('club_buy')).not.toThrow();
        expect(screen.getByText('catalog.club.buy.header.none')).toBeInTheDocument();
    });

    it('opens the club center through the existing plain-text link', () => {
        setCurrentPage('club_buy');
        renderLayout('club_buy');

        fireEvent.click(screen.getByRole('button', { name: 'catalog.club.buy.link' }));

        expect(CreateLinkEvent).toHaveBeenCalledWith('habboUI/open/hccenter');
    });

    it('submits an offer from its own buy button once', async () => {
        setCurrentPage('club_buy');
        vi.mocked(useCatalogSkipPurchaseConfirmation).mockReturnValue([true] as any);
        renderLayout('club_buy');

        const buyButton = (await screen.findAllByRole('button', { name: 'catalog.club.button.buy' }))[0];
        fireEvent.click(buyButton);
        fireEvent.click(buyButton);

        await waitFor(() => expect(SendMessageComposer).toHaveBeenCalledTimes(1));
        expect(vi.mocked(SendMessageComposer).mock.calls[0][0]).toBeInstanceOf(composerTypes.PurchaseFromCatalogComposer);
        expect(vi.mocked(SendMessageComposer).mock.calls[0][0]).toMatchObject({ amount: 1, offerId: 1, pageId: 50 });
    });

    it('turns the purchase confirmation into gifting before opening the customizer', () => {
        setCurrentPage('vip_buy');
        vi.mocked(useClubOffers).mockReturnValue({ data: [{ ...makeOffer(2, 2, true), giftable: true }] } as any);
        renderLayout('vip_buy');

        fireEvent.click(screen.getByRole('button', { name: 'catalog.purchase_confirmation.gift' }));

        expect(DispatchUiEvent).not.toHaveBeenCalled();
        const dialog = screen.getByRole('dialog', { name: 'catalog.club.buy.confirm' });

        fireEvent.click(within(dialog).getByRole('button', { name: 'catalog.club.buy.subscribe' }));

        expect(DispatchUiEvent).toHaveBeenCalledWith(expect.objectContaining({ extraData: '', offerId: 2, pageId: 50, receiverName: 'Gift Friend' }));
    });
});
