import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { initialState } from '../state/reducer';
import { fitViewBox, FloorplanPreviewSVG } from './FloorplanPreviewSVG';

describe('FloorplanPreviewSVG', () => {
    it('renders nothing for empty tilemap', () => {
        const { container } = render(<FloorplanPreviewSVG state={initialState} />);
        expect(container.querySelector('polygon')).toBeNull();
    });

    it('renders a floor polygon per non-blocked tile', () => {
        const state = {
            ...initialState,
            tiles: [
                [
                    { h: 0, blocked: false },
                    { h: 0, blocked: true }
                ],
                [
                    { h: 0, blocked: false },
                    { h: 0, blocked: false }
                ]
            ]
        };
        const { container } = render(<FloorplanPreviewSVG state={state} />);
        expect(container.querySelectorAll('[data-role="floor"]')).toHaveLength(3);
    });

    it('renders wall polygons when wallHeight > 0', () => {
        const state = {
            ...initialState,
            wallHeight: 4,
            tiles: [
                [
                    { h: 0, blocked: false },
                    { h: 0, blocked: false }
                ],
                [
                    { h: 0, blocked: false },
                    { h: 0, blocked: false }
                ]
            ]
        };
        const { container } = render(<FloorplanPreviewSVG state={state} />);
        expect(container.querySelectorAll('[data-role="wall"]').length).toBeGreaterThan(0);
    });

    it('does NOT render walls when wallHeight is 0 or negative', () => {
        const state = {
            ...initialState,
            wallHeight: 0,
            tiles: [[{ h: 0, blocked: false }]]
        };
        const { container } = render(<FloorplanPreviewSVG state={state} />);
        expect(container.querySelectorAll('[data-role="wall"]')).toHaveLength(0);
    });

    it('frames the drawn room instead of the whole canvas', () => {
        const small = { ...initialState, wallHeight: 0, tiles: [[{ h: 0, blocked: false }]] };
        const wide = {
            ...initialState,
            wallHeight: 0,
            tiles: [[{ h: 0, blocked: false }, { h: 0, blocked: false }, { h: 0, blocked: false }, { h: 0, blocked: false }]]
        };

        const [, , smallWidth, smallHeight] = fitViewBox(small).split(' ').map(Number);
        const [, , wideWidth] = fitViewBox(wide).split(' ').map(Number);

        expect(smallWidth).toBeGreaterThan(0);
        expect(smallHeight).toBeGreaterThan(0);
        expect(smallWidth).toBeLessThan(2048);
        expect(wideWidth).toBeGreaterThan(smallWidth);

        const { container } = render(<FloorplanPreviewSVG state={small} />);
        expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe(fitViewBox(small));
        expect(container.querySelector('svg')?.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
    });

    it('grows the frame upward for walls and falls back to the full canvas when empty', () => {
        const flat = { ...initialState, wallHeight: 0, tiles: [[{ h: 0, blocked: false }]] };
        const walled = { ...flat, wallHeight: 4 };

        const [, flatY, , flatHeight] = fitViewBox(flat).split(' ').map(Number);
        const [, walledY, , walledHeight] = fitViewBox(walled).split(' ').map(Number);

        expect(walledY).toBeLessThan(flatY);
        expect(walledHeight).toBeGreaterThan(flatHeight);
        expect(fitViewBox(initialState)).toBe('0 0 2048 1024');
    });
});
