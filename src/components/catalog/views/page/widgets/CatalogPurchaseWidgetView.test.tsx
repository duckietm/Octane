import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetClubMemberLevel, SendMessageComposer } from '../../../../../api';
import {
    useCatalogActions,
    useCatalogBundleDiscountRuleset,
    useCatalogData,
    useCatalogSkipPurchaseConfirmation,
    useCatalogUiState,
    useNotification,
    usePurse
} from '../../../../../hooks';
import { CatalogPurchaseWidgetView } from './CatalogPurchaseWidgetView';

vi.mock('@octane/renderer', () => ({
    CreateLinkEvent: vi.fn(),
    LtdRaffleEnteredMessageEvent: class LtdRaffleEnteredMessageEvent {},
    LtdRaffleResultMessageEvent: class LtdRaffleResultMessageEvent {},
    NotEnoughBalanceMessageEvent: class NotEnoughBalanceMessageEvent {},
    PurchaseFromCatalogComposer: class {}
}));

vi.mock('../../../../../api', () => ({
    BuilderFurniPlaceableStatus: {
        OKAY: 0,
        MISSING_OFFER: 1,
        FURNI_LIMIT_REACHED: 2,
        NOT_IN_ROOM: 3,
        NOT_ROOM_OWNER: 4,
        GUILD_ROOM: 5,
        VISITORS_IN_ROOM: 6,
        NOT_GROUP_ADMIN: 7
    },
    CatalogPurchaseState: { CONFIRM: 1, FAILED: 3, NONE: 0, PURCHASE: 2, SOLD_OUT: 4 },
    CatalogType: { BUILDER: 'BUILDERS_CLUB', NORMAL: 'NORMAL' },
    DispatchUiEvent: vi.fn(),
    GetClubMemberLevel: vi.fn(() => 0),
    GetConfigurationValue: vi.fn((_key: string, fallback: unknown) => fallback),
    LocalizeText: (key: string) => key,
    NotificationBubbleType: { LTD: 'ltd' },
    Offer: { PRICING_MODEL_SINGLE: 'single' },
    OpenUrl: vi.fn(),
    ProductTypeEnum: { FLOOR: 's', HABBICON: 'h', WALL: 'i' },
    SendMessageComposer: vi.fn()
}));

vi.mock('../../../../../api/catalog/CatalogBundleDiscount', () => ({ getCatalogBundlePrice: (price: number) => ({ price }) }));
const habbiconCatalog = vi.hoisted(() => ({ entries: [] as { id: number; owned?: boolean; claimable?: boolean }[] }));

vi.mock('../../../../../api/habbicons', () => ({ useHabbiconCatalog: () => habbiconCatalog }));
vi.mock('../../../../../api/utils/localizeWithFallback', () => ({ localizeWithFallback: (_key: string, fallback: string) => fallback }));

vi.mock('../../../../../common', () => ({
    LayoutLoadingSpinnerView: () => null,
    Text: ({ children }: any) => <span>{children}</span>
}));

vi.mock('../../../../../events', () => ({
    CatalogEvent: class {},
    CatalogInitGiftEvent: class {},
    CatalogPurchasedEvent: { PURCHASE_SUCCESS: 'purchase-success' },
    CatalogPurchaseFailureEvent: { PURCHASE_FAILED: 'purchase-failed' },
    CatalogPurchaseNotAllowedEvent: { NOT_ALLOWED: 'purchase-not-allowed' },
    CatalogPurchaseSoldOutEvent: { SOLD_OUT: 'purchase-sold-out' }
}));

const messageHandlers = vi.hoisted(() => new Map<string, (event: unknown) => void>());
const uiHandlers = vi.hoisted(() => new Map<string, (event: unknown) => void>());
const confirmProps = vi.hoisted(() => ({ current: null as any }));

vi.mock('../../../../../hooks', () => ({
    useMessageEvent: (eventType: { name: string }, handler: (event: unknown) => void) => {
        messageHandlers.set(eventType.name, handler);
    },
    useCatalogActions: vi.fn(),
    useCatalogBundleDiscountRuleset: vi.fn(),
    useCatalogData: vi.fn(),
    useCatalogSkipPurchaseConfirmation: vi.fn(),
    useCatalogUiState: vi.fn(),
    useNotification: vi.fn(),
    usePurse: vi.fn(),
    useUiEvent: (type: string, handler: (event: unknown) => void) => {
        uiHandlers.set(type, handler);
    }
}));

vi.mock('../../CatalogPurchaseConfirmView', () => ({
    CatalogPurchaseConfirmView: (props: any) => {
        confirmProps.current = props;

        return null;
    }
}));

const makeOffer = (overrides: Record<string, unknown> = {}) => ({
    activityPointType: 0,
    bundlePurchaseAllowed: false,
    clubLevel: 0,
    giftable: true,
    haveOffer: true,
    isLazy: false,
    isRentOffer: false,
    offerId: 1,
    page: { pageId: 5 },
    priceInActivityPoints: 0,
    priceInCredits: 3,
    pricingModel: 'single',
    product: { isUniqueLimitedItem: false, productClassId: 10, productType: 's' },
    ...overrides
});

const setOffer = (offer: Record<string, unknown>) => {
    vi.mocked(useCatalogData).mockReturnValue({ currentOffer: offer, currentPage: { pageId: 5 } } as any);
};

afterEach(cleanup);

beforeEach(() => {
    vi.clearAllMocks();
    messageHandlers.clear();
    uiHandlers.clear();
    confirmProps.current = null;
    habbiconCatalog.entries = [];
    vi.mocked(GetClubMemberLevel).mockReturnValue(0);
    vi.mocked(useCatalogActions).mockReturnValue({
        getBuilderFurniPlaceableStatus: () => 0,
        getNodesByOfferId: () => [],
        requestOfferToMover: vi.fn(),
        resetPlacedOfferData: vi.fn()
    } as any);
    vi.mocked(useCatalogBundleDiscountRuleset).mockReturnValue({ data: null } as any);
    vi.mocked(useCatalogSkipPurchaseConfirmation).mockReturnValue([false] as any);
    vi.mocked(useCatalogUiState).mockReturnValue({
        currentType: 'NORMAL',
        giftReceiver: null,
        purchaseOptions: { extraData: null, extraParamRequired: false, previewStuffData: null, quantity: 1 },
        setCatalogPlaceMultipleObjects: vi.fn(),
        setPurchaseOptions: vi.fn()
    } as any);
    vi.mocked(useNotification).mockReturnValue({ showConfirm: vi.fn(), showSingleBubble: vi.fn(), simpleAlert: vi.fn() } as any);
    vi.mocked(usePurse).mockReturnValue({ getCurrencyAmount: () => 100 } as any);
    setOffer(makeOffer());
});

describe('catalog purchase widget', () => {
    it('offers the gift and buy buttons for an offer the player can buy', () => {
        render(<CatalogPurchaseWidgetView />);

        expect(screen.getByRole('button', { name: 'catalog.purchase_confirmation.gift' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'catalog.purchase_confirmation.buy' })).toBeEnabled();
    });

    it('replaces both buttons with the club invitation below the required club level', () => {
        setOffer(makeOffer({ clubLevel: 1 }));

        render(<CatalogPurchaseWidgetView />);

        expect(screen.getByText('catalog.buy.widget.get.vip.to.unlock.this.product')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'catalog.buy.widget.get.vip.button' })).toBeEnabled();
        expect(screen.queryByRole('button', { name: 'catalog.purchase_confirmation.gift' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'catalog.purchase_confirmation.buy' })).not.toBeInTheDocument();
    });

    it('keeps the purchase buttons for a member of the required club level', () => {
        vi.mocked(GetClubMemberLevel).mockReturnValue(1);
        setOffer(makeOffer({ clubLevel: 1 }));

        render(<CatalogPurchaseWidgetView />);

        expect(screen.queryByText('catalog.buy.widget.get.vip.to.unlock.this.product')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'catalog.purchase_confirmation.buy' })).toBeEnabled();
    });

    it('shows the owned state instead of the club invitation for an owned habbicon', () => {
        habbiconCatalog.entries = [{ id: 10, owned: true }];
        setOffer(makeOffer({ clubLevel: 1, product: { isUniqueLimitedItem: false, productClassId: 10, productType: 'h' } }));

        render(<CatalogPurchaseWidgetView />);

        expect(screen.queryByText('catalog.buy.widget.get.vip.to.unlock.this.product')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Owned' })).toBeDisabled();
    });

    it('keeps the buy label on the disabled button while the offer is unavailable', () => {
        setOffer(makeOffer({ haveOffer: false }));

        render(<CatalogPurchaseWidgetView />);

        expect(screen.getByRole('button', { name: 'catalog.purchase_confirmation.buy' })).toBeDisabled();
        expect(screen.queryByText('catalog.alert.not_available')).not.toBeInTheDocument();
    });

    it('keeps the rent label on the disabled button while a rent offer is unavailable', () => {
        setOffer(makeOffer({ haveOffer: false, isRentOffer: true }));

        render(<CatalogPurchaseWidgetView />);

        expect(screen.getByRole('button', { name: 'catalog.purchase_confirmation.rent' })).toBeDisabled();
    });

    it('shows the loading label while a lazy offer resolves', () => {
        setOffer(makeOffer({ haveOffer: false, isLazy: true }));

        render(<CatalogPurchaseWidgetView />);

        expect(screen.getByRole('button', { name: 'generic.loading' })).toBeDisabled();
    });

    it('lets a layout block the purchase without hiding the buttons', () => {
        render(<CatalogPurchaseWidgetView disabled />);

        expect(screen.getByRole('button', { name: 'catalog.purchase_confirmation.gift' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'catalog.purchase_confirmation.buy' })).toBeDisabled();
    });

    describe('purchase guard', () => {
        const buyButton = () => screen.getByRole('button', { name: 'catalog.purchase_confirmation.buy' });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('holds the guard while the server has not answered, however long it takes', () => {
            vi.useFakeTimers();
            render(<CatalogPurchaseWidgetView />);

            fireEvent.click(buyButton());
            act(() => confirmProps.current.onConfirm());
            act(() => vi.advanceTimersByTime(60000));

            expect(confirmProps.current.isSubmitting).toBe(true);
            act(() => confirmProps.current.onConfirm());
            expect(SendMessageComposer).toHaveBeenCalledTimes(1);
        });

        it('keeps the spinner when the dialog is closed before the answer, then reopens purchase on the answer', () => {
            render(<CatalogPurchaseWidgetView />);

            fireEvent.click(buyButton());
            act(() => confirmProps.current.onConfirm());
            act(() => confirmProps.current.onCancel());

            expect(screen.queryByRole('button', { name: 'catalog.purchase_confirmation.buy' })).not.toBeInTheDocument();

            act(() => uiHandlers.get('purchase-success')({ type: 'purchase-success' }));

            expect(buyButton()).toBeEnabled();
            fireEvent.click(buyButton());
            act(() => confirmProps.current.onConfirm());
            expect(SendMessageComposer).toHaveBeenCalledTimes(2);
        });
    });

    describe('a balance the server finds short (AIR NotEnoughBalanceMessageEvent)', () => {
        const notEnough = (notEnoughCredits: boolean, notEnoughActivityPoints: boolean, activityPointType: number) => ({
            getParser: () => ({ activityPointType, notEnoughActivityPoints, notEnoughCredits })
        });

        const startPurchase = () => {
            render(<CatalogPurchaseWidgetView />);

            fireEvent.click(screen.getByRole('button', { name: 'catalog.purchase_confirmation.buy' }));
            act(() => confirmProps.current.onConfirm());
            confirmProps.current = null;
        };

        it('ends the purchase and offers the shop when credits are short', () => {
            const { showConfirm } = vi.mocked(useNotification)();

            startPurchase();
            act(() => messageHandlers.get('NotEnoughBalanceMessageEvent')(notEnough(true, false, 0)));

            expect(confirmProps.current).toBeNull();
            expect(showConfirm).toHaveBeenCalledWith(
                'catalog.alert.notenough.credits.description',
                expect.any(Function),
                expect.any(Function),
                null,
                null,
                'catalog.alert.notenough.title'
            );
        });

        it('names the short currency when activity points are short', () => {
            const { simpleAlert } = vi.mocked(useNotification)();

            startPurchase();
            act(() => messageHandlers.get('NotEnoughBalanceMessageEvent')(notEnough(false, true, 5)));

            expect(simpleAlert).toHaveBeenCalledWith(
                'catalog.alert.notenough.activitypoints.description',
                null,
                null,
                null,
                'catalog.alert.notenough.activitypoints.title.5'
            );
        });

        it('ignores a short balance for a purchase this widget did not send', () => {
            const { showConfirm, simpleAlert } = vi.mocked(useNotification)();

            render(<CatalogPurchaseWidgetView />);
            act(() => messageHandlers.get('NotEnoughBalanceMessageEvent')(notEnough(true, false, 0)));

            expect(showConfirm).not.toHaveBeenCalled();
            expect(simpleAlert).not.toHaveBeenCalled();
        });
    });

    describe('LTD raffle (AIR PurchaseConfirmationDialog raffle_container)', () => {
        const startLimitedPurchase = () => {
            setOffer(makeOffer({ product: { isUniqueLimitedItem: true, uniqueLimitedItemsLeft: 2, productClassId: 10, productType: 's' } }));

            const view = render(<CatalogPurchaseWidgetView />);

            fireEvent.click(screen.getByRole('button', { name: 'catalog.purchase_confirmation.buy' }));
            act(() => confirmProps.current.onConfirm());
            act(() => messageHandlers.get('LtdRaffleEnteredMessageEvent')({}));

            return view;
        };

        it('keeps the confirmation open with the raffling line once the purchase enters the raffle', () => {
            startLimitedPurchase();

            expect(confirmProps.current.isRaffling).toBe(true);
            expect(confirmProps.current.isSubmitting).toBe(true);
        });

        it('closes the dialog without a note when the draw result arrives', () => {
            const { showSingleBubble } = vi.mocked(useNotification)();

            startLimitedPurchase();
            confirmProps.current = null;
            act(() => messageHandlers.get('LtdRaffleResultMessageEvent')({}));

            expect(confirmProps.current).toBeNull();
            expect(showSingleBubble).not.toHaveBeenCalled();
        });

        it('leaves the ongoing note when the dialog is closed while the raffle runs', () => {
            const { showSingleBubble } = vi.mocked(useNotification)();

            startLimitedPurchase();
            act(() => confirmProps.current.onCancel());

            expect(showSingleBubble).toHaveBeenCalledWith('This LTD purchase has not been processed yet!', 'ltd');
        });

        it('leaves the ongoing note when the catalog closes while the raffle runs', () => {
            const { showSingleBubble } = vi.mocked(useNotification)();
            const { unmount } = startLimitedPurchase();

            unmount();

            expect(showSingleBubble).toHaveBeenCalledWith('This LTD purchase has not been processed yet!', 'ltd');
        });

        it('ignores a raffle entry for a purchase this widget did not send', () => {
            render(<CatalogPurchaseWidgetView />);
            act(() => messageHandlers.get('LtdRaffleEnteredMessageEvent')({}));

            expect(confirmProps.current).toBeNull();
        });
    });

    describe('Builders Club builder widget (AIR builderWidget)', () => {
        const builderSetup = (status: number) => {
            const requestOfferToMover = vi.fn();

            vi.mocked(useCatalogActions).mockReturnValue({
                getBuilderFurniPlaceableStatus: () => status,
                getNodesByOfferId: () => [],
                requestOfferToMover,
                resetPlacedOfferData: vi.fn()
            } as any);
            vi.mocked(useCatalogUiState).mockReturnValue({
                currentType: 'BUILDERS_CLUB',
                giftReceiver: null,
                purchaseOptions: { extraData: null, extraParamRequired: false, previewStuffData: null, quantity: 1 },
                setCatalogPlaceMultipleObjects: vi.fn(),
                setPurchaseOptions: vi.fn()
            } as any);
            setOffer(makeOffer({ product: { productType: 's' } }));

            return requestOfferToMover;
        };

        it('shows the hint and places the furni while it can be placed', () => {
            const requestOfferToMover = builderSetup(0);
            render(<CatalogPurchaseWidgetView />);

            expect(screen.getByText('builder.placement_widget.hint')).toBeInTheDocument();
            expect(screen.queryByRole('status')).toBeNull();

            fireEvent.click(screen.getByText('builder.placement_widget.place_one'));

            expect(requestOfferToMover).toHaveBeenCalledTimes(1);
        });

        it('shows the not-in-room error with its icon and disables both buttons outside a room', () => {
            const requestOfferToMover = builderSetup(3);
            render(<CatalogPurchaseWidgetView />);

            expect(screen.getByRole('status')).toHaveAttribute('data-error', 'notroom');
            expect(screen.getByText('builder.placement_widget.error.not_in_room')).toBeInTheDocument();
            expect(screen.getByText('builder.placement_widget.place_one')).toBeDisabled();
            expect(screen.getByText('builder.placement_widget.place_many')).toBeDisabled();

            fireEvent.click(screen.getByText('builder.placement_widget.place_many'));

            expect(requestOfferToMover).not.toHaveBeenCalled();
        });

        it('disables the buttons at the furni limit, with the limit error, as AIR does', () => {
            builderSetup(2);
            render(<CatalogPurchaseWidgetView />);

            expect(screen.getByRole('status')).toHaveAttribute('data-error', 'furnilimit');
            expect(screen.getByText('builder.placement_widget.place_one')).toBeDisabled();
        });

        it('disables the buttons without an error strip when the offer is missing', () => {
            builderSetup(1);
            render(<CatalogPurchaseWidgetView />);

            expect(screen.queryByRole('status')).toBeNull();
            expect(screen.getByText('builder.placement_widget.place_one')).toBeDisabled();
        });
    });
});
