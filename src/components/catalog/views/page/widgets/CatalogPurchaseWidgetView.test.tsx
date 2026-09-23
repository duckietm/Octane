import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetClubMemberLevel } from '../../../../../api';
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
    PurchaseFromCatalogComposer: class {}
}));

vi.mock('../../../../../api', () => ({
    BuilderFurniPlaceableStatus: { NOT_GROUP_ADMIN: 1, OKAY: 0 },
    CatalogPurchaseState: { CONFIRM: 1, FAILED: 3, NONE: 0, PURCHASE: 2, SOLD_OUT: 4 },
    CatalogType: { BUILDER: 'BUILDERS_CLUB', NORMAL: 'NORMAL' },
    DispatchUiEvent: vi.fn(),
    GetClubMemberLevel: vi.fn(() => 0),
    GetConfigurationValue: vi.fn((_key: string, fallback: unknown) => fallback),
    LocalizeText: (key: string) => key,
    NotificationBubbleType: {},
    Offer: { PRICING_MODEL_SINGLE: 'single' },
    OpenUrl: vi.fn(),
    ProductTypeEnum: { FLOOR: 's', HABBICON: 'h', WALL: 'i' },
    SendMessageComposer: vi.fn()
}));

vi.mock('../../../../../api/catalog/CatalogBundleDiscount', () => ({ getCatalogBundlePrice: (price: number) => ({ price }) }));
vi.mock('../../../../../api/habbicons', () => ({ useHabbiconCatalog: () => ({ entries: [] }) }));
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

vi.mock('../../../../../hooks', () => ({
    useCatalogActions: vi.fn(),
    useCatalogBundleDiscountRuleset: vi.fn(),
    useCatalogData: vi.fn(),
    useCatalogSkipPurchaseConfirmation: vi.fn(),
    useCatalogUiState: vi.fn(),
    useNotification: vi.fn(),
    usePurse: vi.fn(),
    useUiEvent: vi.fn()
}));

vi.mock('../../CatalogPurchaseConfirmView', () => ({ CatalogPurchaseConfirmView: () => null }));

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

    it('lets a layout block the purchase without hiding the buttons', () => {
        render(<CatalogPurchaseWidgetView disabled />);

        expect(screen.getByRole('button', { name: 'catalog.purchase_confirmation.gift' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'catalog.purchase_confirmation.buy' })).toBeDisabled();
    });
});
