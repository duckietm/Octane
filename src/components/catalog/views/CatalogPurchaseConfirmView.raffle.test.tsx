import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogPurchaseConfirmView, getRaffleDots, RAFFLE_DOT_INTERVAL_MS } from './CatalogPurchaseConfirmView';

vi.mock('../../../api', async () => {
    const actual = await vi.importActual<typeof import('../../../api')>('../../../api');

    return {
        ...actual,
        GetConfigurationValue: (key: string) => (key === 'disclaimer.credit_spending.enabled' ? false : '/currency/%type%.png'),
        LocalizeText: (key: string) => key,
        localizeWithFallback: (_key: string, fallback: string) => fallback
    };
});

vi.mock('../../../hooks', async () => {
    const actual = await vi.importActual<typeof import('../../../hooks')>('../../../hooks');

    return {
        ...actual,
        // The raffle line is driven by the server events (933 / 2316); the dialog only needs
        // to know whether a raffle is running, so the tests hold it at "not running".
        useLtdRaffle: () => ({ raffleActive: false, raffleClassName: null })
    };
});


beforeEach(() => vi.useFakeTimers());

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

const limitedOffer = {
    localizationName: 'LTD Throne',
    priceInCredits: 25,
    priceInActivityPoints: 0,
    activityPointType: 0,
    isRentOffer: false,
    offerId: 42,
    product: {
        getIconUrl: () => '/catalog/throne.png',
        isUniqueLimitedItem: true,
        uniqueLimitedItemsLeft: 7,
        uniqueLimitedItemSeriesSize: 100
    }
} as any;

describe('catalog purchase confirmation raffle line', () => {
    it('cycles one to fourteen dots', () => {
        expect(getRaffleDots(0)).toBe('.');
        expect(getRaffleDots(13)).toBe('.'.repeat(14));
        expect(getRaffleDots(14)).toBe('.');
    });

    it('shows the processing line with growing dots only while an LTD purchase is pending', () => {
        const { rerender } = render(<CatalogPurchaseConfirmView offer={limitedOffer} quantity={1} onCancel={() => undefined} onConfirm={() => undefined} />);

        expect(screen.queryByTestId('purchase-confirm-raffle')).not.toBeInTheDocument();

        rerender(<CatalogPurchaseConfirmView isSubmitting offer={limitedOffer} quantity={1} onCancel={() => undefined} onConfirm={() => undefined} />);

        expect(screen.getByTestId('purchase-confirm-raffle')).toHaveTextContent("Hold on while we're processing your LTD purchase.");

        act(() => {
            vi.advanceTimersByTime(RAFFLE_DOT_INTERVAL_MS * 2);
        });

        expect(screen.getByTestId('purchase-confirm-raffle')).toHaveTextContent("Hold on while we're processing your LTD purchase...");
    });

    it('does not show the line for a regular pending purchase', () => {
        const regularOffer = { ...limitedOffer, product: { getIconUrl: () => '/catalog/chair.png', isUniqueLimitedItem: false } } as any;

        render(<CatalogPurchaseConfirmView isSubmitting offer={regularOffer} quantity={1} onCancel={() => undefined} onConfirm={() => undefined} />);

        expect(screen.queryByTestId('purchase-confirm-raffle')).not.toBeInTheDocument();
    });
});
