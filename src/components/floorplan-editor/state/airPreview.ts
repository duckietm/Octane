import { Door, Tile } from './types';

/** Index of the door picture in AIR's 17 preview tiles (`tile_preview_0`..`f`, then `entry`). */
export const AIR_PREVIEW_ENTRY = 16;

/** AIR draws each tile with an 18x18 picture and grows the canvas by that much around the tile points. */
export const AIR_PREVIEW_TILE_SIZE = 18;

/** AIR caps the preview bitmap at 4095 px a side. */
const AIR_PREVIEW_MAX_SIZE = 4095;

export interface AirPreviewTile {
    x: number;
    y: number;
    picture: number;
}

export interface AirPreviewLayout {
    width: number;
    height: number;
    tiles: AirPreviewTile[];
}

/**
 * The flat floor plan preview of AIR's floor plan editor: every floor tile is one small picture at
 * (8 * (x - y), 4 * (x + y) - 8 * height). The picture shows which neighbours sit one step higher (bit 1: up-left,
 * 2: up-right, 4: down-left, 8: down-right; all four at once counts as none), and the door tile has its own picture.
 */
export const layoutAirPreview = (tiles: Tile[][], door: Door | null): AirPreviewLayout => {
    const heightAt = (x: number, y: number): number => {
        const tile = tiles[y]?.[x];

        return !tile || tile.blocked ? -1 : tile.h;
    };

    const points: AirPreviewTile[] = [];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let y = 0; y < tiles.length; y++) {
        for (let x = 0; x < (tiles[y]?.length ?? 0); x++) {
            const h = heightAt(x, y);

            if (h < 0) continue;

            const px = 8 * (x - y);
            const py = 4 * (x + y) - 8 * h;

            minX = Math.min(minX, px);
            minY = Math.min(minY, py);
            maxX = Math.max(maxX, px);
            maxY = Math.max(maxY, py);

            const step = h + 1;
            const higher = (dx: number, dy: number) => heightAt(x + dx, y + dy) === step;
            const up = higher(0, -1);
            const left = higher(-1, 0);
            const right = higher(1, 0);
            const down = higher(0, 1);

            let picture = (higher(-1, -1) || up || left ? 1 : 0) | (higher(1, -1) || up || right ? 2 : 0) | (higher(-1, 1) || down || left ? 4 : 0) | (higher(1, 1) || down || right ? 8 : 0);

            if (picture === 15) picture = 0;
            if (door && door.x === x && door.y === y) picture = AIR_PREVIEW_ENTRY;

            points.push({ x: px, y: py, picture });
        }
    }

    if (!points.length) return { width: 0, height: 0, tiles: [] };

    const width = Math.min(maxX - minX + AIR_PREVIEW_TILE_SIZE, AIR_PREVIEW_MAX_SIZE);
    const height = Math.min(maxY - minY + AIR_PREVIEW_TILE_SIZE, AIR_PREVIEW_MAX_SIZE);

    return { width, height, tiles: points.map((point) => ({ ...point, x: point.x - minX, y: point.y - minY })) };
};
