import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { initialState } from '../state/reducer';
import { FloorplanCanvasSVG } from './FloorplanCanvasSVG';

describe('FloorplanCanvasSVG', () => {
    it('renders one polygon per non-blocked tile', () => {
        const state = {
            ...initialState,
            tiles: [
                [
                    { h: 0, blocked: false },
                    { h: 1, blocked: true }
                ],
                [
                    { h: 2, blocked: false },
                    { h: 3, blocked: false }
                ]
            ]
        };
        const { container } = render(<FloorplanCanvasSVG state={state} dispatch={() => {}} />);
        const polys = container.querySelectorAll('polygon');
        expect(polys.length).toBeGreaterThanOrEqual(3);
    });

    it('renders door marker on the door tile', () => {
        const state = {
            ...initialState,
            tiles: [
                [
                    { h: 0, blocked: false },
                    { h: 0, blocked: false }
                ]
            ],
            door: { x: 1, y: 0, dir: 2 as const }
        };
        const { container } = render(<FloorplanCanvasSVG state={state} dispatch={() => {}} />);
        expect(container.querySelector('[data-testid="door-marker"]')).toBeTruthy();
    });

    it('forwards pointer events to a tool dispatch (PAINT_TILE with brush)', () => {
        const state = {
            ...initialState,
            tiles: [[{ h: 0, blocked: false }]],
            brush: { h: 0, action: 'SET' as const }
        };
        const dispatch = vi.fn();
        const { container } = render(<FloorplanCanvasSVG state={state} dispatch={dispatch} />);
        const svg = container.querySelector('svg') as SVGSVGElement;
        // usePointerToTile resolves the tile via document.elementFromPoint first
        // (the tile polygons carry data-row/data-col). jsdom returns null and has
        // no SVGSVGElement.getScreenCTM, so point the hit-test at the tile polygon.
        const tilePoly = container.querySelector('polygon[data-row="0"][data-col="0"]') as Element;
        // jsdom's document has no elementFromPoint at all — define it for this test.
        const prevEfp = (document as { elementFromPoint?: unknown }).elementFromPoint;
        (document as unknown as { elementFromPoint: (x: number, y: number) => Element | null }).elementFromPoint = () => tilePoly;
        fireEvent.pointerDown(svg, { clientX: 1024, clientY: 0, pointerId: 1 });
        expect(dispatch).toHaveBeenCalled();
        const call = dispatch.mock.calls[0][0];
        expect(call.type).toBe('PAINT_TILE');
        (document as { elementFromPoint?: unknown }).elementFromPoint = prevEfp;
    });

    it('zoom in/out buttons adjust the viewBox', () => {
        const { container } = render(<FloorplanCanvasSVG state={initialState} dispatch={() => {}} />);
        const svg = container.querySelector('svg') as SVGSVGElement;
        const initialVB = svg.getAttribute('viewBox');
        fireEvent.click(container.querySelector('[data-testid="zoom-in"]') as Element);
        expect(svg.getAttribute('viewBox')).not.toBe(initialVB);
    });

    it('pans sideways on shift+wheel without zooming', () => {
        const { container } = render(<FloorplanCanvasSVG state={initialState} dispatch={() => {}} />);
        const svg = container.querySelector('svg') as SVGSVGElement;
        const readViewBox = () => (svg.getAttribute('viewBox') as string).split(' ').map(Number);
        const [x0, y0, w0, h0] = readViewBox();

        fireEvent.wheel(svg, { shiftKey: true, deltaY: 100 });

        const [x1, y1, w1, h1] = readViewBox();
        expect(x1).toBeGreaterThan(x0);
        expect([y1, w1, h1]).toEqual([y0, w0, h0]);

        // Browsers that already map the gesture to the horizontal axis behave the same.
        fireEvent.wheel(svg, { shiftKey: true, deltaX: -100, deltaY: 0 });

        expect(readViewBox()[0]).toBe(x0);

        // A plain wheel keeps scrolling the page instead of moving the canvas.
        fireEvent.wheel(svg, { deltaY: 100 });

        expect(readViewBox()[0]).toBe(x0);
    });
});
