import { FC, useMemo } from 'react';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { tileToScreen } from '../hooks/usePointerToTile';
import { TILE_SIZE } from '../state/constants';
import { tileFill } from '../state/selectors';
import { FloorplanState, Tile } from '../state/types';

const WALL_FILL_LEFT = '#8a8a8a';
const WALL_FILL_BACK = '#cfcfcf';

type Point = [number, number];

const FIT_PADDING = TILE_SIZE;

const EMPTY_VIEW_BOX = '0 0 2048 1024';

const diamond = (row: number, col: number, h: number): Point[] => {
    const [cx, cyBase] = tileToScreen(row, col);
    const cy = cyBase - h * (TILE_SIZE / 8);
    const half = TILE_SIZE / 2;
    const quarter = TILE_SIZE / 4;
    return [
        [cx, cy - quarter],
        [cx + half, cy],
        [cx, cy + quarter],
        [cx - half, cy]
    ];
};

const wallBack = (row: number, col: number, wallH: number): Point[] => {
    const [cx, cyBase] = tileToScreen(row, col);
    const half = TILE_SIZE / 2;
    const quarter = TILE_SIZE / 4;
    const top = cyBase - quarter;
    const wallPx = wallH * TILE_SIZE;
    return [
        [cx, top],
        [cx + half, top + quarter],
        [cx + half, top + quarter - wallPx],
        [cx, top - wallPx]
    ];
};

const wallLeft = (row: number, col: number, wallH: number): Point[] => {
    const [cx, cyBase] = tileToScreen(row, col);
    const half = TILE_SIZE / 2;
    const quarter = TILE_SIZE / 4;
    const top = cyBase - quarter;
    const wallPx = wallH * TILE_SIZE;
    return [
        [cx - half, top + quarter],
        [cx, top],
        [cx, top - wallPx],
        [cx - half, top + quarter - wallPx]
    ];
};

const pointsAttr = (points: Point[]): string => points.map(([x, y]) => `${x},${y}`).join(' ');

const isPlaced = (t: Tile | undefined): boolean => !!t && !t.blocked;

class Bounds {
    minX = Infinity;
    minY = Infinity;
    maxX = -Infinity;
    maxY = -Infinity;

    include(points: Point[]): void {
        for (const [x, y] of points) {
            if (x < this.minX) this.minX = x;
            if (x > this.maxX) this.maxX = x;
            if (y < this.minY) this.minY = y;
            if (y > this.maxY) this.maxY = y;
        }
    }

    isEmpty(): boolean {
        return this.minX === Infinity;
    }

    viewBox(): string {
        if (this.isEmpty()) return EMPTY_VIEW_BOX;

        const x = this.minX - FIT_PADDING;
        const y = this.minY - FIT_PADDING;
        const width = Math.max(1, this.maxX - this.minX + FIT_PADDING * 2);
        const height = Math.max(1, this.maxY - this.minY + FIT_PADDING * 2);

        return `${x} ${y} ${width} ${height}`;
    }
}

export const fitViewBox = (state: FloorplanState): string => {
    const bounds = new Bounds();

    for (let r = 0; r < state.tiles.length; r++) {
        const row = state.tiles[r];
        for (let c = 0; c < row.length; c++) {
            const t = row[c];
            if (!isPlaced(t)) continue;
            bounds.include(diamond(r, c, t.h));
            if (state.wallHeight > 0) {
                if (!isPlaced(state.tiles[r - 1]?.[c])) bounds.include(wallBack(r, c, state.wallHeight));
                if (!isPlaced(state.tiles[r]?.[c - 1])) bounds.include(wallLeft(r, c, state.wallHeight));
            }
        }
    }

    return bounds.viewBox();
};

export const FloorplanPreviewSVG: FC<{ state: FloorplanState }> = ({ state }) => {
    const elements = useMemo(() => {
        const out: React.ReactNode[] = [];
        for (let r = 0; r < state.tiles.length; r++) {
            const row = state.tiles[r];
            for (let c = 0; c < row.length; c++) {
                const t = row[c];
                if (!isPlaced(t)) continue;
                out.push(<polygon key={`f-${r}-${c}`} data-role="floor" points={pointsAttr(diamond(r, c, t.h))} fill={tileFill(t)} stroke="#222" strokeWidth={0.4} />);
                if (state.wallHeight > 0) {
                    const above = state.tiles[r - 1]?.[c];
                    const left = state.tiles[r]?.[c - 1];
                    if (!isPlaced(above)) {
                        out.push(
                            <polygon
                                key={`wb-${r}-${c}`}
                                data-role="wall"
                                points={pointsAttr(wallBack(r, c, state.wallHeight))}
                                fill={WALL_FILL_BACK}
                                stroke="#333"
                                strokeWidth={0.4}
                            />
                        );
                    }
                    if (!isPlaced(left)) {
                        out.push(
                            <polygon
                                key={`wl-${r}-${c}`}
                                data-role="wall"
                                points={pointsAttr(wallLeft(r, c, state.wallHeight))}
                                fill={WALL_FILL_LEFT}
                                stroke="#333"
                                strokeWidth={0.4}
                            />
                        );
                    }
                }
            }
        }
        return out;
    }, [state.tiles, state.wallHeight]);

    const viewBox = useMemo(() => fitViewBox(state), [state]);

    return (
        <NativeTextTree>
            <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" className="w-full h-full bg-black" data-testid="floorplan-preview-svg">
                {elements}
            </svg>
        </NativeTextTree>
    );
};
