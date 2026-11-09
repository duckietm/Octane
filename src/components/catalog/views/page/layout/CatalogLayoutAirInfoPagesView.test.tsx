import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ opened: [] as string[], alerts: [] as unknown[][], links: [] as string[] }));

vi.mock('@octane/renderer', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@octane/renderer')>()),
    CreateLinkEvent: (link: string) => mocks.links.push(link)
}));

vi.mock('../../../../../api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../api')>()),
    GetConfigurationValue: (key: string, fallback: unknown) => (key === 'image.library.url' ? 'https://cdn.example/c_images/' : fallback),
    LocalizeText: (key: string) => (key === 'link.format.monkey' ? 'https://store.example/monkey' : key),
    OpenUrl: (url: string) => mocks.opened.push(url)
}));

vi.mock('../../../../../hooks', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../hooks')>()),
    useNotificationActions: () => ({ simpleAlert: (...args: unknown[]) => mocks.alerts.push(args) })
}));

import { CatalogLayoutInfoRentablesView, CatalogLayoutMonkeyView, CatalogLayoutRecyclerInfoView } from './CatalogLayoutAirInfoPagesView';

const page = (texts: string[], images: string[] = []) =>
    ({ localization: { getText: (index: number) => texts[index] ?? '', getImage: (index: number) => images[index] || null } }) as any;

describe('AIR info pages', () => {
    beforeEach(() => {
        mocks.opened.length = 0;
        mocks.alerts.length = 0;
        mocks.links.length = 0;
    });

    it('info_rentables: one row per rule text (texts 1-5) with the duckat icon and its rule picture', () => {
        const { container } = render(
            <CatalogLayoutInfoRentablesView
                page={page(['header', 'Rule one', 'Rule <a href="event:habbopages/rent">two</a>'])}
                hideNavigation={() => undefined}
            />
        );
        const rows = container.querySelectorAll('.octane-catalog-air-info__rule');

        expect(rows).toHaveLength(2);
        expect(rows[0]).toHaveTextContent('Rule one');
        expect(rows[1].querySelector('.octane-catalog-air-info__rule-pic')?.getAttribute('src')).toBe(
            'https://cdn.example/c_images/catalogue/rentables_rulepic2.gif'
        );
        expect(screen.queryByText('header')).toBeNull();

        fireEvent.click(screen.getByText('two'));
        expect(mocks.links).toEqual(['habbopages/rent']);
    });

    it('recycler_info: headline (text 1), text (text 2) and the ecotron box unless the page sets image 1', () => {
        const { container, rerender } = render(
            <CatalogLayoutRecyclerInfoView page={page(['header', 'Ecotron', 'Recycle your furni'])} hideNavigation={() => undefined} />
        );

        expect(container.querySelector('.octane-catalog-air-info__recycler-title')).toHaveTextContent('Ecotron');
        expect(container.querySelector('.octane-catalog-air-info__recycler-text')).toHaveTextContent('Recycle your furni');
        expect(container.querySelector('img')?.getAttribute('src')).toBe('https://cdn.example/c_images/catalogue/ctlg_ecotron_box.gif');

        rerender(
            <CatalogLayoutRecyclerInfoView page={page(['header', 'Ecotron', 'x'], ['', 'https://cdn.example/own.gif'])} hideNavigation={() => undefined} />
        );
        expect(container.querySelector('img')?.getAttribute('src')).toBe('https://cdn.example/own.gif');
    });

    it('monkey: both images open link.format.monkey with the external link notice', () => {
        const { container } = render(<CatalogLayoutMonkeyView page={page([])} hideNavigation={() => undefined} />);
        const [teaser, special] = Array.from(container.querySelectorAll('button'));

        expect(teaser.querySelector('img')?.getAttribute('src')).toBe('https://cdn.example/c_images/catalogue/catalog_monkey_teaser.gif');
        expect(special.querySelector('img')?.getAttribute('src')).toBe('https://cdn.example/c_images/catalogue/catalog_monkey_store2_en.gif');

        fireEvent.click(special);

        expect(mocks.opened).toEqual(['https://store.example/monkey']);
        expect(mocks.alerts[0][0]).toBe('catalog.alert.external.link.desc');
        expect(mocks.alerts[0][4]).toBe('catalog.alert.external.link.title');
    });
});
