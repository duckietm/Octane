import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CatalogOfferTileView } from './CatalogOfferTileView';

const offer = (getIconUrl?: () => string) =>
    ({
        offerId: 90,
        localizationName: 'Sedia classica',
        priceInCredits: 4,
        priceInActivityPoints: 0,
        clubLevel: 0,
        pricingModel: 'single',
        product: {
            productType: 's',
            productClassId: 12,
            productCount: 1,
            furnitureData: { className: '' },
            getIconUrl
        }
    }) as any;

describe('catalog offer tile', () => {
    it('is keyboard selectable and does not expose technical ids to shoppers', () => {
        const selectOffer = vi.fn();
        const item = offer(() => 'icon.png');

        render(<CatalogOfferTileView offer={item} selectOffer={selectOffer} />);

        const tile = screen.getByRole('option', { name: 'Sedia classica' });
        expect(tile).not.toHaveAttribute('title', expect.stringContaining('Offer'));

        fireEvent.keyDown(tile, { key: 'Enter' });
        expect(selectOffer).toHaveBeenCalledWith(item);
    });

    it('keeps rendering when an imported product has no getIconUrl method', () => {
        expect(() => render(<CatalogOfferTileView offer={offer()} selectOffer={() => undefined} />)).not.toThrow();
    });

    it('shows the compact club-level marker and both configured prices on restricted offers', () => {
        const clubOffer = {
            ...offer(),
            clubLevel: 1,
            priceInCredits: 5,
            priceInActivityPoints: 200,
            activityPointType: 5
        };

        const { container } = render(<CatalogOfferTileView offer={clubOffer} selectOffer={() => undefined} />);

        expect(screen.getByLabelText('Habbo Club')).toBeInTheDocument();
        expect(container.querySelector('.octane-catalog-grid-price')).toHaveClass('is-multi-price');
        expect(container.querySelectorAll('.octane-catalog-grid-price-entry')).toHaveLength(2);
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('200')).toBeInTheDocument();
        expect(screen.getByText('+')).toBeInTheDocument();
    });

    it('keeps an empty price plate when the offer has no price but the page is a priced one', () => {
        const unpricedOffer = { ...offer(), priceInCredits: 0, priceInActivityPoints: 0 };

        const { container } = render(<CatalogOfferTileView offer={unpricedOffer} pageUsesBaseTemplate={false} selectOffer={() => undefined} />);

        expect(container.querySelector('.layout-grid-item')).not.toHaveClass('uses-base-grid-template');
        expect(container.querySelector('.octane-catalog-grid-price')).toHaveClass('is-empty-price');
        expect(container.querySelectorAll('.octane-catalog-grid-price-entry')).toHaveLength(0);
    });

    it('reads its own offer when no page verdict reaches it', () => {
        const unpricedOffer = { ...offer(), priceInCredits: 0, priceInActivityPoints: 0 };

        const { container } = render(<CatalogOfferTileView offer={unpricedOffer} selectOffer={() => undefined} />);

        expect(container.querySelector('.layout-grid-item')).toHaveClass('uses-base-grid-template');
        expect(container.querySelector('.octane-catalog-grid-price')).toBeNull();
    });
});
