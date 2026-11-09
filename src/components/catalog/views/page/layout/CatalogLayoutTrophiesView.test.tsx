import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ currentOffer: null as any, purchaseOptions: {} as any, selected: [] as string[] }));

vi.mock('../../../../../hooks', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../hooks')>()),
    useCatalogData: () => ({ currentOffer: state.currentOffer }),
    useCatalogActions: () => ({
        selectCatalogOffer: (offer: any) => {
            state.selected.push(offer.localizationId);
            state.currentOffer = offer;
        }
    }),
    useCatalogUiState: () => ({
        setPurchaseOptions: (update: (previous: any) => any) => {
            state.purchaseOptions = update(state.purchaseOptions);
        }
    })
}));

vi.mock('../widgets/CatalogPurchaseWidgetView', () => ({ CatalogPurchaseWidgetView: () => <div>purchase</div> }));
vi.mock('../widgets/CatalogTotalPriceWidget', () => ({ CatalogTotalPriceWidget: () => <div>price</div> }));
vi.mock('../../../../../common/layout/LayoutFurniImageView', () => ({
    LayoutFurniImageView: (props: { productClassId: number }) => <div data-testid="preview">{props.productClassId}</div>
}));

import { CatalogLayoutTrophiesView } from './CatalogLayoutTrophiesView';

const offer = (localizationId: string, classId: number) => ({ localizationId, product: { productType: 's', productClassId: classId, extraParam: '' } });
const offers = [
    offer('a0 prizetrophy_g', 1),
    offer('a0 prizetrophy_s', 2),
    offer('a0 prizetrophy_b', 3),
    offer('a0 prizetrophy2_g', 4),
    offer('a0 prizetrophy2_b', 6)
];
const page = { offers, localization: { getText: (index: number) => ['Pick a trophy', 'Your inscription'][index] ?? '', getImage: () => null } } as any;

describe('trophies page (AIR layout_trophies_xml)', () => {
    afterEach(cleanup);

    beforeEach(() => {
        state.currentOffer = null;
        state.purchaseOptions = {};
        state.selected.length = 0;
    });

    it('starts on the first model in gold, steps models and picks the metal', () => {
        const { rerender } = render(<CatalogLayoutTrophiesView page={page} hideNavigation={() => undefined} />);
        const refresh = () => rerender(<CatalogLayoutTrophiesView page={page} hideNavigation={() => undefined} />);

        expect(state.selected.at(-1)).toBe('a0 prizetrophy_g');
        expect(screen.getByText('Your inscription')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
        refresh();
        expect(state.selected.at(-1)).toBe('a0 prizetrophy2_g');

        fireEvent.click(screen.getByRole('radio', { name: 's' }));
        refresh();
        expect(state.selected.at(-1)).toBe('a0 prizetrophy2_g');

        fireEvent.click(screen.getByRole('radio', { name: 'b' }));
        refresh();
        expect(state.selected.at(-1)).toBe('a0 prizetrophy2_b');

        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
        refresh();
        expect(state.selected.at(-1)).toBe('a0 prizetrophy_b');
        expect(screen.getByTestId('preview')).toHaveTextContent('3');
    });

    it('sends the inscription with the purchase', () => {
        const { rerender } = render(<CatalogLayoutTrophiesView page={page} hideNavigation={() => undefined} />);

        rerender(<CatalogLayoutTrophiesView page={page} hideNavigation={() => undefined} />);
        act(() => {
            fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Winner 2026' } });
        });

        expect(state.purchaseOptions.extraData).toBe('Winner 2026');
    });

    it('opens on the trophy the catalog was opened for', () => {
        state.currentOffer = offers[4];

        render(<CatalogLayoutTrophiesView page={page} hideNavigation={() => undefined} />);

        expect(state.selected.at(-1)).toBe('a0 prizetrophy2_b');
    });
});
