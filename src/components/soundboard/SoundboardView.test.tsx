/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { DisplaySoundboardSound } from '../../hooks/soundboard/soundboardPresentation';
import { SoundboardContentView } from './SoundboardView';

vi.mock('@octane/renderer', () => ({
    AddLinkEventTracker: vi.fn(),
    RemoveLinkEventTracker: vi.fn()
}));

vi.mock('../../api', () => ({
    LocalizeText: (key: string, _keys?: string[], values?: string[]) => (({
        'soundboard.search': 'Search sounds',
        'soundboard.category.all': 'All',
        'soundboard.category.recent': 'Recent',
        'soundboard.category.favorites': 'Favourites',
        'soundboard.pagination.page': 'Page',
        'soundboard.empty': 'No sounds available'
    } as Record<string, string>)[key] || key) + (values?.length ? ` ${values.join(' ')}` : '')
}));

vi.mock('../../hooks', () => ({ useSoundboard: vi.fn() }));

const sounds: DisplaySoundboardSound[] = Array.from({ length: 11 }, (_, index) => ({
    id: index + 1,
    name: index === 1 ? 'Applauso' : `Sound ${index + 1}`,
    url: `/${index + 1}.mp3`,
    classname: '',
    categoryId: index < 2 ? 'reactions' : 'effects',
    tone: index % 2 ? 'green' : 'blue',
    keywords: index === 1 ? ['cláp'] : []
}));

const renderContent = (recentSoundIds = [11, 2], extra: Partial<Parameters<typeof SoundboardContentView>[0]> = {}) => render(
    <SoundboardContentView
        sounds={sounds}
        categories={[{ id: 'reactions', label: 'Reactions' }, { id: 'effects', label: 'Effects' }]}
        recentSoundIds={recentSoundIds}
        isCoolingDown={false}
        onPlay={vi.fn()}
        {...extra}
    />
);

const padNames = () => within(screen.getByTestId('soundboard-grid')).getAllByRole('button').map((pad) => pad.getAttribute('aria-label'));

describe('SoundboardContentView', () => {
    afterEach(cleanup);

    test('shows ten text pads per page and pagination only when needed', () => {
        const { container } = renderContent();
        const grid = screen.getByTestId('soundboard-grid');

        expect(within(grid).getAllByRole('button')).toHaveLength(10);
        expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument();
        expect(container.textContent).not.toContain('Played by');
        expect(container.textContent).not.toContain('Pronto');

        fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));
        expect(within(grid).getAllByRole('button')).toHaveLength(1);
        expect(within(grid).getByRole('button', { name: 'Sound 11' })).toBeInTheDocument();
    });

    test('filters by accent-insensitive search and category', () => {
        renderContent();

        fireEvent.change(screen.getByRole('searchbox', { name: 'Search sounds' }), { target: { value: 'CLAP' } });
        expect(within(screen.getByTestId('soundboard-grid')).getAllByRole('button')).toHaveLength(1);
        expect(screen.getByRole('button', { name: 'Applauso' })).toBeInTheDocument();

        fireEvent.change(screen.getByRole('searchbox', { name: 'Search sounds' }), { target: { value: '' } });
        fireEvent.click(screen.getByRole('button', { name: 'Reactions' }));
        expect(within(screen.getByTestId('soundboard-grid')).getAllByRole('button')).toHaveLength(2);
    });

    test('shows recent sounds in event order', () => {
        renderContent();

        fireEvent.click(screen.getByRole('button', { name: 'Recent' }));

        expect(padNames()).toEqual(['Sound 11', 'Applauso']);
        expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument();
    });

    test('offers a favourites category only when there are favourites, in pinned order', () => {
        renderContent([], { favoriteIds: [5, 3] });

        fireEvent.click(screen.getByRole('button', { name: /Favourites/ }));
        expect(padNames()).toEqual(['Sound 5', 'Sound 3']);

        cleanup();
        renderContent([]);
        expect(screen.queryByRole('button', { name: /Favourites/ })).not.toBeInTheDocument();
    });

    test('number keys play the visible pads and arrows change page', () => {
        const onPlay = vi.fn();
        renderContent([], { onPlay });

        fireEvent.keyDown(window, { key: '1' });
        fireEvent.keyDown(window, { key: '0' });
        expect(onPlay.mock.calls.map(([sound]) => sound.id)).toEqual([1, 10]);

        fireEvent.keyDown(window, { key: 'ArrowRight' });
        expect(padNames()).toEqual(['Sound 11']);
    });

    test('keys do nothing while cooling down and the bar shows the time left', () => {
        const onPlay = vi.fn();
        renderContent([], { onPlay, isCoolingDown: true, cooldownRemainingSeconds: 3, cooldownTotalSeconds: 4 });

        fireEvent.keyDown(window, { key: '1' });
        expect(onPlay).not.toHaveBeenCalled();
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
    });

    test('says how many users are muted and lets the player unmute them all', () => {
        const onRestoreSilenced = vi.fn();
        renderContent([], { silencedCount: 3, onRestoreSilenced });

        expect(screen.getByText('soundboard.silenced.count 3')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'soundboard.silenced.restore' }));
        expect(onRestoreSilenced).toHaveBeenCalledOnce();
    });

    test('shows no muted line while nobody is muted', () => {
        renderContent([]);

        expect(screen.queryByRole('button', { name: 'soundboard.silenced.restore' })).toBeNull();
    });
});
