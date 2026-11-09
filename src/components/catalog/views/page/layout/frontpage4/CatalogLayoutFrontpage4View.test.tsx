import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ links: [] as string[], items: [] as any[] }));

vi.mock('@octane/renderer', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@octane/renderer')>()),
    CreateLinkEvent: (link: string) => state.links.push(link),
    FrontPageItem: class {
        static ITEM_CATALOGUE_PAGE = 0;
        static ITEM_PRODUCT_OFFER = 1;
    }
}));

vi.mock('../../../../../../hooks', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../../hooks')>()),
    useCatalogData: () => ({ frontPageItems: state.items })
}));

vi.mock('../../../../../../api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../../api')>()),
    GetConfigurationValue: (key: string, fallback: unknown) => (key === 'image.library.url' ? 'https://cdn.example/c_images/' : fallback)
}));

vi.mock('../../common/CatalogRedeemVoucherView', () => ({ CatalogRedeemVoucherView: () => <div>voucher</div> }));

import { CatalogLayoutFrontpage4View } from './CatalogLayoutFrontpage4View';

const item = (itemName: string, type: number, extra: Record<string, unknown>) => ({ itemName, itemPromoImage: `${itemName}.png`, type, ...extra });

describe('front page (AIR layout_frontpage_featured_xml)', () => {
    afterEach(cleanup);

    it('shows the first item on the left, every other item in the list and the voucher label', () => {
        state.items = [
            item('First', 0, { catalogPageLocation: 'new' }),
            item('Two', 1, { productOfferId: 22 }),
            item('Three', 0, { catalogPageLocation: 'pets' }),
            item('Four', 0, { catalogPageLocation: 'rares' }),
            item('Five', 0, { catalogPageLocation: 'wired' })
        ];
        const hideNavigation = vi.fn();
        const page = { localization: { getText: (index: number) => (index === 1 ? 'Got a voucher code?' : ''), getImage: () => null } } as any;
        const { container } = render(<CatalogLayoutFrontpage4View page={page} hideNavigation={hideNavigation} />);

        expect(hideNavigation).toHaveBeenCalled();
        expect(container.querySelector('.octane-catalog-air-frontpage__first')).toHaveTextContent('First');
        expect(Array.from(container.querySelectorAll('.octane-catalog-air-frontpage__item')).map((element) => element.textContent)).toEqual([
            'Two',
            'Three',
            'Four',
            'Five'
        ]);
        expect(screen.getByText('Got a voucher code?')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Two'));
        fireEvent.click(screen.getByText('Five'));

        expect(state.links).toEqual(['catalog/open/22', 'catalog/open/wired']);
    });

    it('hides the navigation once when the page opens, not again when it re-renders before the next tab loads', () => {
        state.items = [];
        const page = { localization: { getText: () => '', getImage: () => null } } as any;
        const first = vi.fn();
        const { rerender } = render(<CatalogLayoutFrontpage4View page={page} hideNavigation={first} />);

        // Clicking another tab shows the navigation again; the front page is still mounted until that tab's page
        // arrives and re-renders with a new callback.
        const second = vi.fn();
        rerender(<CatalogLayoutFrontpage4View page={page} hideNavigation={second} />);

        expect(first).toHaveBeenCalledTimes(1);
        expect(second).not.toHaveBeenCalled();

        rerender(<CatalogLayoutFrontpage4View page={{ ...page }} hideNavigation={second} />);

        expect(second).toHaveBeenCalledTimes(1);
    });
});
