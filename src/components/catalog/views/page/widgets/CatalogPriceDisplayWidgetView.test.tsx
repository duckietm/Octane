import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CatalogPriceDisplayWidgetView } from './CatalogPriceDisplayWidgetView';

vi.mock('../../../../../common', () => ({
    LayoutCurrencyIcon: ({ type }: { type: number }) => <span data-currency-type={type} />,
    Text: ({ children, ...props }: any) => <span {...props}>{children}</span>
}));

vi.mock('../../../../../hooks', () => ({
    useCatalogBundleDiscountRuleset: () => ({ data: null }),
    useCatalogUiState: () => ({ purchaseOptions: { quantity: 1 } })
}));

afterEach(cleanup);

describe('catalog price display', () => {
    it('identifies the credits price so its catalog frame can use the dedicated currency artwork', () => {
        const { container } = render(
            <CatalogPriceDisplayWidgetView
                offer={{ activityPointType: 0, priceInActivityPoints: 0, priceInCredits: 3 } as any}
            />
        );

        expect(container.querySelector('.octane-catalog-standard-price-pill.is-credits')).toBeInTheDocument();
    });
});
