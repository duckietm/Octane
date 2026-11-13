import { Dispatch, FC, ReactElement, PointerEvent as ReactPointerEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, WheelEvent } from 'react';
import { FaCrosshairs, FaExpand, FaMinus, FaPlus, FaSyncAlt } from 'react-icons/fa';
import { tileToScreen, usePointerToTile } from '../hooks/usePointerToTile';
import { useTool } from '../hooks/useTool';
import { MAX_NUM_TILE_PER_AXIS, TILE_SIZE } from '../state/constants';
import { FloorplanAction, FloorplanState } from '../state/types';
import { FloorplanTile } from './FloorplanTile';
import { BaseButton } from '../../../common/BaseButton';
import { Hint } from '../../../common/Tooltip';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { localizeWithFallback } from '../../../api';

type Props = {
    state: FloorplanState;
    dispatch: Dispatch<FloorplanAction>;
    panMode?: boolean;
};

/** The drawable plan in SVG units: every tile of the largest room fits in it. */
const WORLD_W = 2048;
const WORLD_H = (MAX_NUM_TILE_PER_AXIS * TILE_SIZE) / 2;

const ZOOM_MIN = 0.4;
const ZOOM_MAX = 6;
const ZOOM_STEP = 0.2;
const FIT_PADDING = TILE_SIZE * 2;

/** Screen pixels per SVG unit at zoom 1: the whole plan across the original 340 px wide view. */
const BASE_SCALE = 340 / WORLD_W;
/** The view before it has been measured (and in tests, where nothing is laid out). */
const FALLBACK_VIEW = { w: 340, h: Math.round((340 * WORLD_H) / WORLD_W) };

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

export const FloorplanCanvasSVG: FC<Props> = ({ state, dispatch, panMode }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [zoom, setZoom] = useState(1);
    // The view is a real scroll box (AIR's plan has both scrollbars): the plan is as big as it is drawn, the SVG
    // stays pinned over the visible part and draws exactly that part.
    const [viewport, setViewport] = useState(FALLBACK_VIEW);
    const [measured, setMeasured] = useState(false);
    const [scroll, setScroll] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [flipped, setFlipped] = useState(false);
    const panStartRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
    const centeredRef = useRef(false);
    // A point of the plan to bring to the middle of the view once the new zoom or size is laid out.
    const pendingCenterRef = useRef<{ x: number; y: number } | null>(null);
    const [centerTick, setCenterTick] = useState(0);

    const roomBounds = useMemo(() => computeRoomBounds(state), [state.tiles]);

    const scale = zoom * BASE_SCALE;
    const visW = viewport.w / scale;
    const visH = viewport.h / scale;
    // A plan smaller than the view is centred in it; a bigger one scrolls.
    const padX = Math.max(0, (visW - WORLD_W) / 2);
    const padY = Math.max(0, (visH - WORLD_H) / 2);
    const contentW = Math.max(viewport.w, Math.round(WORLD_W * scale));
    const contentH = Math.max(viewport.h, Math.round(WORLD_H * scale));
    const viewX = scroll.left / scale - padX;
    const viewY = scroll.top / scale - padY;
    const viewBox = `${viewX} ${viewY} ${visW} ${visH}`;

    useLayoutEffect(() => {
        const element = scrollRef.current;

        if (!element) return;

        const measure = () => {
            const w = element.clientWidth;
            const h = element.clientHeight;

            if (!(w > 0 && h > 0)) return;

            setViewport((previous) => (previous.w === w && previous.h === h ? previous : { w, h }));
            setMeasured(true);
        };

        measure();

        if (typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(measure);

        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    const centerOn = useCallback((x: number, y: number) => {
        pendingCenterRef.current = { x, y };
        setCenterTick((tick) => tick + 1);
    }, []);

    useLayoutEffect(() => {
        const element = scrollRef.current;
        const target = pendingCenterRef.current;

        if (!element || !target) return;

        pendingCenterRef.current = null;
        element.scrollLeft = Math.max(0, (target.x + padX) * scale - viewport.w / 2);
        element.scrollTop = Math.max(0, (target.y + padY) * scale - viewport.h / 2);
        setScroll({ left: element.scrollLeft, top: element.scrollTop });
    }, [centerTick, scale, padX, padY, viewport.w, viewport.h]);

    const centerOnRoom = useCallback(() => {
        if (!roomBounds) return;

        centerOn(roomBounds.x + roomBounds.w / 2, roomBounds.y + roomBounds.h / 2);
    }, [roomBounds, centerOn]);

    const fitToRoom = useCallback(() => {
        if (!roomBounds) return;

        const zoomFitX = viewport.w / (roomBounds.w * BASE_SCALE);
        const zoomFitY = viewport.h / (roomBounds.h * BASE_SCALE);

        setZoom(clampZoom(Math.min(zoomFitX, zoomFitY) * 0.95));
        centerOnRoom();
    }, [roomBounds, viewport.w, viewport.h, centerOnRoom]);

    // The first view of a room: fitted and centred, once the view has its real size.
    useEffect(() => {
        if (centeredRef.current || !roomBounds || !measured) return;

        centeredRef.current = true;
        fitToRoom();
    }, [roomBounds, measured, fitToRoom]);

    /** Zooms around the middle of the view, so the part being looked at stays in place. */
    const zoomBy = useCallback(
        (step: number) => {
            centerOn(viewX + visW / 2, viewY + visH / 2);
            setZoom((current) => clampZoom(current + step));
        },
        [centerOn, viewX, viewY, visW, visH]
    );

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

    const zoomIn = useCallback(() => zoomBy(ZOOM_STEP), [zoomBy]);
    const zoomOut = useCallback(() => zoomBy(-ZOOM_STEP), [zoomBy]);
    const resetView = useCallback(() => {
        fitToRoom();
    }, [fitToRoom]);

    // Ctrl + wheel zooms; a plain wheel scrolls the plan, as any scroll box does.
    const onWheel = useCallback(
        (e: WheelEvent<SVGSVGElement>) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            e.preventDefault();
            zoomBy(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
        },
        [zoomBy]
    );

    useEffect(() => {
        const onMove = (e: PointerEvent) => {
            const start = panStartRef.current;
            const element = scrollRef.current;

            if (!start || !element) return;

            // The plan follows the pointer; seen from the other side, left and right are swapped.
            const dx = (e.clientX - start.x) * (flipped ? -1 : 1);

            element.scrollLeft = start.left - dx;
            element.scrollTop = start.top - (e.clientY - start.y);
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
    }, [flipped]);

    const isPanGesture = (e: ReactPointerEvent): boolean => e.button === 1 || (e.button === 0 && e.shiftKey) || (e.button === 0 && Boolean(panMode));

    const cursorClass = isPanning ? 'cursor-grabbing' : panMode ? 'cursor-grab' : '';

    return (
        <NativeTextTree>
            <div className="fp-stage" data-testid="floorplan-2d">
                <div
                    ref={scrollRef}
                    className="fp-stage-scroll has-classic-scrollbar"
                    data-testid="floorplan-scroll"
                    onScroll={(event) => setScroll({ left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop })}
                >
                    <div className="fp-stage-content" style={{ width: contentW, height: contentH }}>
                        <svg
                            ref={svgRef}
                            viewBox={viewBox}
                            preserveAspectRatio="none"
                            style={{ width: viewport.w, height: viewport.h, ...(flipped ? { transform: 'scaleX(-1)' } : null) }}
                            className={`fp-stage-svg select-none bg-black [shape-rendering:crispEdges] ${cursorClass}`}
                            onWheel={onWheel}
                            onPointerDown={(e) => {
                                if (isPanGesture(e)) {
                                    e.preventDefault();
                                    panStartRef.current = { x: e.clientX, y: e.clientY, left: scrollRef.current?.scrollLeft ?? 0, top: scrollRef.current?.scrollTop ?? 0 };
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
                            {rows}
                            {outOfBoundsOverlay}
                        </svg>
                    </div>
                </div>
                <div className="fp-stage-buttons">
                    <Hint content={localizeWithFallback('octane.floorplan_editor.fit_room_to_view', 'Fit room to view')}><BaseButton aria-label={localizeWithFallback('octane.floorplan_editor.fit_room_to_view', 'Fit room to view')} type="button" data-testid="zoom-reset" className="fp-round-btn is-small" disabled={!roomBounds} onClick={resetView}>
                        <FaExpand size={10} />
                    </BaseButton></Hint>
                    <Hint content={localizeWithFallback('octane.floorplan_editor.recenter_on_room_keep_zoom', 'Recenter on room (keep zoom)')}><BaseButton aria-label={localizeWithFallback('octane.floorplan_editor.recenter_on_room_keep_zoom', 'Recenter on room (keep zoom)')}
                        type="button"
                        data-testid="zoom-recenter"
                        className="fp-round-btn is-small"
                        disabled={!roomBounds}
                        onClick={centerOnRoom}
                    >
                        <FaCrosshairs size={10} />
                    </BaseButton></Hint>
                    <Hint content={flipped ? localizeWithFallback('octane.floorplan_editor.original_view', 'Original view') : localizeWithFallback('octane.floorplan_editor.view_from_the_other_side', 'View from the other side')}>
                        <BaseButton aria-label={flipped ? localizeWithFallback('octane.floorplan_editor.original_view', 'Original view') : localizeWithFallback('octane.floorplan_editor.view_from_the_other_side', 'View from the other side')}
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
        </NativeTextTree>
    );
};
