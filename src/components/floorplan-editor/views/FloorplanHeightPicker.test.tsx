/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FloorplanHeightPicker } from './FloorplanHeightPicker';

describe('FloorplanHeightPicker', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders the track + thumb with the current value', () => {
        render(<FloorplanHeightPicker selectedH={12} onSelect={() => undefined} />);

        expect(screen.getByTestId('height-track')).toBeInTheDocument();
        expect(screen.getByTestId('height-thumb').getAttribute('data-value')).toBe('12');
        expect(screen.getByRole('slider', { name: 'Brush height' }).getAttribute('aria-valuenow')).toBe('12');
    });

    it('arrow keys step the brush height by one, Home / End jump to the ends', () => {
        const onSelect = vi.fn();

        render(<FloorplanHeightPicker selectedH={5} onSelect={onSelect} />);

        const slider = screen.getByRole('slider', { name: 'Brush height' });

        fireEvent.keyDown(slider, { key: 'ArrowUp' });
        expect(onSelect).toHaveBeenLastCalledWith(6);

        fireEvent.keyDown(slider, { key: 'ArrowDown' });
        expect(onSelect).toHaveBeenLastCalledWith(4);

        fireEvent.keyDown(slider, { key: 'End' });
        expect(onSelect).toHaveBeenLastCalledWith(26);

        fireEvent.keyDown(slider, { key: 'Home' });
        expect(onSelect).toHaveBeenLastCalledWith(0);
    });

    it('does not fire onSelect when the key press keeps the current height', () => {
        const onSelect = vi.fn();

        render(<FloorplanHeightPicker selectedH={26} onSelect={onSelect} />);

        fireEvent.keyDown(screen.getByRole('slider', { name: 'Brush height' }), { key: 'ArrowUp' });

        expect(onSelect).not.toHaveBeenCalled();
    });

    it('thumb fill matches the tile colour at the picked height', () => {
        const { rerender } = render(<FloorplanHeightPicker selectedH={0} onSelect={() => undefined} />);

        const colourAtZero = screen.getByTestId('height-thumb').getAttribute('data-thumb-color');

        rerender(<FloorplanHeightPicker selectedH={13} onSelect={() => undefined} />);

        const colourAtThirteen = screen.getByTestId('height-thumb').getAttribute('data-thumb-color');

        expect(colourAtZero).toBeTruthy();
        expect(colourAtThirteen).toBeTruthy();
        expect(colourAtZero).not.toBe(colourAtThirteen);
    });
});
