import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../hooks', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../hooks')>()),
    useCatalogData: () => ({ currentOffer: null })
}));

vi.mock('../../../../../api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../api')>()),
    GetConfigurationValue: (key: string, fallback: unknown) => (key === 'image.library.url' ? 'https://cdn.example/c_images/' : fallback)
}));

vi.mock('../widgets/CatalogAddOnBadgeWidgetView', () => ({ CatalogAddOnBadgeWidgetView: () => null }));
vi.mock('../widgets/CatalogAddOnChatStyleWidgetView', () => ({ CatalogAddOnChatStyleWidgetView: () => null }));
vi.mock('../widgets/CatalogBundleGridWidgetView', () => ({ CatalogBundleGridWidgetView: () => <div>bundle grid</div> }));
vi.mock('../widgets/CatalogFirstProductSelectorWidgetView', () => ({ CatalogFirstProductSelectorWidgetView: () => null }));
vi.mock('../widgets/CatalogPurchaseWidgetView', () => ({ CatalogPurchaseWidgetView: () => <div>purchase</div> }));
vi.mock('../widgets/CatalogSimplePriceWidgetView', () => ({ CatalogSimplePriceWidgetView: () => null }));

import { CatalogLayoutSingleBundleView } from './CatalogLayoutSingleBundleView';

const page = (texts: string[], images: string[] = []) =>
    ({ localization: { getText: (index: number) => texts[index] ?? '', getImage: (index: number) => images[index] || null } }) as any;

describe('single bundle page (AIR layout_single_bundle_xml)', () => {
    afterEach(cleanup);

    it('places the description, the special text, the footer line and the default teaser at their AIR spots', () => {
        const { container } = render(
            <CatalogLayoutSingleBundleView page={page(['header', 'All in one', 'Includes:', 'Limited time'])} hideNavigation={() => undefined} />
        );

        expect(container.querySelector('.octane-catalog-air-bundle__description')).toHaveTextContent('All in one');
        expect(container.querySelector('.octane-catalog-air-bundle__special')).toHaveTextContent('Includes:');
        expect(container.querySelector('.octane-catalog-air-bundle__footer-text')).toHaveTextContent('Limited time');
        expect(container.querySelector('.octane-catalog-air-bundle__teaser')?.getAttribute('src')).toBe(
            'https://cdn.example/c_images/catalogue/small_movie_roomteaser.gif'
        );
        expect(container).not.toHaveTextContent('header');
    });

    it('uses the page teaser and hides the empty footer box', () => {
        const { container } = render(
            <CatalogLayoutSingleBundleView page={page(['', 'x'], ['', 'https://cdn.example/own.gif'])} hideNavigation={() => undefined} />
        );

        expect(container.querySelector('.octane-catalog-air-bundle__teaser')?.getAttribute('src')).toBe('https://cdn.example/own.gif');
        expect(container.querySelector('.octane-catalog-air-bundle__footer')).toBeNull();
    });
});
