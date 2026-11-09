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

import { CatalogLayoutInfoLoyaltyView } from './CatalogLayoutInfoLoyaltyView';

const text =
    '1. <a href="event:habbopages/wired_actie.html" style="color:#000;font-weight:bold;" >Wired Acties</a>.\n' +
    '2. <a href="event:habbopages/wired_reactie.html" style="color:#000;font-weight:bold;">Wired Reacties</a>.';

describe('info_loyalty page (AIR layout_info_loyalty_xml)', () => {
    it('shows the description with working client links and the diamond illustration', () => {
        const page = { layoutCode: 'info_loyalty', localization: { getText: (index: number) => (index === 0 ? text : ''), getImage: () => '' } };
        const { container } = render(<CatalogLayoutInfoLoyaltyView page={page as any} hideNavigation={() => undefined} />);

        fireEvent.click(screen.getByText('Wired Reacties'));

        expect(links).toEqual(['habbopages/wired_reactie.html']);
        expect(container.querySelector('img')?.getAttribute('src')).toBe('https://cdn.example/c_images/catalogue/diamond_info_illustration.gif');
    });
});
