/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FloorplanWallHeightSlider } from './FloorplanWallHeightSlider';

describe('FloorplanWallHeightSlider', () => {
    afterEach(() => cleanup());

    it('shows the current value on the thumb', () => {
        render(<FloorplanWallHeightSlider value={7} onChange={() => undefined} />);

        expect(screen.getByTestId('wall-height-track')).toBeInTheDocument();
        expect(screen.getByTestId('wall-height-thumb').getAttribute('data-value')).toBe('7');
        expect(screen.getByRole('slider', { name: 'Wall height' }).getAttribute('aria-valuenow')).toBe('7');
    });

    it('up raises the wall, down lowers it, End is the highest and Home the lowest wall', () => {
        const onChange = vi.fn();

        render(<FloorplanWallHeightSlider value={5} onChange={onChange} />);

        const slider = screen.getByRole('slider', { name: 'Wall height' });

        fireEvent.keyDown(slider, { key: 'ArrowUp' });
        expect(onChange).toHaveBeenLastCalledWith(6);

        fireEvent.keyDown(slider, { key: 'ArrowDown' });
        expect(onChange).toHaveBeenLastCalledWith(4);

        fireEvent.keyDown(slider, { key: 'End' });
        expect(onChange).toHaveBeenLastCalledWith(16);

        fireEvent.keyDown(slider, { key: 'Home' });
        expect(onChange).toHaveBeenLastCalledWith(0);
    });

    it('does not fire when the key press keeps the current value', () => {
        const onChange = vi.fn();

        render(<FloorplanWallHeightSlider value={16} onChange={onChange} />);

        fireEvent.keyDown(screen.getByRole('slider', { name: 'Wall height' }), { key: 'ArrowUp' });
        expect(onChange).not.toHaveBeenCalled();
    });

    it('clamps an out of range value into the ladder', () => {
        render(<FloorplanWallHeightSlider value={99} onChange={() => undefined} />);

        expect(screen.getByRole('slider', { name: 'Wall height' }).getAttribute('aria-valuenow')).toBe('16');
    });
});
