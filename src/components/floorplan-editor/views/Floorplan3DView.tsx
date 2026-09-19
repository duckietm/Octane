import { Dispatch, FC, PointerEvent as ReactPointerEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, WheelEvent } from 'react';
import { FaCrosshairs, FaSearchMinus, FaSearchPlus, FaSyncAlt } from 'react-icons/fa';
import { PointerProjection } from '../hooks/usePointerToTile';
import { useTool } from '../hooks/useTool';
import { FloorplanScene } from '../scene3d/FloorplanScene';
import { buildHeightmapInstances, cameraEye, clampCamera, fitCamera, OrbitCamera, panCamera, roomBounds, roomCenter, visibleWallSides, WallSides } from '../scene3d/heightmap';
import { mat4LookAt, mat4Multiply, mat4Perspective } from '../scene3d/mat4';
import { cameraRay, pickTile, TileHit } from '../scene3d/picking';
import { FloorplanAction, FloorplanState } from '../state/types';

type Props = {
    state: FloorplanState;
    dispatch: Dispatch<FloorplanAction>;
    /** Hand tool: left-drag orbits instead of editing. */
    panMode?: boolean;
};

type Status = 'loading' | 'ready' | 'unavailable';

const FOV_Y = Math.PI / 4;
const NEAR = 0.1;
const FAR = 600;
const ROTATE_SPEED = 0.008;
const ZOOM_STEP = 1.2;
/** Turntable speed: one full turn every 12 seconds. */
const AUTO_ROTATE_RATE = (Math.PI * 2) / 12;

type Drag = { mode: 'rotate' | 'pan' | 'tool'; lastX: number; lastY: number };

const sameTile = (a: TileHit | null, b: TileHit | null): boolean => (a === b) || (!!a && !!b && a.row === b.row && a.col === b.col);

/**
 * 3D view of the floorplan: the same state the SVG editor edits, drawn as
 * extruded tile columns by PixiJS, and editable with the same tools. Click or
 * drag paints with the active tool (or orbits in hand mode); right-, middle-
 * or alt-drag orbits; shift-drag pans; the wheel zooms; double-click
 * re-frames the room.
 */
export const Floorplan3DView: FC<Props> = ({ state, dispatch, panMode = false }) => {
    const hostRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<FloorplanScene | null>(null);
    const cameraRef = useRef<OrbitCamera | null>(null);
    const sizeRef = useRef<{ width: number; height: number }>({ width: 1, height: 1 });
    const frameRef = useRef<number>(0);
    const dragRef = useRef<Drag | null>(null);
    const tilesRef = useRef(state.tiles);
    const [status, setStatus] = useState<Status>('loading');
    const [zoomLabel, setZoomLabel] = useState('');
    const [hover, setHover] = useState<TileHit | null>(null);
    const [showWalls, setShowWalls] = useState(true);
    const [textured, setTextured] = useState(false);
    const [wallSides, setWallSides] = useState<WallSides>({ north: true, west: true });
    const [autoRotate, setAutoRotate] = useState(false);

    const { tiles, door, selection, thickness, wallHeight } = state;

    useLayoutEffect(() => {
        tilesRef.current = tiles;
    }, [tiles]);
    const bounds = useMemo(() => roomBounds({ tiles }), [tiles]);
    const instances = useMemo(
        () => buildHeightmapInstances({ tiles, door, selection, thickness, wallHeight }, { hover, walls: showWalls, wallSides, doorMarker: true }),
        [tiles, door, selection, thickness, wallHeight, hover, showWalls, wallSides]
    );

    /** Screen position to tile, through the current camera; the tools use it like the SVG projection. */
    const projection = useMemo<PointerProjection>(
        () => ({
            fromClient: (clientX: number, clientY: number) => {
                const host = hostRef.current;
                const camera = cameraRef.current;

                if (!host || !camera) return null;

                const rect = host.getBoundingClientRect();

                if (rect.width < 1 || rect.height < 1) return null;

                const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
                const ndcY = 1 - ((clientY - rect.top) / rect.height) * 2;

                return pickTile(cameraRay(camera, rect.width / rect.height, FOV_Y, ndcX, ndcY), tilesRef.current);
            }
        }),
        []
    );

    const tool = useTool(state, dispatch, projection);

    const requestRender = useCallback(() => {
        if (frameRef.current) return;

        frameRef.current = window.requestAnimationFrame(() => {
            frameRef.current = 0;

            const scene = sceneRef.current;
            const camera = cameraRef.current;

            if (!scene || !camera) return;

            const { width, height } = sizeRef.current;
            const view = mat4LookAt(cameraEye(camera), camera.target);
            const projection = mat4Perspective(FOV_Y, width / Math.max(1, height), NEAR, FAR);

            scene.setCamera(mat4Multiply(projection, view));
            scene.render();
        });
    }, []);

    const setCamera = useCallback(
        (next: OrbitCamera) => {
            const camera = clampCamera(next);

            cameraRef.current = camera;
            setZoomLabel(`${Math.round(camera.distance)}`);

            const sides = visibleWallSides(cameraEye(camera), roomCenter(bounds));
            setWallSides((current) => (current.north === sides.north && current.west === sides.west ? current : sides));

            requestRender();
        },
        [bounds, requestRender]
    );

    const resetView = useCallback(() => {
        const { width, height } = sizeRef.current;
        setCamera(fitCamera(bounds, width / Math.max(1, height)));
    }, [bounds, setCamera]);

    // Create the PixiJS scene once the canvas is on screen.
    useEffect(() => {
        const host = hostRef.current;

        if (!host) return;

        let disposed = false;
        let scene: FloorplanScene | null = null;

        const rect = host.getBoundingClientRect();
        sizeRef.current = { width: Math.max(1, rect.width), height: Math.max(1, rect.height) };

        FloorplanScene.create(host, sizeRef.current.width, sizeRef.current.height)
            .then((created) => {
                if (disposed) {
                    created.destroy();
                    return;
                }

                scene = created;
                sceneRef.current = created;
                setStatus('ready');
            })
            .catch(() => {
                if (!disposed) setStatus('unavailable');
            });

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];

            if (!entry) return;

            const width = Math.floor(entry.contentRect.width);
            const height = Math.floor(entry.contentRect.height);

            if (width < 1 || height < 1) return;
            if (sizeRef.current.width === width && sizeRef.current.height === height) return;

            sizeRef.current = { width, height };
            sceneRef.current?.resize(width, height);
            requestRender();
        });

        observer.observe(host);

        return () => {
            disposed = true;
            observer.disconnect();

            if (frameRef.current) {
                window.cancelAnimationFrame(frameRef.current);
                frameRef.current = 0;
            }

            sceneRef.current = null;
            scene?.destroy();
        };
    }, [requestRender]);

    useEffect(() => {
        if (status !== 'ready') return;

        sceneRef.current?.setTextured(textured);
        requestRender();
    }, [status, textured, requestRender]);

    // Frame the room the first time the scene is ready, then follow every edit.
    useEffect(() => {
        if (status !== 'ready') return;

        sceneRef.current?.update(instances);

        if (!cameraRef.current) resetView();
        else requestRender();
    }, [status, instances, resetView, requestRender]);

    // 360° turntable: keep orbiting while enabled; the wall culling follows the camera.
    useEffect(() => {
        if (!autoRotate || status !== 'ready') return;

        let frame = 0;
        let last = performance.now();

        const step = (now: number) => {
            const camera = cameraRef.current;
            const dt = Math.min(0.1, (now - last) / 1000);

            last = now;

            if (camera) setCamera({ ...camera, yaw: camera.yaw + AUTO_ROTATE_RATE * dt });

            frame = window.requestAnimationFrame(step);
        };

        frame = window.requestAnimationFrame(step);

        return () => window.cancelAnimationFrame(frame);
    }, [autoRotate, status, setCamera]);

    const updateHover = (event: ReactPointerEvent<HTMLDivElement>) => {
        const next = projection.fromClient(event.clientX, event.clientY);

        setHover((current) => (sameTile(current, next) ? current : next));
        sceneRef.current?.setHover(next);
        requestRender();
    };

    const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (status !== 'ready') return;

        const orbit = event.button === 1 || event.button === 2 || event.altKey || (event.button === 0 && panMode);
        const pan = event.shiftKey;

        if (pan || orbit) {
            setAutoRotate(false);
            dragRef.current = { mode: pan ? 'pan' : 'rotate', lastX: event.clientX, lastY: event.clientY };
            event.currentTarget.setPointerCapture(event.pointerId);
            event.preventDefault();
            return;
        }

        if (event.button !== 0) return;

        dragRef.current = { mode: 'tool', lastX: event.clientX, lastY: event.clientY };
        tool.onPointerDown(event);
    };

    const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        const camera = cameraRef.current;

        if (!drag) {
            if (status === 'ready') updateHover(event);
            return;
        }

        if (drag.mode === 'tool') {
            updateHover(event);
            tool.onPointerMove(event);
            return;
        }

        if (!camera) return;

        const dx = event.clientX - drag.lastX;
        const dy = event.clientY - drag.lastY;

        drag.lastX = event.clientX;
        drag.lastY = event.clientY;

        if (drag.mode === 'rotate') setCamera({ ...camera, yaw: camera.yaw - dx * ROTATE_SPEED, pitch: camera.pitch + dy * ROTATE_SPEED });
        else setCamera(panCamera(camera, dx, dy));
    };

    const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;

        if (!drag) return;

        dragRef.current = null;

        if (drag.mode === 'tool') {
            tool.onPointerUp(event);
            return;
        }

        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    };

    const onPointerLeave = () => {
        if (dragRef.current) return;

        setHover(null);
        sceneRef.current?.setHover(null);
        requestRender();
    };

    const zoomBy = (factor: number) => {
        const camera = cameraRef.current;

        if (!camera) return;

        setCamera({ ...camera, distance: camera.distance * factor });
    };

    const onWheel = (event: WheelEvent<HTMLDivElement>) => {
        if (status !== 'ready') return;

        zoomBy(event.deltaY > 0 ? ZOOM_STEP : 1 / ZOOM_STEP);
    };

    return (
        <div
            ref={hostRef}
            data-testid="floorplan-3d"
            className={`relative w-full h-full min-h-0 rounded-md border border-zinc-300 overflow-hidden bg-[#e9e9e1] select-none touch-none ${panMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerLeave={onPointerLeave}
            onWheel={onWheel}
            onDoubleClick={resetView}
            onContextMenu={(event) => event.preventDefault()}
        >
            {status === 'loading' && (
                <div className="absolute z-10 inset-0 flex items-center justify-center text-xs text-zinc-500" data-testid="floorplan-3d-loading">
                    Loading 3D preview...
                </div>
            )}
            {status === 'unavailable' && (
                <div className="absolute z-10 inset-0 flex items-center justify-center px-4 text-center text-xs text-zinc-600" data-testid="floorplan-3d-unavailable">
                    The 3D preview needs WebGL, which is not available here.
                </div>
            )}
            <div className="absolute z-10 bottom-2 left-2 flex items-center gap-1 rounded-md bg-white/95 border border-zinc-300 shadow-sm px-1 py-1 text-zinc-700" onPointerDown={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}>
                <button
                    type="button"
                    data-testid="view3d-zoom-out"
                    title="Zoom out (wheel)"
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-100 disabled:opacity-40"
                    disabled={status !== 'ready'}
                    onClick={() => zoomBy(ZOOM_STEP)}
                >
                    <FaSearchMinus size={12} />
                </button>
                <button
                    type="button"
                    data-testid="view3d-reset"
                    title="Fit room to view (double-click)"
                    className="px-2 h-7 min-w-[3rem] flex items-center justify-center rounded hover:bg-zinc-100 text-xs font-bold tabular-nums disabled:opacity-40"
                    disabled={status !== 'ready'}
                    onClick={resetView}
                >
                    <FaCrosshairs size={12} className="mr-1" />
                    {zoomLabel}
                </button>
                <button
                    type="button"
                    data-testid="view3d-zoom-in"
                    title="Zoom in (wheel)"
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-100 disabled:opacity-40"
                    disabled={status !== 'ready'}
                    onClick={() => zoomBy(1 / ZOOM_STEP)}
                >
                    <FaSearchPlus size={12} />
                </button>
            </div>
            <div className="absolute z-10 top-2 left-2 flex items-center gap-1 rounded-md bg-white/95 border border-zinc-300 shadow-sm px-1 py-1 text-zinc-700" onPointerDown={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}>
                <button
                    type="button"
                    data-testid="view3d-walls"
                    data-active={showWalls ? 'true' : 'false'}
                    title="Show the room walls"
                    className={`px-2 h-7 flex items-center justify-center rounded text-xs font-bold ${showWalls ? 'bg-sky-500 text-white' : 'hover:bg-zinc-100'}`}
                    onClick={() => setShowWalls((value) => !value)}
                >
                    Walls
                </button>
                <button
                    type="button"
                    data-testid="view3d-textures"
                    data-active={textured ? 'true' : 'false'}
                    title="Draw floor and wall patterns instead of the height colours"
                    className={`px-2 h-7 flex items-center justify-center rounded text-xs font-bold ${textured ? 'bg-sky-500 text-white' : 'hover:bg-zinc-100'}`}
                    onClick={() => setTextured((value) => !value)}
                >
                    Textures
                </button>
                <button
                    type="button"
                    data-testid="view3d-rotate"
                    data-active={autoRotate ? 'true' : 'false'}
                    title="Turn the room around 360°"
                    className={`px-2 h-7 flex items-center justify-center gap-1 rounded text-xs font-bold disabled:opacity-40 ${autoRotate ? 'bg-sky-500 text-white' : 'hover:bg-zinc-100'}`}
                    disabled={status !== 'ready'}
                    onClick={() => setAutoRotate((value) => !value)}
                >
                    <FaSyncAlt size={11} className={autoRotate ? 'animate-spin' : ''} style={autoRotate ? { animationDuration: '3s' } : undefined} />
                    360°
                </button>
            </div>
            <div className="absolute z-10 top-2 right-2 rounded-md bg-white/90 border border-zinc-300 px-2 py-1 text-[10px] text-zinc-600 pointer-events-none">
                {panMode ? 'Drag to rotate · Shift-drag to pan · Wheel to zoom · 360° to turn' : 'Click or drag to edit · Right-drag to rotate · Shift-drag to pan · Wheel to zoom · 360° to turn'}
            </div>
        </div>
    );
};
