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
    LocalizeText: (key: string) => ({
        'soundboard.search': 'Search sounds',
        'soundboard.category.all': 'All',
        'soundboard.category.recent': 'Recent',
        'soundboard.pagination.previous': 'Previous',
        'soundboard.pagination.next': 'Next',
        'soundboard.empty': 'No sounds available'
    })[key] || key
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

const renderContent = (recentSoundIds = [11, 2]) => render(
    <SoundboardContentView
        sounds={sounds}
        categories={[{ id: 'reactions', label: 'Reactions' }, { id: 'effects', label: 'Effects' }]}
        recentSoundIds={recentSoundIds}
        isCoolingDown={false}
        onPlay={vi.fn()}
    />
);

describe('SoundboardContentView', () => {
    afterEach(cleanup);

    test('shows ten text pads per page and pagination only when needed', () => {
        const { container } = renderContent();
        const grid = screen.getByTestId('soundboard-grid');

        expect(within(grid).getAllByRole('button')).toHaveLength(10);
        expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
        expect(container.textContent).not.toContain('Played by');
        expect(container.textContent).not.toContain('Pronto');

        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
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

        const pads = within(screen.getByTestId('soundboard-grid')).getAllByRole('button');
        expect(pads.map((pad) => pad.textContent)).toEqual(['Sound 11', 'Applauso']);
        expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
    });
});
