import {
    AddLinkEventTracker,
    convertNumbersForSaving,
    convertSettingToNumber,
    FloorHeightMapEvent,
    GetOccupiedTilesMessageComposer,
    GetRoomEntryTileMessageComposer,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    RoomEngineEvent,
    RoomEntryTileMessageEvent,
    RoomOccupiedTilesMessageEvent,
    RoomVisualizationSettingsEvent,
    UpdateFloorPropertiesMessageComposer
} from '@octane/renderer';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { FaBolt, FaBoxOpen, FaCaretLeft, FaCaretRight } from 'react-icons/fa';
import { LocalizeText, SendMessageComposer } from '../../api';
import { Button, ButtonGroup, Flex, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../common';
import { useMessageEvent, useOctaneEvent } from '../../hooks';
import { useFloorplanLiveSync } from '../../hooks/rooms/widgets/useFloorplanLiveSync';
import { useFloorplanReducer } from './hooks/useFloorplanReducer';
import { MAX_WALL_HEIGHT, MIN_WALL_HEIGHT } from './state/constants';
import { serializeTilemap } from './state/encoding';
import { areaCount } from './state/selectors';
import { EntryDir, ThicknessLevel } from './state/types';
import { FloorplanCanvasSVG } from './views/FloorplanCanvasSVG';
import { FloorplanHeightPicker } from './views/FloorplanHeightPicker';
import { FloorplanImportExport } from './views/FloorplanImportExport';
import { FloorplanOptionsPanel } from './views/FloorplanOptionsPanel';
import { FloorplanToolbar } from './views/FloorplanToolbar';

export type FloorplanEditorExternalSession = {
    tilemap: string;
    occupiedTiles?: boolean[][];
    title?: string;
    onClose: () => void;
    onSave: (tilemap: string) => void;
};

type Props = {
    externalSession?: FloorplanEditorExternalSession;
};

const clampThickness = (v: number): ThicknessLevel => {
    if (v <= 0) return 0;
    if (v >= 3) return 3;
    return (v | 0) as ThicknessLevel;
};

export const FloorplanEditorView: FC<Props> = ({ externalSession }) => {
    const [roomVisible, setRoomVisible] = useState(false);
    const [importExportVisible, setImportExportVisible] = useState(false);
    const [liveSync, setLiveSync] = useState(true);
    const [panMode, setPanMode] = useState(false);
    const [autoPickup, setAutoPickup] = useState(false);
    const { state, dispatch, loadFromServer, undo, redo, canUndo, canRedo } = useFloorplanReducer();
    const isExternal = !!externalSession;
    const isVisible = isExternal || roomVisible;
    const originalRef = useRef<{
        tilemap: string;
        entryPoint: [number, number];
        entryPointDir: number;
        thicknessWall: ThicknessLevel;
        thicknessFloor: ThicknessLevel;
        wallHeight: number;
    } | null>(null);

    const area = useMemo(() => areaCount(state.tiles), [state.tiles]);

    const { setBaseline, mergeBaseline, revert: revertLivePreview } = useFloorplanLiveSync({ enabled: !isExternal && liveSync && isVisible, state });

    useOctaneEvent<RoomEngineEvent>(RoomEngineEvent.DISPOSED, () => {
        if (!isExternal) setRoomVisible(false);
    });

    useEffect(() => {
        if (!externalSession) return;

        const rows = externalSession.tilemap.split(/\r\n|\r|\n/).filter((row) => row.length > 0);
        let entryPoint: [number, number] = [0, 0];
        outer: for (let y = 0; y < rows.length; y++) {
            for (let x = 0; x < rows[y].length; x++) {
                if (rows[y].charAt(x).toLowerCase() === 'x') continue;
                entryPoint = [x, y];
                break outer;
            }
        }

        const settings = {
            tilemap: externalSession.tilemap,
            entryPoint,
            entryPointDir: 2,
            thicknessWall: 1 as ThicknessLevel,
            thicknessFloor: 1 as ThicknessLevel,
            wallHeight: MIN_WALL_HEIGHT
        };
        originalRef.current = settings;
        loadFromServer(settings);
        if (externalSession.occupiedTiles) dispatch({ type: 'SET_OCCUPIED_TILES', map: externalSession.occupiedTiles });
    }, [dispatch, externalSession?.occupiedTiles, externalSession?.tilemap, loadFromServer]);

    useEffect(() => {
        if (!isVisible || isExternal) return;
        SendMessageComposer(new GetRoomEntryTileMessageComposer());
        // Ask the server which tiles currently hold furniture so they can be
        // shown (and protected from editing) in the grid.
        SendMessageComposer(new GetOccupiedTilesMessageComposer());
    }, [isExternal, isVisible]);

    useMessageEvent<RoomOccupiedTilesMessageEvent>(RoomOccupiedTilesMessageEvent, (event) => {
        if (isExternal) return;
        dispatch({ type: 'SET_OCCUPIED_TILES', map: event.getParser().blockedTilesMap });
    });

    useMessageEvent<RoomEntryTileMessageEvent>(RoomEntryTileMessageEvent, (event) => {
        if (isExternal) return;
        const parser = event.getParser();
        originalRef.current = {
            tilemap: originalRef.current?.tilemap ?? '',
            entryPoint: [parser.x, parser.y],
            entryPointDir: parser.direction,
            thicknessWall: originalRef.current?.thicknessWall ?? 1,
            thicknessFloor: originalRef.current?.thicknessFloor ?? 1,
            wallHeight: originalRef.current?.wallHeight ?? -1
        };
        dispatch({ type: 'SET_DOOR', x: parser.x, y: parser.y, source: 'remote' });
        dispatch({ type: 'SET_DOOR_DIR', dir: ((parser.direction | 0) & 7) as EntryDir, source: 'remote' });
        mergeBaseline({ doorX: parser.x, doorY: parser.y, doorDir: (parser.direction | 0) & 7 });
    });

    useMessageEvent<FloorHeightMapEvent>(FloorHeightMapEvent, (event) => {
        if (isExternal) return;
        const parser = event.getParser();
        originalRef.current = {
            tilemap: parser.model,
            entryPoint: originalRef.current?.entryPoint ?? [0, 0],
            entryPointDir: originalRef.current?.entryPointDir ?? 2,
            thicknessWall: originalRef.current?.thicknessWall ?? 1,
            thicknessFloor: originalRef.current?.thicknessFloor ?? 1,
            wallHeight: parser.wallHeight + 1
        };
        loadFromServer({
            tilemap: parser.model,
            entryPoint: originalRef.current.entryPoint,
            entryPointDir: originalRef.current.entryPointDir,
            thicknessWall: originalRef.current.thicknessWall,
            thicknessFloor: originalRef.current.thicknessFloor,
            wallHeight: parser.wallHeight + 1
        });
        setBaseline({
            tilemap: parser.model,
            doorX: originalRef.current.entryPoint[0],
            doorY: originalRef.current.entryPoint[1],
            doorDir: originalRef.current.entryPointDir,
            thicknessWall: originalRef.current.thicknessWall,
            thicknessFloor: originalRef.current.thicknessFloor,
            wallHeight: parser.wallHeight + 1
        });
    });

    useMessageEvent<RoomVisualizationSettingsEvent>(RoomVisualizationSettingsEvent, (event) => {
        if (isExternal) return;
        const parser = event.getParser();
        const wall = clampThickness(convertSettingToNumber(parser.thicknessWall));
        const floor = clampThickness(convertSettingToNumber(parser.thicknessFloor));
        originalRef.current = {
            tilemap: originalRef.current?.tilemap ?? '',
            entryPoint: originalRef.current?.entryPoint ?? [0, 0],
            entryPointDir: originalRef.current?.entryPointDir ?? 2,
            thicknessWall: wall,
            thicknessFloor: floor,
            wallHeight: originalRef.current?.wallHeight ?? -1
        };
        dispatch({ type: 'SET_THICKNESS', wall, floor, source: 'remote' });
        mergeBaseline({ thicknessWall: wall, thicknessFloor: floor });
    });

    useEffect(() => {
        if (!isVisible) return;
        const handler = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
            const key = e.key.toLowerCase();
            if (key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            } else if ((key === 'z' && e.shiftKey) || key === 'y') {
                e.preventDefault();
                redo();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isVisible, undo, redo]);

    useEffect(() => {
        if (isExternal) return;
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');
                if (parts.length < 2) return;
                switch (parts[1]) {
                    case 'show':
                        setRoomVisible(true);
                        return;
                    case 'hide':
                        setRoomVisible(false);
                        return;
                    case 'toggle':
                        setRoomVisible((v) => !v);
                        return;
                }
            },
            eventUrlPrefix: 'floor-editor/'
        };
        AddLinkEventTracker(linkTracker);
        return () => RemoveLinkEventTracker(linkTracker);
    }, [isExternal]);

    const onWallHeightChange = (value: number) => {
        if (isNaN(value) || value <= 0) value = MIN_WALL_HEIGHT;
        if (value > MAX_WALL_HEIGHT) value = MAX_WALL_HEIGHT;
        dispatch({ type: 'SET_WALL_HEIGHT', value, source: 'local' });
    };

    const saveFloorChanges = () => {
        if (externalSession) {
            externalSession.onSave(serializeTilemap(state.tiles));
            externalSession.onClose();
            return;
        }

        SendMessageComposer(
            new UpdateFloorPropertiesMessageComposer(
                serializeTilemap(state.tiles),
                state.door.x,
                state.door.y,
                state.door.dir,
                convertNumbersForSaving(state.thickness.wall),
                convertNumbersForSaving(state.thickness.floor),
                state.wallHeight - 1,
                autoPickup
            )
        );
    };

    const revertChanges = () => {
        const o = originalRef.current;
        if (!o) return;
        loadFromServer(o);
        if (!isExternal && liveSync) revertLivePreview();
    };

    const closeEditor = () => {
        setImportExportVisible(false);
        if (externalSession) externalSession.onClose();
        else setRoomVisible(false);
    };

    return (
        <>
            {isVisible && (
                <OctaneCardView uniqueKey="floorpan-editor" className="w-[820px] h-[620px]" theme="primary-slim">
                    <OctaneCardHeaderView headerText={externalSession?.title ?? LocalizeText('floor.plan.editor.title')} onCloseClick={closeEditor} />
                    <OctaneCardContentView overflow="hidden" className="flex flex-col gap-2">
                        <FloorplanToolbar
                            state={state}
                            dispatch={dispatch}
                            canUndo={canUndo}
                            canRedo={canRedo}
                            onUndo={undo}
                            onRedo={redo}
                            panMode={panMode}
                            setPanMode={setPanMode}
                            includeDoor={!isExternal}
                        />
                        {!isExternal && <FloorplanOptionsPanel state={state} dispatch={dispatch} />}
                        <Flex gap={2} className="flex-1 min-h-0">
                            <FloorplanHeightPicker selectedH={state.brush.h} onSelect={(h) => dispatch({ type: 'BRUSH_SET', h })} />
                            <FloorplanCanvasSVG state={state} dispatch={dispatch} panMode={panMode} />
                        </Flex>
                        <Flex gap={3} alignItems="center" className="px-1">
                            {!isExternal && <Flex gap={1} alignItems="center">
                                <Text bold small className="text-zinc-700">
                                    {LocalizeText('floor.editor.wall.height')}
                                </Text>
                                <FaCaretLeft className="cursor-pointer fa-icon text-zinc-600" onClick={() => onWallHeightChange(state.wallHeight - 1)} />
                                <input
                                    type="number"
                                    className="form-control form-control-sm w-[49px] text-center"
                                    value={state.wallHeight}
                                    onChange={(e) => onWallHeightChange(e.target.valueAsNumber)}
                                />
                                <FaCaretRight className="cursor-pointer fa-icon text-zinc-600" onClick={() => onWallHeightChange(state.wallHeight + 1)} />
                            </Flex>}
                            <Text bold small className="text-zinc-700">
                                Area: <span className="tabular-nums">{area.total}</span> ({area.walkable} tiles)
                            </Text>
                            {!isExternal && <Flex
                                alignItems="center"
                                gap={1}
                                className={`ml-auto border rounded px-2 py-1 cursor-pointer select-none ${autoPickup ? 'bg-amber-500/15 border-amber-500 text-amber-700' : 'border-zinc-400 text-zinc-600'}`}
                                onClick={() => setAutoPickup((v) => !v)}
                                title="On save: pick up furniture blocking the new floor plan and return it to its owner's inventory"
                            >
                                <FaBoxOpen className={autoPickup ? 'text-amber-600' : 'text-zinc-500'} />
                                <Text bold small>
                                    {autoPickup ? 'Pick up blocking furni ON' : 'Pick up blocking furni OFF'}
                                </Text>
                            </Flex>}
                            {!isExternal && <Flex
                                alignItems="center"
                                gap={1}
                                className={`border rounded px-2 py-1 cursor-pointer select-none ${liveSync ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700' : 'border-zinc-400 text-zinc-600'}`}
                                onClick={() => setLiveSync((v) => !v)}
                                title="Local in-room preview while drawing (does not save to server)"
                            >
                                <FaBolt className={liveSync ? 'text-emerald-600' : 'text-zinc-500'} />
                                <Text bold small>
                                    {liveSync ? 'Live preview ON' : 'Live preview OFF'}
                                </Text>
                            </Flex>}
                        </Flex>
                        <Flex justifyContent="between">
                            <Button variant="danger" onClick={revertChanges}>
                                {LocalizeText('floor.plan.editor.reload')}
                            </Button>
                            <ButtonGroup>
                                <Button onClick={() => setImportExportVisible(true)}>{LocalizeText('floor.plan.editor.import.export')}</Button>
                                <Button onClick={saveFloorChanges}>{LocalizeText('floor.plan.editor.save')}</Button>
                            </ButtonGroup>
                        </Flex>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}
            {importExportVisible && (
                <FloorplanImportExport
                    state={state}
                    dispatch={dispatch}
                    onClose={() => setImportExportVisible(false)}
                    onSaveFromText={(raw) => {
                        if (externalSession) {
                            externalSession.onSave(raw);
                            setImportExportVisible(false);
                            externalSession.onClose();
                            return;
                        }
                        SendMessageComposer(
                            new UpdateFloorPropertiesMessageComposer(
                                raw,
                                state.door.x,
                                state.door.y,
                                state.door.dir,
                                convertNumbersForSaving(state.thickness.wall),
                                convertNumbersForSaving(state.thickness.floor),
                                state.wallHeight - 1,
                                autoPickup
                            )
                        );
                    }}
                    onRevertText={() => originalRef.current?.tilemap ?? serializeTilemap(state.tiles)}
                />
            )}
        </>
    );
};
