/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const radio = vi.hoisted(() => ({
    stations: [
        { id: 'a', name: 'Alpha FM', genre: 'Pop', logo: '' },
        { id: 'b', name: 'Beta Radio', genre: 'Rock', logo: '' }
    ],
    currentId: null as string | null,
    isPlaying: false,
    volume: 0.5,
    loadError: false,
    play: vi.fn(),
    stop: vi.fn(),
    setVolume: vi.fn()
}));

vi.mock('../../hooks', () => ({ useRadio: () => radio }));

import { RadioView } from './RadioView';

const q = (container: HTMLElement, selector: string) => container.querySelector(selector) as HTMLElement;
const playButton = (c: HTMLElement) => q(c, 'button.rounded-full');
const listButton = (c: HTMLElement) => q(c, 'button.h-8');
const headerButtons = (c: HTMLElement) => Array.from(c.querySelectorAll<HTMLElement>('.drag-handler button'));

describe('RadioView', () => {
    beforeEach(() => {
        radio.currentId = null;
        radio.isPlaying = false;
        radio.play.mockClear();
        radio.stop.mockClear();
    });

    afterEach(() => cleanup());

    it('shows the first station and plays it from the main button', () => {
        render(<RadioView />);
        const container = document.body;

        expect(screen.getByText('Alpha FM')).toBeTruthy();

        fireEvent.click(playButton(container));

        expect(radio.play).toHaveBeenCalledWith(radio.stations[0]);
    });

    it('opens the station list, plays the picked station and closes the list', () => {
        render(<RadioView />);
        const container = document.body;

        expect(screen.queryByText('Beta Radio')).toBeNull();

        fireEvent.click(listButton(container));
        fireEvent.click(screen.getByText('Beta Radio'));

        expect(radio.play).toHaveBeenCalledWith(radio.stations[1]);
        expect(screen.getAllByText('Beta Radio')).toHaveLength(1); // only the header, the list is closed
    });

    it('replays the selected station when it is picked again', () => {
        render(<RadioView />);
        const container = document.body;

        fireEvent.click(listButton(container));
        fireEvent.click(screen.getAllByText('Alpha FM').at(-1) as HTMLElement);

        expect(radio.play).toHaveBeenCalledWith(radio.stations[0]);
    });

    it('moves through the station list with the arrow keys without starting a stream', () => {
        render(<RadioView />);
        fireEvent.click(listButton(document.body));

        const [first] = screen.getAllByRole('button', { pressed: true });

        first.focus();
        fireEvent.keyDown(first, { key: 'ArrowDown' });

        expect(radio.play).not.toHaveBeenCalled();
    });

    it('collapses the body from the first header button', () => {
        render(<RadioView />);
        const container = document.body;

        expect(screen.getByText('Alpha FM')).toBeTruthy();

        fireEvent.click(headerButtons(container)[0]);

        expect(screen.queryByText('Alpha FM')).toBeNull();
    });

    it('stops the stream and removes the window when closed', () => {
        render(<RadioView />);
        const container = document.body;

        fireEvent.click(headerButtons(container)[1]);

        expect(radio.stop).toHaveBeenCalled();
        expect(container.querySelector('.radio-widget')).toBeNull();
    });
});
