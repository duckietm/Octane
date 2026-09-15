import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MARKETPLACE_CONFIRM_MODE_PRICE_CHANGED, MarketplacePurchaseConfirmView } from './MarketplacePurchaseConfirmView';

let spendingDisclaimerEnabled = false;

vi.mock('../../../../../../api', async () => {
    const actual = await vi.importActual<typeof import('../../../../../../api')>('../../../../../../api');

    return {
        ...actual,
        GetConfigurationValue: (key: string) => (key === 'disclaimer.credit_spending.enabled' ? spendingDisclaimerEnabled : ''),
        GetImageIconUrlForProduct: () => '/icon.png',
        LocalizeText: (key: string, parameters: string[] = [], replacements: string[] = []) =>
            key === 'catalog.marketplace.confirm_price' ? `Price: ${replacements[0]} Credits` : key,
        localizeWithFallback: (_key: string, fallback: string, parameters: string[] = [], replacements: string[] = []) =>
            parameters.reduce((text, parameter, index) => text.replace(`%${parameter}%`, replacements[index]), fallback)
    };
});

vi.mock('../../../../../../common', () => ({
    Button: ({ children, onClick, disabled }: any) => (
        <button disabled={disabled} type="button" onClick={onClick}>
            {children}
        </button>
    ),
    LayoutGridItem: () => <div data-testid="grid-item" />,
    OctaneCardView: ({ children }: any) => <div role="dialog">{children}</div>,
    OctaneCardHeaderView: ({ headerText, onCloseClick }: any) => (
        <div>
            <span>{headerText}</span>
            <button type="button" onClick={onCloseClick}>
                x
            </button>
        </div>
    ),
    OctaneCardContentView: ({ children }: any) => <div>{children}</div>
}));

afterEach(() => {
    cleanup();
    spendingDisclaimerEnabled = false;
});

const offer = {
    offerId: 7,
    furniId: 12,
    furniType: 1,
    extraData: '',
    stuffData: { uniqueNumber: 0 },
    price: 150,
    averagePrice: 120,
    offerCount: 4,
    isUniqueLimitedItem: false
} as any;

describe('marketplace purchase confirmation (marketplace_purchase_confirmation.xml)', () => {
    it('shows the price, the average price over the period and the offer count before buying', () => {
        const onConfirm = vi.fn();

        render(<MarketplacePurchaseConfirmView offer={offer} onCancel={() => undefined} onConfirm={onConfirm} />);

        expect(screen.getByTestId('marketplace-confirm-header')).toHaveTextContent('catalog.marketplace.confirm_header');
        expect(screen.getByTestId('marketplace-confirm-price')).toHaveTextContent('150');
        expect(screen.getByTestId('marketplace-confirm-average')).toHaveTextContent('Average price in last 30 days: 120 Credits');
        expect(screen.getByTestId('marketplace-confirm-offer-count')).toHaveTextContent('Offer count: 4');

        fireEvent.click(screen.getByRole('button', { name: 'catalog.purchase_confirmation.buy' }));
        expect(onConfirm).toHaveBeenCalledWith(offer);
    });

    it('uses the price-changed header when the cheapest copy was sold meanwhile', () => {
        render(
            <MarketplacePurchaseConfirmView
                mode={MARKETPLACE_CONFIRM_MODE_PRICE_CHANGED}
                offer={{ ...offer, averagePrice: 0 }}
                onCancel={() => undefined}
                onConfirm={() => undefined}
            />
        );

        expect(screen.getByTestId('marketplace-confirm-header')).toHaveTextContent('catalog.marketplace.confirm_higher_header');
        expect(screen.getByTestId('marketplace-confirm-average')).toHaveTextContent('- Credits');
    });

    it('keeps Buy disabled until the spending disclaimer is accepted', () => {
        spendingDisclaimerEnabled = true;

        render(<MarketplacePurchaseConfirmView offer={offer} onCancel={() => undefined} onConfirm={() => undefined} />);

        const buyButton = screen.getByRole('button', { name: 'catalog.purchase_confirmation.buy' });

        expect(buyButton).toBeDisabled();
        fireEvent.click(screen.getByTestId('marketplace-confirm-disclaimer'));
        expect(buyButton).toBeEnabled();
    });
});
