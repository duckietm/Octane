/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Slider } from './Slider';

const getButtons = () => ({
    left: document.querySelector('.octane-slider-button-left') as HTMLElement | null,
    right: document.querySelector('.octane-slider-button-right') as HTMLElement | null
});

// Button renders a styled div, so "disabled" shows up as the pointer-events-none class.
const isOff = (element: HTMLElement | null) => element!.classList.contains('pointer-events-none');

describe('Slider', () => {
    afterEach(() => cleanup());

    it('renders a thumb input carrying the current value and bounds', () => {
        render(<Slider min={0} max={10} step={1} value={4} onChange={() => undefined} />);

        const input = screen.getByRole('slider') as HTMLInputElement;

        expect(input.value).toBe('4');
        expect(input.min).toBe('0');
        expect(input.max).toBe('10');
    });

    it('keeps the legacy css hooks on root, track, indicator and thumb', () => {
        const { container } = render(<Slider value={2} thumbClassName="custom-thumb" trackClassName="custom-track" onChange={() => undefined} />);

        expect(container.querySelector('.octane-slider')).not.toBeNull();
        expect(container.querySelector('.track.track-1.custom-track')).not.toBeNull();
        expect(container.querySelector('.track.track-0.custom-track')).not.toBeNull();
        expect(container.querySelector('.thumb.thumb-0.custom-thumb')).not.toBeNull();
    });

    it('emits a scalar from the thumb input for a single value', () => {
        const onChange = vi.fn();

        render(<Slider min={0} max={10} step={1} value={4} onChange={onChange} />);
        fireEvent.change(screen.getByRole('slider'), { target: { value: '7' } });

        expect(onChange).toHaveBeenCalledWith(7, 0);
    });

    it('renders one thumb per value and emits arrays for a range', () => {
        const onChange = vi.fn();

        render(<Slider min={0} max={10} value={[2, 8]} onChange={onChange} />);

        const inputs = screen.getAllByRole('slider') as HTMLInputElement[];

        expect(inputs).toHaveLength(2);
        expect(inputs.map((input) => input.value)).toEqual(['2', '8']);

        fireEvent.change(inputs[0], { target: { value: '3' } });

        expect(onChange).toHaveBeenCalledWith([3, 8], 0);
    });

    it('steps with the side buttons and clamps at the bounds', () => {
        const onChange = vi.fn();
        const { rerender } = render(<Slider min={0} max={10} step={2} value={4} onChange={onChange} />);

        fireEvent.click(getButtons().left!);
        expect(onChange).toHaveBeenLastCalledWith(2, 0);

        fireEvent.click(getButtons().right!);
        expect(onChange).toHaveBeenLastCalledWith(6, 0);

        rerender(<Slider min={0} max={10} step={2} value={0} onChange={onChange} />);
        expect(isOff(getButtons().left)).toBe(true);

        rerender(<Slider min={0} max={10} step={2} value={10} onChange={onChange} />);
        expect(isOff(getButtons().right)).toBe(true);
    });

    it('rounds fractional steps without float drift', () => {
        const onChange = vi.fn();

        render(<Slider min={0} max={1} step={0.1} value={0.2} onChange={onChange} />);
        fireEvent.click(getButtons().right!);

        expect(onChange).toHaveBeenLastCalledWith(0.3, 0);
    });

    it('hides the side buttons with disabledButton', () => {
        render(<Slider disabledButton value={1} onChange={() => undefined} />);

        expect(getButtons().left).toBeNull();
        expect(getButtons().right).toBeNull();
    });

    it('disables the buttons and the thumb when disabled', () => {
        render(<Slider disabled min={0} max={10} value={5} onChange={() => undefined} />);

        expect(isOff(getButtons().left)).toBe(true);
        expect(isOff(getButtons().right)).toBe(true);
        expect((screen.getByRole('slider') as HTMLInputElement).disabled).toBe(true);
    });

    it('renders thumb content and aria-label', () => {
        render(<Slider value={5} thumbAriaLabel="Brightness" renderThumbContent={(state) => `v${state.valueNow}`} onChange={() => undefined} />);

        expect(screen.getByText('v5')).toBeTruthy();
        expect(screen.getByLabelText('Brightness')).toBeTruthy();
    });
});
