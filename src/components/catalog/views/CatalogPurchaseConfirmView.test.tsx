import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { CatalogPurchaseConfirmView, nextRaffleDots } from './CatalogPurchaseConfirmView';

vi.mock('../../../api', async () => {
    const actual = await vi.importActual<typeof import('../../../api')>('../../../api');

    return {
        ...actual,
        GetConfigurationValue: (key: string) => (key === 'disclaimer.credit_spending.enabled' ? false : '/currency/%type%.png'),
        LocalizeText: (key: string) => key
    };
});

afterEach(cleanup);

const offer = {
    localizationName: 'Sedia classica',
    localizationDescription: 'Una sedia molto comoda',
    priceInCredits: 25,
    priceInActivityPoints: 5,
    activityPointType: 0,
    isRentOffer: false,
    offerId: 42,
    product: {
        getIconUrl: () => '/catalog/sedia.png'
    }
} as any;

describe('catalog purchase confirmation', () => {
    it('shows the exact product, quantity and total before buying', () => {
        render(<CatalogPurchaseConfirmView offer={offer} quantity={2} onCancel={() => undefined} onConfirm={() => undefined} />);

        expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
        expect(screen.getByText('Sedia classica')).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Sedia classica' })).toHaveAttribute('src', '/catalog/sedia.png');
        expect(screen.getByText('X 2')).toBeInTheDocument();
        expect(screen.getByText('50')).toBeInTheDocument();
        expect(screen.getByText('+ 10')).toBeInTheDocument();
        expect(screen.queryByText('Una sedia molto comoda')).not.toBeInTheDocument();
    });

    it('supports explicit confirmation and Escape cancellation', () => {
        const onCancel = vi.fn();
        const onConfirm = vi.fn();
        const { rerender } = render(<CatalogPurchaseConfirmView offer={offer} quantity={1} onCancel={onCancel} onConfirm={onConfirm} />);

        fireEvent.click(screen.getByRole('button', { name: /catalog\.purchase_confirmation\.buy/i }));
        expect(onConfirm).toHaveBeenCalledOnce();

        rerender(<CatalogPurchaseConfirmView offer={offer} quantity={1} onCancel={onCancel} onConfirm={onConfirm} />);
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it('shows the remaining limited stock before confirmation', () => {
        const limitedOffer = {
            ...offer,
            product: {
                ...offer.product,
                isUniqueLimitedItem: true,
                uniqueLimitedItemsLeft: 7,
                uniqueLimitedItemSeriesSize: 100
            }
        } as any;

        render(<CatalogPurchaseConfirmView offer={limitedOffer} quantity={1} onCancel={() => undefined} onConfirm={() => undefined} />);

        expect(screen.getByRole('status')).toHaveClass('octane-catalog-purchase-confirm-limited');
        // The positioned span is the hook the dialog styles rely on to paint the line above the frame.
        expect(screen.getByRole('status').firstElementChild?.tagName).toBe('SPAN');
        expect(screen.getByRole('status')).toHaveTextContent(/^unique\.items\.left 7 \/ unique\.items\.number\.sold 100$/);
        expect(screen.queryByText(/catalog\.limited\.items\.left/)).not.toBeInTheDocument();
    });

    it('swaps the limited line for the AIR raffling line with growing dots while the raffle runs', () => {
        vi.useFakeTimers();

        try {
            const limitedOffer = { ...offer, product: { ...offer.product, isUniqueLimitedItem: true, uniqueLimitedItemsLeft: 3, uniqueLimitedItemSeriesSize: 10 } } as any;

            render(<CatalogPurchaseConfirmView isRaffling isSubmitting offer={limitedOffer} quantity={1} onCancel={() => undefined} onConfirm={() => undefined} />);

            const status = screen.getByRole('status');

            expect(status).toHaveClass('octane-catalog-purchase-confirm-limited', 'is-raffling');
            expect(status.textContent).toMatch(/[^.]\.$/);
            expect(status).not.toHaveTextContent(/unique\.items\.left/);

            act(() => vi.advanceTimersByTime(300));
            expect(status.textContent).toMatch(/[^.]\.\.\.$/);
        } finally {
            vi.useRealTimers();
        }
    });

    it('cycles the raffling dots from one to fourteen', () => {
        expect(nextRaffleDots(1)).toBe(2);
        expect(nextRaffleDots(13)).toBe(14);
        expect(nextRaffleDots(14)).toBe(1);
    });

    it('moves the focus into the dialog and restores it to the opener when closed', async () => {
        const opener = document.createElement('button');
        document.body.appendChild(opener);
        opener.focus();

        const { unmount } = render(<CatalogPurchaseConfirmView offer={offer} quantity={1} onCancel={() => undefined} onConfirm={() => undefined} />);
        const dialog = screen.getByRole('dialog');

        // Base UI moves the focus into the dialog (its focus guards keep Tab inside) ...
        await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
        expect(opener).not.toHaveFocus();

        unmount();
        await waitFor(() => expect(opener).toHaveFocus());
        opener.remove();
    });
});
