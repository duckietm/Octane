import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NeighborhoodFloor, neighborhoodLineBetween, neighborhoodTileAt } from './WiredNeighborhoodSelectorView';

// The centre of grid tile (gx, gy) in a drawing of `dimension` tiles, as the floor lays it out.
const centre = (gx: number, gy: number, dimension: number) => ({ x: 8 * (gx - gy + dimension), y: 4 * (gx + gy) + 4 });

describe('neighborhoodTileAt', () =>
{
    it('maps every tile centre back to its tile', () =>
    {
        const dimension = 5;

        for(let gx = 0; gx < dimension; gx++)
        {
            for(let gy = 0; gy < dimension; gy++)
            {
                const { x, y } = centre(gx, gy, dimension);

                expect(neighborhoodTileAt(x, y, dimension)).toEqual({ gx, gy });
            }
        }
    });

    it('gives null outside the diamond', () =>
    {
        expect(neighborhoodTileAt(0, 0, 5)).toBeNull();
        expect(neighborhoodTileAt(80, 100, 5)).toBeNull();
    });
});

describe('neighborhoodLineBetween', () =>
{
    it('leaves out both ends', () =>
    {
        expect(neighborhoodLineBetween(0, 0, 1, 1)).toEqual([]);
        expect(neighborhoodLineBetween(0, 0, 3, 0)).toEqual([ { x: 1, y: 0 }, { x: 2, y: 0 } ]);
    });

    it('fills a diagonal without gaps', () =>
    {
        expect(neighborhoodLineBetween(4, 4, 0, 0)).toEqual([ { x: 3, y: 3 }, { x: 2, y: 2 }, { x: 1, y: 1 } ]);
    });
});

describe('NeighborhoodFloor', () =>
{
    afterEach(cleanup);

    it('draws the tiles a fast drag skips over', () =>
    {
        const onDraw = vi.fn();

        render(<NeighborhoodFloor radius={ 2 } tiles={ new Set() } root={ { x: 0, y: 0 } } onDraw={ onDraw } />);

        const floor = screen.getByTestId('neighborhood-floor');
        // Drawn at twice its natural size (5 tiles: 96 x 48).
        floor.getBoundingClientRect = () => ({ left: 10, top: 20, width: 192, height: 96, right: 202, bottom: 116, x: 10, y: 20, toJSON: () => ({}) });

        const at = (gx: number, gy: number) =>
        {
            const { x, y } = centre(gx, gy, 5);

            return { clientX: 10 + x * 2, clientY: 20 + y * 2, buttons: 1 };
        };

        fireEvent.mouseDown(floor, at(0, 2));
        fireEvent.mouseMove(floor, at(0, 2));
        fireEvent.mouseMove(floor, at(4, 2));

        expect(onDraw.mock.calls).toEqual([ [ -2, 0 ], [ 2, 0 ], [ -1, 0 ], [ 0, 0 ], [ 1, 0 ] ]);

        fireEvent.mouseUp(window);
        fireEvent.mouseMove(floor, at(4, 4));

        expect(onDraw).toHaveBeenCalledTimes(5);
    });

    it('has no browser tooltips on the tiles', () =>
    {
        const { container } = render(<NeighborhoodFloor radius={ 1 } tiles={ new Set() } root={ { x: 0, y: 0 } } onDraw={ vi.fn() } />);

        expect(container.querySelector('[title]')).toBeNull();
    });
});
