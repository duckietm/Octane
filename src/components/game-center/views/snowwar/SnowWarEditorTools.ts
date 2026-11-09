import { HEIGHT_SCHEME } from '../../../floorplan-editor/state/constants';

export interface SnowWarEditorTile
{
    x: number;
    y: number;
}

export interface SnowWarEditorPlacement extends SnowWarEditorTile
{
    rotation?: number;
    width?: number;
    length?: number;
    imageUrl?: string;
}

const footprint = (item: SnowWarEditorPlacement) =>
{
    const rotated = item.rotation === 2 || item.rotation === 6;
    return {
        x: item.x,
        y: item.y,
        width: Math.max(1, (rotated ? item.length : item.width) ?? 1),
        length: Math.max(1, (rotated ? item.width : item.length) ?? 1),
    };
};

/**
 * SnowStorm uses every non-void height from Octane's real floor-plan editor as
 * playable ground. HEIGHT_SCHEME starts with x, followed by heights 0..q.
 */
export const isSnowWarFloorTile = (cell?: string): boolean =>
    !!cell && HEIGHT_SCHEME.indexOf(cell.toLowerCase()) > 0;

export const getSnowWarEditorArea = (from: SnowWarEditorTile, to: SnowWarEditorTile): SnowWarEditorTile[] =>
{
    const tiles: SnowWarEditorTile[] = [];
    const minX = Math.min(from.x, to.x);
    const maxX = Math.max(from.x, to.x);
    const minY = Math.min(from.y, to.y);
    const maxY = Math.max(from.y, to.y);

    for (let y = minY; y <= maxY; y++)
    {
        for (let x = minX; x <= maxX; x++) tiles.push({ x, y });
    }

    return tiles;
};

export const canPlaceSnowWarEditorItem = (
    items: SnowWarEditorPlacement[],
    candidate: SnowWarEditorPlacement,
    mapWidth: number,
    mapHeight: number,
    ignoredIndex = -1): boolean =>
{
    const next = footprint(candidate);
    if (next.x < 0 || next.y < 0 || next.x + next.width > mapWidth || next.y + next.length > mapHeight) return false;

    return !items.some((item, index) =>
    {
        if (index === ignoredIndex || item.imageUrl) return false;
        const current = footprint(item);
        return next.x < current.x + current.width
            && next.x + next.width > current.x
            && next.y < current.y + current.length
            && next.y + next.length > current.y;
    });
};
