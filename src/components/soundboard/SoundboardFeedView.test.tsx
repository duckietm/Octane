/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { useSoundboardFeedStore } from '../../hooks/soundboard/soundboardFeedStore';
import { SoundboardFeedItemView } from './SoundboardFeedView';

vi.mock('@octane/renderer', () => ({ GetSessionDataManager: () => ({ userId: 1 }) }));

vi.mock('../../api', () => ({
    LocalizeText: (key: string, _keys?: string[], values?: string[]) => `${key}${values?.length ? ` ${values.join(' ')}` : ''}`
}));

vi.mock('../../hooks', () => ({ useSoundboard: vi.fn() }));

const pushEntry = () => {
    const key = useSoundboardFeedStore.getState().push({ username: 'tester', userId: 7, soundName: 'Bell', soundId: 3 });

    return useSoundboardFeedStore.getState().entries.find((entry) => entry.key === key)!;
};

describe('SoundboardFeedItemView', () => {
    afterEach(() => {
        cleanup();
        useSoundboardFeedStore.getState().clear();
    });

    test('mutes the user of the entry and takes the entry off the feed', () => {
        const entry = pushEntry();
        const onSilence = vi.fn();
        render(<SoundboardFeedItemView entry={entry} tone="blue" canSilence onSilence={onSilence} />);

        fireEvent.click(screen.getByRole('button', { name: 'soundboard.feed.silence tester' }));

        expect(onSilence).toHaveBeenCalledWith(7);
        expect(useSoundboardFeedStore.getState().entries).toEqual([]);
    });

    test('offers no mute button for a player who cannot be muted', () => {
        render(<SoundboardFeedItemView entry={pushEntry()} tone="blue" canSilence={false} onSilence={vi.fn()} />);

        expect(screen.queryByRole('button')).toBeNull();
    });
});
