import { describe, expect, it } from 'vitest';
import { decodeNeighborhood, encodeNeighborhood, NEIGHBORHOOD_MASK_INTS, neighborhoodFitsSmall } from './WiredNeighborhood';

describe('WiredNeighborhood', () =>
{
    it('walks the spiral like the official client (and the server)', () =>
    {
        // Ranks 0..4: (0,0), (1,0), (1,-1), (0,-1), (-1,-1) -> the lowest five bits.
        const mask = encodeNeighborhood([ { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: -1 }, { x: -1, y: -1 } ]);

        expect(NEIGHBORHOOD_MASK_INTS).toBe(14);
        expect(mask[0]).toBe(31);
        expect(mask.slice(1).every(value => value === 0)).toBe(true);
    });

    it('round-trips a drawing and drops tiles off the floor', () =>
    {
        const decoded = decodeNeighborhood(encodeNeighborhood([ { x: 10, y: 10 }, { x: -10, y: 3 }, { x: 11, y: 0 } ]));

        expect(decoded).toHaveLength(2);
        expect(decoded).toContainEqual({ x: 10, y: 10 });
        expect(decoded).toContainEqual({ x: -10, y: 3 });
    });

    it('knows when the drawing fits the small view', () =>
    {
        expect(neighborhoodFitsSmall([ { x: 5, y: -5 } ])).toBe(true);
        expect(neighborhoodFitsSmall([ { x: 6, y: 0 } ])).toBe(false);
    });
});
