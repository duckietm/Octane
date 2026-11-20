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

    it('draws no background grid, and sits in a scroll box as big as the plan', () => {
        const { container } = render(<FloorplanCanvasSVG state={initialState} dispatch={() => {}} />);

        expect(container.querySelector('pattern')).toBeNull();
        expect(container.querySelector('[data-testid="floorplan-grid"]')).toBeNull();

        const content = container.querySelector('.fp-stage-content') as HTMLElement;
        const before = parseFloat(content.style.width);

        fireEvent.click(container.querySelector('[data-testid="zoom-in"]') as Element);
        fireEvent.click(container.querySelector('[data-testid="zoom-in"]') as Element);

        // Zoomed in, the plan is bigger than the view: that is what the scrollbars scroll.
        expect(parseFloat(content.style.width)).toBeGreaterThan(before);
        expect(container.querySelector('[data-testid="floorplan-scroll"]')?.className).toContain('has-classic-scrollbar');
    });

    it('zoom in/out buttons adjust the viewBox', () => {
        const { container } = render(<FloorplanCanvasSVG state={initialState} dispatch={() => {}} />);
        const svg = container.querySelector('svg') as SVGSVGElement;
        const initialVB = svg.getAttribute('viewBox');
        fireEvent.click(container.querySelector('[data-testid="zoom-in"]') as Element);
        expect(svg.getAttribute('viewBox')).not.toBe(initialVB);
    });
});
