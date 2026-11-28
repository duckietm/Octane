import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../api/handheld/handheldLayout';
import { DisplaySoundboardSound } from '../../hooks/soundboard/soundboardPresentation';
import { useHandheldStore } from '../../state/handheldStore';
import { SoundboardContentView } from './SoundboardView';

vi.mock('@octane/renderer', () => ({
    AddLinkEventTracker: vi.fn(),
    RemoveLinkEventTracker: vi.fn()
}));

vi.mock('../../api', () => ({
    LocalizeText: (key: string) =>
        ({
            'soundboard.search': 'Search sounds',
            'soundboard.category.all': 'All',
            'soundboard.category.recent': 'Recent',
            'soundboard.category.favorites': 'Favourites',
            'soundboard.empty': 'No sounds available'
        })[key] ?? key,
    localizeWithFallback: (_key: string, fallback: string, keys: string[] = [], values: string[] = []) =>
        keys.reduce((text, name, index) => text.replace(`%${name}%`, values[index] ?? ''), fallback)
}));

vi.mock('../../hooks', () => ({ useSoundboard: vi.fn() }));

const sounds: DisplaySoundboardSound[] = Array.from({ length: 12 }, (_, index) => ({
    id: index + 1,
    name: `Sound ${index + 1}`,
    url: `/${index + 1}.mp3`,
    classname: '',
    categoryId: index < 2 ? 'reactions' : 'effects',
    tone: index % 2 ? 'green' : 'blue',
    keywords: []
}));

const renderContent = (extra: Partial<Parameters<typeof SoundboardContentView>[0]> = {}) =>
    render(
        <SoundboardContentView
            sounds={sounds}
            categories={[
                { id: 'reactions', label: 'Reactions' },
                { id: 'effects', label: 'Effects' }
            ]}
            recentSoundIds={[3]}
            isCoolingDown={false}
            onPlay={vi.fn()}
            {...extra}
        />
    );

const tileNames = () =>
    within(screen.getByTestId('soundboard-grid'))
        .getAllByRole('button')
        .filter((button) => button.className.includes('pad-play'))
        .map((button) => button.getAttribute('aria-label'));

describe('soundboard on a phone', () => {
    beforeEach(() => act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } })));

    afterEach(() => {
        cleanup();
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
    });

    test('shows every sound of the choice as a tile, without pages', () => {
        renderContent();

        expect(tileNames()).toHaveLength(12);
        expect(screen.queryByRole('button', { name: /soundboard.pagination.page/ })).toBeNull();
    });

    test('plays a tile on the first tap, and not while cooling down', () => {
        const onPlay = vi.fn();

        renderContent({ onPlay });
        fireEvent.click(screen.getByRole('button', { name: 'Sound 4' }));
        expect(onPlay).toHaveBeenCalledWith(sounds[3]);

        cleanup();
        onPlay.mockClear();
        renderContent({ onPlay, isCoolingDown: true });
        fireEvent.click(screen.getByRole('button', { name: 'Sound 4' }));
        expect(onPlay).not.toHaveBeenCalled();
    });

    test('keeps a sound on the shelf from the star of its tile', () => {
        const onToggleFavorite = vi.fn();

        renderContent({ onToggleFavorite, favoriteIds: [2] });

        expect(screen.getByRole('button', { name: 'Favourite: Sound 2' })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: 'Favourite: Sound 5' }));
        expect(onToggleFavorite).toHaveBeenCalledWith(sounds[4]);
        expect(within(screen.getByTestId('soundboard-shelf')).getByRole('button', { name: 'Sound 2' })).toBeInTheDocument();
    });

    test('filters by the category chips and the 16 px search', () => {
        renderContent();

        fireEvent.click(screen.getByRole('button', { name: 'Reactions' }));
        expect(tileNames()).toEqual(['Sound 1', 'Sound 2']);
        expect(screen.getByRole('button', { name: 'Reactions' })).toHaveAttribute('aria-pressed', 'true');

        fireEvent.click(screen.getByRole('button', { name: 'All' }));
        fireEvent.change(screen.getByRole('searchbox', { name: 'Search sounds' }), { target: { value: 'Sound 12' } });
        expect(tileNames()).toEqual(['Sound 12']);
    });

    test('restores silenced players from the note', () => {
        const onRestoreSilenced = vi.fn();

        renderContent({ silencedCount: 2, onRestoreSilenced });
        fireEvent.click(screen.getByRole('button', { name: 'soundboard.silenced.restore' }));
        expect(onRestoreSilenced).toHaveBeenCalled();
    });

    test('keeps the paged desktop list when not on a phone', () => {
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
        renderContent();

        expect(within(screen.getByTestId('soundboard-grid')).getAllByRole('button')).toHaveLength(10);
        expect(screen.queryByRole('button', { name: /Favourite:/ })).toBeNull();
    });
});
