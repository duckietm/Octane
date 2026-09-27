/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { DisplaySoundboardSound } from '../../hooks/soundboard/soundboardPresentation';
import { SoundboardPadView } from './SoundboardPadView';

const sound: DisplaySoundboardSound = {
    id: 1,
    name: 'Campanella',
    url: '/sounds/campanella.mp3', classname: '',
    categoryId: 'effects',
    tone: 'gold',
    keywords: []
};

describe('SoundboardPadView', () => {
    afterEach(cleanup);

    test('renders a tone pad named after the sound and plays it', () => {
        const onPlay = vi.fn();
        render(<SoundboardPadView sound={sound} disabled={false} onPlay={onPlay} hotkey="3" />);

        const button = screen.getByRole('button', { name: 'Campanella' });
        expect(button.textContent).toContain('Campanella');
        expect(button.textContent).toContain('3');
        expect(button).toHaveAttribute('data-tone', 'gold');

        fireEvent.click(button);
        expect(onPlay).toHaveBeenCalledWith(sound);
    });

    test('does not play while disabled', () => {
        const onPlay = vi.fn();
        render(<SoundboardPadView sound={sound} disabled onPlay={onPlay} />);

        const button = screen.getByRole('button', { name: 'Campanella' });
        expect(button).not.toBeDisabled();
        expect(button).toHaveAttribute('aria-disabled', 'true');
        fireEvent.click(button);
        expect(onPlay).not.toHaveBeenCalled();
    });

    test('toggles the favourite on right click and marks favourite and playing pads', () => {
        const onToggleFavorite = vi.fn();
        render(<SoundboardPadView sound={sound} disabled={false} onPlay={vi.fn()} favorite playing onToggleFavorite={onToggleFavorite} />);

        const button = screen.getByRole('button', { name: 'Campanella' });
        expect(button).toHaveAttribute('data-favorite', 'true');
        expect(button).toHaveAttribute('data-playing', 'true');

        fireEvent.contextMenu(button);
        expect(onToggleFavorite).toHaveBeenCalledWith(sound);
    });
});
