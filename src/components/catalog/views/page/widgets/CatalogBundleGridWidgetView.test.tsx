import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CatalogBundleGridWidgetView } from './CatalogBundleGridWidgetView';

const state = vi.hoisted(() => ({ currentOffer: null as any }));

vi.mock('../../../../../hooks', () => ({
    useCatalogData: () => ({ currentOffer: state.currentOffer })
}));

vi.mock('../../../../../api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../api')>()),
    GetProductIconUrl: (product: any) => `icon/${product.name}.png`
}));

vi.mock('../../../../../common', () => ({
    AutoGrid: ({ children }: any) => <div data-testid="grid">{children}</div>,
    LayoutGridItem: ({ children }: any) => <div data-testid="item">{children}</div>
}));

const product = (name: string, productType: string) => ({ name, productType, productCount: 1 });

const icons = (container: HTMLElement) => Array.from(container.querySelectorAll('img')).map((image) => image.getAttribute('src'));

afterEach(cleanup);

describe('bundle grid', () => {
    it('lists the only furni of a single-furni bundle (AIR does not hide the main product)', () => {
        const furni = product('pterodactyl', 's');

        state.currentOffer = { product: furni, products: [furni] };

        const { container } = render(<CatalogBundleGridWidgetView hideBadges />);

        expect(icons(container)).toEqual(['icon/pterodactyl.png']);
    });

    it('leaves the badges of the bundle out, as AIR BundleProductContainer does', () => {
        state.currentOffer = { product: product('egg', 's'), products: [product('egg', 's'), product('DINO1', 'b'), product('palm', 'i')] };

        const { container } = render(<CatalogBundleGridWidgetView hideBadges />);

        expect(icons(container)).toEqual(['icon/egg.png', 'icon/palm.png']);
    });

    it('lists every product without hideBadges', () => {
        state.currentOffer = { product: product('egg', 's'), products: [product('egg', 's'), product('DINO1', 'b')] };

        const { container } = render(<CatalogBundleGridWidgetView />);

        expect(icons(container)).toEqual(['icon/egg.png', 'icon/DINO1.png']);
    });
});
