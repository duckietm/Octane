import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const links = vi.hoisted(() => [] as string[]);

vi.mock('@octane/renderer', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@octane/renderer')>()),
    CreateLinkEvent: (link: string) => links.push(link)
}));

vi.mock('../../../../../api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../api')>()),
    GetConfigurationValue: (key: string, fallback: unknown) => (key === 'image.library.url' ? 'https://cdn.example/c_images/' : fallback)
}));

import { CatalogLayoutInfoDucketsView, CatalogLayoutInfoLoyaltyView } from './CatalogLayoutInfoIllustrationView';

const text =
    '1. <a href="event:habbopages/wired_actie.html" style="color:#000;font-weight:bold;" >Wired Acties</a>.\n' +
    '2. <a href="event:habbopages/wired_reactie.html" style="color:#000;font-weight:bold;">Wired Reacties</a>.';

describe('AIR info pages with an illustration', () => {
    it('info_loyalty: the description with working client links and the diamond illustration', () => {
        const page = { layoutCode: 'info_loyalty', localization: { getText: (index: number) => (index === 0 ? text : ''), getImage: () => '' } };
        const { container } = render(<CatalogLayoutInfoLoyaltyView page={page as any} hideNavigation={() => undefined} />);

        fireEvent.click(screen.getByText('Wired Reacties'));

        expect(links).toEqual(['habbopages/wired_reactie.html']);
        expect(container.querySelector('img')?.getAttribute('src')).toBe('https://cdn.example/c_images/catalogue/diamond_info_illustration.gif');
    });

    it('info_duckets: AIR places the taller description at 24, 19 and the duckets illustration at 236, 10', () => {
        const page = {
            layoutCode: 'info_duckets',
            localization: { getText: (index: number) => (index === 0 ? 'Duckets <b>info</b>' : ''), getImage: () => '' }
        };
        const { container } = render(<CatalogLayoutInfoDucketsView page={page as any} hideNavigation={() => undefined} />);
        const description = container.querySelector('.octane-catalog-layout-info-illustration__description') as HTMLElement;
        const image = container.querySelector('img') as HTMLImageElement;

        expect(description).toHaveTextContent('Duckets info');
        expect(description.style.left).toBe('24px');
        expect(description.style.top).toBe('19px');
        expect(description.style.maxHeight).toBe('420px');
        expect(image.getAttribute('src')).toBe('https://cdn.example/c_images/catalogue/duckets_info_illustration.gif');
        expect(image.style.left).toBe('236px');
        expect(image.style.top).toBe('10px');
    });
});
