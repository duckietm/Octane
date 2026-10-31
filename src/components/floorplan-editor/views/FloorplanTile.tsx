import { FC, memo } from 'react';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { tileToScreen } from '../hooks/usePointerToTile';
import { TILE_SIZE } from '../state/constants';
import { tileFill } from '../state/selectors';
import { Tile } from '../state/types';

type Props = {
    row: number;
    col: number;
    tile: Tile;
    selected: boolean;
    isDoor: boolean;
    southH?: number;
    westH?: number;
};

const HEIGHT_LIFT = TILE_SIZE / 8;

const diamondPoints = (row: number, col: number, h: number): string => {
    const [cx, cyBase] = tileToScreen(row, col);
    const cy = cyBase - h * HEIGHT_LIFT;
    const half = TILE_SIZE / 2;
    const quarter = TILE_SIZE / 4;
    return `${cx},${cy - quarter} ${cx + half},${cy} ${cx},${cy + quarter} ${cx - half},${cy}`;
};

const darkenHex = (hex: string, factor: number): string => {
    const h = hex.replace('#', '');
    if (h.length !== 6) return hex;
    const r = Math.max(0, Math.floor(parseInt(h.slice(0, 2), 16) * factor));
    const g = Math.max(0, Math.floor(parseInt(h.slice(2, 4), 16) * factor));
    const b = Math.max(0, Math.floor(parseInt(h.slice(4, 6), 16) * factor));
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

const southWallPoints = (cx: number, cy: number, drop: number): string => {
    const half = TILE_SIZE / 2;
    const quarter = TILE_SIZE / 4;
    return `${cx + half},${cy} ${cx + half},${cy + drop} ${cx},${cy + quarter + drop} ${cx},${cy + quarter}`;
};

const westWallPoints = (cx: number, cy: number, drop: number): string => {
    const half = TILE_SIZE / 2;
    const quarter = TILE_SIZE / 4;
    return `${cx - half},${cy} ${cx},${cy + quarter} ${cx},${cy + quarter + drop} ${cx - half},${cy + drop}`;
};

const FloorplanTileImpl: FC<Props> = ({ row, col, tile, selected, isDoor, southH = 0, westH = 0 }) => {
    if (tile.blocked) {
        if (!selected) return null;
        const points = diamondPoints(row, col, tile.h);
        return (
            <NativeTextTree>
                <polygon
                    data-testid="selection-ring"
                    points={points}
                    fill="rgba(250, 204, 21, 0.45)"
                    stroke="#facc15"
                    strokeWidth={1.5}
                    strokeDasharray="3 2"
                />
            </NativeTextTree>
        );
    }
    const points = diamondPoints(row, col, tile.h);
    const fill = tileFill(tile);

    const [cx, cyBase] = tileToScreen(row, col);
    const cy = cyBase - tile.h * HEIGHT_LIFT;
    const southDrop = Math.max(0, tile.h - southH) * HEIGHT_LIFT;
    const westDrop = Math.max(0, tile.h - westH) * HEIGHT_LIFT;
    const southFill = southDrop > 0 ? darkenHex(fill, 0.7) : null;
    const westFill = westDrop > 0 ? darkenHex(fill, 0.55) : null;

    return (
        <NativeTextTree>
            <g>
                {southFill && (
                    <polygon data-testid="tile-south-wall" points={southWallPoints(cx, cy, southDrop)} fill={southFill} stroke="#222" strokeWidth={0.5} />
                )}
                {westFill && <polygon data-testid="tile-west-wall" points={westWallPoints(cx, cy, westDrop)} fill={westFill} stroke="#222" strokeWidth={0.5} />}
                <polygon data-row={row} data-col={col} points={points} fill={fill} stroke="#222" strokeWidth={0.5} />
                {tile.occupied && (
                    <polygon
                        data-testid="occupied-marker"
                        points={points}
                        fill="rgba(249, 115, 22, 0.40)"
                        stroke="#f97316"
                        strokeWidth={1}
                        strokeDasharray="2 2"
                        pointerEvents="none"
                    />
                )}
                {selected && (
                    <polygon
                        data-testid="selection-ring"
                        data-row={row}
                        data-col={col}
                        points={points}
                        fill="none"
                        stroke="#fff"
                        strokeWidth={2}
                        strokeDasharray="3 2"
                    />
                )}
                {isDoor && (
                    <polygon
                        data-testid="door-marker"
                        data-row={row}
                        data-col={col}
                        points={points}
                        fill="rgba(255,255,255,0.85)"
                        stroke="#000"
                        strokeWidth={1}
                    />
                )}
            </g>
        </NativeTextTree>
    );
};

export const FloorplanTile = memo(FloorplanTileImpl);
