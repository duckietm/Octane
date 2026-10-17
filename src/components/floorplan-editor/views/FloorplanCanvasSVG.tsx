import { Dispatch, FC, ReactElement, PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState, WheelEvent } from 'react';
import { FaCrosshairs, FaExpand, FaMinus, FaPlus, FaSyncAlt } from 'react-icons/fa';
import { tileToScreen, usePointerToTile } from '../hooks/usePointerToTile';
import { useTool } from '../hooks/useTool';
import { MAX_NUM_TILE_PER_AXIS, TILE_SIZE } from '../state/constants';
import { FloorplanAction, FloorplanState } from '../state/types';
import { FloorplanTile } from './FloorplanTile';
import { BaseButton } from '../../../common/BaseButton';
import { Hint } from '../../../common/Tooltip';

type Props = {
    state: FloorplanState;
    dispatch: Dispatch<FloorplanAction>;
    panMode?: boolean;
};

const VIEWBOX_W = 2048;
const VIEWBOX_H = (MAX_NUM_TILE_PER_AXIS * TILE_SIZE) / 2;

const ZOOM_MIN = 0.4;
const ZOOM_MAX = 6;
const ZOOM_STEP = 0.2;
const FIT_PADDING = TILE_SIZE * 2;

const GRID_FILL = '#242424';
const GRID_LINE = '#000000';

const clampZoom = (z: number): number => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));

const computeRoomBounds = (state: FloorplanState): { x: number; y: number; w: number; h: number } | null => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let found = false;

    for (let r = 0; r < state.tiles.length; r++) {
        const row = state.tiles[r];

        if (!row) continue;

        for (let c = 0; c < row.length; c++) {
            const tile = row[c];

            if (!tile || tile.blocked) continue;

            const [x, y] = tileToScreen(r, c);
            const tileLeft = x - TILE_SIZE / 2;
            const tileRight = x + TILE_SIZE / 2;
            const tileTop = y;
            const tileBottom = y + TILE_SIZE / 2;

            if (tileLeft < minX) minX = tileLeft;
            if (tileRight > maxX) maxX = tileRight;
            if (tileTop < minY) minY = tileTop;
            if (tileBottom > maxY) maxY = tileBottom;
            found = true;
        }
    }

    if (!found) return null;

    return {
        x: minX - FIT_PADDING,
        y: minY - FIT_PADDING,
        w: maxX - minX + FIT_PADDING * 2,
        h: maxY - minY + FIT_PADDING * 2
    };
};

const GridPattern: FC<{ id: string }> = ({ id }) => {
    const w = TILE_SIZE;
    const h = TILE_SIZE / 2;
    const [originX, originY] = tileToScreen(0, 0);
    const diamond = (cx: number, cy: number) => `${cx},${cy - h / 2} ${cx + w / 2},${cy} ${cx},${cy + h / 2} ${cx - w / 2},${cy}`;

    return (
        <defs>
            <pattern id={id} patternUnits="userSpaceOnUse" x={originX - w / 2} y={originY - h / 2} width={w} height={h}>
                <rect width={w} height={h} fill={GRID_LINE} />
                <polygon points={diamond(w / 2, h / 2)} fill={GRID_FILL} stroke={GRID_LINE} strokeWidth={1} />
                <polygon points={diamond(0, 0)} fill={GRID_FILL} stroke={GRID_LINE} strokeWidth={1} />
                <polygon points={diamond(w, 0)} fill={GRID_FILL} stroke={GRID_LINE} strokeWidth={1} />
                <polygon points={diamond(0, h)} fill={GRID_FILL} stroke={GRID_LINE} strokeWidth={1} />
                <polygon points={diamond(w, h)} fill={GRID_FILL} stroke={GRID_LINE} strokeWidth={1} />
            </pattern>
        </defs>
    );
};

export const FloorplanCanvasSVG: FC<Props> = ({ state, dispatch, panMode }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [flipped, setFlipped] = useState(false);
    const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
    const centeredRef = useRef(false);

    const roomBounds = useMemo(() => computeRoomBounds(state), [state.tiles]);

    const centerPanForRoom = useCallback((): { x: number; y: number } | null => {
        if (!roomBounds) return null;
        return {
            x: roomBounds.x + roomBounds.w / 2 - VIEWBOX_W / 2,
            y: roomBounds.y + roomBounds.h / 2 - VIEWBOX_H / 2
        };
    }, [roomBounds]);

    const fitToRoom = useCallback(() => {
        if (!roomBounds) return;
        const zoomFitX = VIEWBOX_W / roomBounds.w;
        const zoomFitY = VIEWBOX_H / roomBounds.h;
        const targetZoom = clampZoom(Math.min(zoomFitX, zoomFitY) * 0.95);
        const next = centerPanForRoom();
        if (!next) return;
        setZoom(targetZoom);
        setPan(next);
    }, [roomBounds, centerPanForRoom]);

    useEffect(() => {
        if (centeredRef.current) return;
        if (!roomBounds) return;
        centeredRef.current = true;
        fitToRoom();
    }, [roomBounds, fitToRoom]);

    const visW = VIEWBOX_W / zoom;
    const visH = VIEWBOX_H / zoom;
    const baseX = (VIEWBOX_W - visW) / 2;
    const baseY = (VIEWBOX_H - visH) / 2;
    const viewX = baseX + pan.x;
    const viewY = baseY + pan.y;
    const viewBox = `${viewX} ${viewY} ${visW} ${visH}`;

    const projection = usePointerToTile(svgRef, { width: visW, height: visH, x: viewX, y: viewY });
    const tool = useTool(state, dispatch, projection);

    const rows = useMemo(
        () =>
            state.tiles.map((row, r) => {
                const cells = row.map((tile, c) => {
                    const isDoor = state.door.x === c && state.door.y === r && !tile.blocked;
                    const selected = state.selection.has(`${r},${c}`);
                    const south = state.tiles[r]?.[c + 1];
                    const west = state.tiles[r + 1]?.[c];
                    const southH = south && !south.blocked ? south.h : 0;
                    const westH = west && !west.blocked ? west.h : 0;
                    return <FloorplanTile key={`${r}-${c}`} row={r} col={c} tile={tile} selected={selected} isDoor={isDoor} southH={southH} westH={westH} />;
                });
                return <g key={`row-${r}`}>{cells}</g>;
            }),
        [state.tiles, state.door.x, state.door.y, state.selection]
    );

    const outOfBoundsOverlay = useMemo(() => {
        if (state.selection.size === 0) return null;
        const half = TILE_SIZE / 2;
        const quarter = TILE_SIZE / 4;
        const tilesRows = state.tiles.length;
        const tilesCols = state.tiles[0]?.length ?? 0;
        const out: ReactElement[] = [];
        for (const key of state.selection) {
            const [rStr, cStr] = key.split(',');
            const row = parseInt(rStr, 10);
            const col = parseInt(cStr, 10);
            if (row < tilesRows && col < tilesCols) continue;
            const [cx, cy] = tileToScreen(row, col);
            const points = `${cx},${cy - quarter} ${cx + half},${cy} ${cx},${cy + quarter} ${cx - half},${cy}`;
            out.push(<polygon key={`oob-${key}`} points={points} fill="rgba(250, 204, 21, 0.45)" stroke="#facc15" strokeWidth={1.5} strokeDasharray="3 2" />);
        }
        return out.length ? <g data-testid="selection-overlay">{out}</g> : null;
    }, [state.selection, state.tiles]);

    const zoomIn = useCallback(() => setZoom((z) => clampZoom(z + ZOOM_STEP)), []);
    const zoomOut = useCallback(() => setZoom((z) => clampZoom(z - ZOOM_STEP)), []);
    const resetView = useCallback(() => {
        fitToRoom();
    }, [fitToRoom]);

    const onWheel = useCallback((e: WheelEvent<SVGSVGElement>) => {
        if (!(e.ctrlKey || e.metaKey)) return;
        e.preventDefault();
        setZoom((z) => clampZoom(z + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)));
    }, []);

    useEffect(() => {
        const onMove = (e: PointerEvent) => {
            const start = panStartRef.current;
            if (!start) return;
            const dx = e.clientX - start.x;
            const dy = e.clientY - start.y;
            const rect = svgRef.current?.getBoundingClientRect();
            if (!rect) return;
            const scale = visW / rect.width;
            setPan({
                x: start.panX - dx * scale,
                y: start.panY - dy * scale
            });
        };
        const onUp = () => {
            panStartRef.current = null;
            setIsPanning(false);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
    }, [visW]);

    const isPanGesture = (e: ReactPointerEvent): boolean => e.button === 1 || (e.button === 0 && e.shiftKey) || (e.button === 0 && Boolean(panMode));

    const cursorClass = isPanning ? 'cursor-grabbing' : panMode ? 'cursor-grab' : '';

    return (
        <div className="fp-stage" data-testid="floorplan-2d">
            <svg
                ref={svgRef}
                viewBox={viewBox}
                style={flipped ? { transform: 'scaleX(-1)' } : undefined}
                className={`block w-full h-full select-none bg-black [shape-rendering:crispEdges] ${cursorClass}`}
                onWheel={onWheel}
                onPointerDown={(e) => {
                    if (isPanGesture(e)) {
                        e.preventDefault();
                        panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
                        setIsPanning(true);
                        return;
                    }
                    tool.onPointerDown(e);
                }}
                onPointerMove={(e) => {
                    if (panStartRef.current) return;
                    tool.onPointerMove(e);
                }}
                onPointerUp={(e) => {
                    if (panStartRef.current) return;
                    tool.onPointerUp(e);
                }}
            >
                <GridPattern id="fp-grid" />
                <rect data-testid="floorplan-grid" x={viewX} y={viewY} width={visW} height={visH} fill="url(#fp-grid)" />
                {rows}
                {outOfBoundsOverlay}
            </svg>
            <div className="fp-stage-buttons">
                <Hint content="Fit room to view"><BaseButton aria-label="Fit room to view" type="button" data-testid="zoom-reset" className="fp-round-btn is-small" disabled={!roomBounds} onClick={resetView}>
                    <FaExpand size={10} />
                </BaseButton></Hint>
                <Hint content="Recenter on room (keep zoom)"><BaseButton aria-label="Recenter on room (keep zoom)"
                    type="button"
                    data-testid="zoom-recenter"
                    className="fp-round-btn is-small"
                    disabled={!roomBounds}
                    onClick={() => {
                        const next = centerPanForRoom();
                        if (next) setPan(next);
                    }}
                >
                    <FaCrosshairs size={10} />
                </BaseButton></Hint>
                <Hint content={flipped ? 'Original view' : 'View from the other side'}>
                    <BaseButton aria-label={flipped ? 'Original view' : 'View from the other side'}
                        type="button"
                        data-testid="zoom-flip"
                        data-active={flipped ? 'true' : 'false'}
                        className={`fp-round-btn is-small ${flipped ? 'is-on' : ''}`}
                        onClick={() => setFlipped((v) => !v)}
                    >
                        <FaSyncAlt size={10} />
                    </BaseButton>
                </Hint>
                <Hint content={`Zoom in (Ctrl+wheel) · ${Math.round(zoom * 100)}%`}><BaseButton aria-label={`Zoom in (Ctrl+wheel) · ${Math.round(zoom * 100)}%`} type="button" data-testid="zoom-in" className="fp-round-btn" disabled={zoom >= ZOOM_MAX - 1e-3} onClick={zoomIn}>
                    <FaPlus size={13} />
                </BaseButton></Hint>
                <Hint content={`Zoom out (Ctrl+wheel) · ${Math.round(zoom * 100)}%`}><BaseButton aria-label={`Zoom out (Ctrl+wheel) · ${Math.round(zoom * 100)}%`} type="button" data-testid="zoom-out" className="fp-round-btn" disabled={zoom <= ZOOM_MIN + 1e-3} onClick={zoomOut}>
                    <FaMinus size={13} />
                </BaseButton></Hint>
            </div>
        </div>
    );
};
