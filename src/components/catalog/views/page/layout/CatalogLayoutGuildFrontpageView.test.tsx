import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const links = vi.hoisted(() => [] as string[]);

vi.mock('@octane/renderer', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@octane/renderer')>()),
    CreateLinkEvent: (link: string) => links.push(link)
}));

import { CatalogLayouGuildFrontpageView } from './CatalogLayoutGuildFrontpageView';

describe('guild_frontpage page (AIR layout_guild_frontpage_xml)', () => {
    it('shows the title (text 2), the description (text 1), the teaser (image 1) and starts a guild', () => {
        const texts = ['header text', 'Make your own group', 'Groups'];
        const page = {
            localization: {
                getText: (index: number) => texts[index] ?? '',
                getImage: (index: number) => (index === 1 ? 'https://cdn.example/guild.png' : null)
            }
        };
        const { container } = render(<CatalogLayouGuildFrontpageView page={page as any} hideNavigation={() => undefined} />);

        expect(container.querySelector('.octane-catalog-air-info__guild-title')).toHaveTextContent('Groups');
        expect(container.querySelector('.octane-catalog-air-info__guild-text')).toHaveTextContent('Make your own group');
        expect(screen.queryByText('header text')).toBeNull();
        expect(container.querySelector('img')?.getAttribute('src')).toBe('https://cdn.example/guild.png');

        fireEvent.click(screen.getByRole('button'));
        expect(links).toEqual(['groups/create']);
    });
});
