/**
 * The official neighborhood selectors' drawing (AIR NeighborhoodFloor / SpiralUtils): a floor of
 * radius 10 around the root, one bit per tile in spiral order from the centre, packed into ints from
 * the lowest bit up. The server decodes the same form (WiredNeighborhoodWire).
 */
export const NEIGHBORHOOD_RADIUS = 10;
export const NEIGHBORHOOD_SMALL_RADIUS = 5;
export const NEIGHBORHOOD_MAX_ROOT = 64;

export type NeighborhoodTile = { x: number; y: number };

const DIMENSION = NEIGHBORHOOD_RADIUS * 2 + 1;

/** SpiralUtils.walkSpiral: right 1, up 1, left 2, down 2, right 3, ... */
const SPIRAL: NeighborhoodTile[] = (() =>
{
    const total = DIMENSION * DIMENSION;
    const spiral: NeighborhoodTile[] = [];
    let x = 0;
    let y = 0;
    let dx = 1;
    let dy = 0;

    for(let length = 1; length <= DIMENSION; length++)
    {
        for(let leg = 0; leg < 2; leg++)
        {
            for(let step = 0; step < length; step++)
            {
                spiral.push({ x, y });
                x += dx;
                y += dy;

                if(spiral.length === total) return spiral;
            }

            // (1,0) -> (0,-1) -> (-1,0) -> (0,1) -> (1,0)
            if(dx === 1 && dy === 0) [ dx, dy ] = [ 0, -1 ];
            else if(dx === 0 && dy === -1) [ dx, dy ] = [ -1, 0 ];
            else if(dx === -1 && dy === 0) [ dx, dy ] = [ 0, 1 ];
            else [ dx, dy ] = [ 1, 0 ];
        }
    }

    return spiral;
})();

export const NEIGHBORHOOD_MASK_INTS = Math.ceil(SPIRAL.length / 32);

export const encodeNeighborhood = (tiles: NeighborhoodTile[]): number[] =>
{
    const mask = new Array<number>(NEIGHBORHOOD_MASK_INTS).fill(0);
    const drawn = new Set(tiles.map(tile => `${ tile.x },${ tile.y }`));

    SPIRAL.forEach((tile, rank) =>
    {
        if(drawn.has(`${ tile.x },${ tile.y }`)) mask[rank >> 5] |= (1 << (rank & 31));
    });

    return mask;
};

export const decodeNeighborhood = (mask: number[]): NeighborhoodTile[] =>
    SPIRAL.filter((_, rank) => (((mask[rank >> 5] ?? 0) >>> (rank & 31)) & 1) === 1).map(tile => ({ ...tile }));

/** Whether the drawing fits the small (radius 5) view, as the official enlarge button decides. */
export const neighborhoodFitsSmall = (tiles: NeighborhoodTile[]): boolean =>
    tiles.every(tile => Math.abs(tile.x) <= NEIGHBORHOOD_SMALL_RADIUS && Math.abs(tile.y) <= NEIGHBORHOOD_SMALL_RADIUS);
