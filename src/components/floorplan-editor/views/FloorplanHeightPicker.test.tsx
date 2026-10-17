/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FloorplanHeightPicker } from './FloorplanHeightPicker';

const TRACK_HEIGHT = 260;

const stubTrackGeometry = (top = 0) => {
    const original = HTMLDivElement.prototype.getBoundingClientRect;

    HTMLDivElement.prototype.getBoundingClientRect = function () {
        if (this.getAttribute('data-testid') === 'height-track') {
            return {
                top,
                left: 0,
                right: 14,
                bottom: top + TRACK_HEIGHT,
                width: 14,
                height: TRACK_HEIGHT,
                x: 0,
                y: top,
                toJSON: () => ''
            };
        }

        return original.call(this);
    };

    return () => {
        HTMLDivElement.prototype.getBoundingClientRect = original;
    };
};

describe('FloorplanHeightPicker', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders the track + thumb with the current value', () => {
        render(<FloorplanHeightPicker selectedH={12} onSelect={() => undefined} />);

        const thumb = screen.getByTestId('height-thumb');

        expect(thumb).toBeInTheDocument();
        expect(thumb.getAttribute('data-value')).toBe('12');
        expect(screen.getByRole('slider').getAttribute('aria-valuenow')).toBe('12');
    });

    it('clicking near the top of the track picks HEIGHT_BRUSH_MAX', () => {
        const restore = stubTrackGeometry();
        const onSelect = vi.fn();

        render(<FloorplanHeightPicker selectedH={0} onSelect={onSelect} />);

        const track = screen.getByTestId('height-track');

        fireEvent.pointerDown(track, { clientY: 0, button: 0 });

        expect(onSelect).toHaveBeenCalledWith(26);

        restore();
    });

    it('clicking near the bottom of the track picks HEIGHT_BRUSH_MIN', () => {
        const restore = stubTrackGeometry();
        const onSelect = vi.fn();

        render(<FloorplanHeightPicker selectedH={26} onSelect={onSelect} />);

        const track = screen.getByTestId('height-track');

        fireEvent.pointerDown(track, { clientY: TRACK_HEIGHT, button: 0 });

        expect(onSelect).toHaveBeenCalledWith(0);

        restore();
    });

    it('clicking at the middle picks roughly the middle height', () => {
        const restore = stubTrackGeometry();
        const onSelect = vi.fn();

        render(<FloorplanHeightPicker selectedH={0} onSelect={onSelect} />);

        const track = screen.getByTestId('height-track');

        fireEvent.pointerDown(track, { clientY: TRACK_HEIGHT / 2, button: 0 });

        expect(onSelect).toHaveBeenCalledWith(13);

        restore();
    });

    it('does not fire onSelect when the picked height equals the current selection', () => {
        const restore = stubTrackGeometry();
        const onSelect = vi.fn();

        render(<FloorplanHeightPicker selectedH={26} onSelect={onSelect} />);

        const track = screen.getByTestId('height-track');

        fireEvent.pointerDown(track, { clientY: 0, button: 0 });

        expect(onSelect).not.toHaveBeenCalled();

        restore();
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
