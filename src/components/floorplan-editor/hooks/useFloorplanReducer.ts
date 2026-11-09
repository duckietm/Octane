import { Dispatch, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { initialState, reducer } from '../state/reducer';
import { EntryDir, FloorplanAction, FloorplanState, ThicknessLevel } from '../state/types';

export type ServerFloorSettings = {
    tilemap: string;
    entryPoint: [number, number];
    entryPointDir: number;
    thicknessWall: ThicknessLevel;
    thicknessFloor: ThicknessLevel;
    wallHeight: number;
};

type Api = {
    state: FloorplanState;
    dispatch: Dispatch<FloorplanAction>;
    loadFromServer: (s: ServerFloorSettings) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
};

const isNonHistoryAction = (action: FloorplanAction): boolean => {
    switch (action.type) {
        case 'BRUSH_SET':
        case 'SELECT_ALL':
        case 'CLEAR_SELECTION':
        case 'SELECT_RECT':
        case 'SQUARE_SELECT_TOGGLE':
        case 'SET_PICK_UP_BLOCKING':
            return true;
        default:
            return false;
    }
};

const isRemoteAction = (action: FloorplanAction): boolean => {
    if (action.type === 'APPLY_REMOTE_DIFF' || action.type === 'APPLY_REMOTE_SNAPSHOT') return true;
    return 'source' in action && action.source === 'remote';
};

const HISTORY_LIMIT = 100;

export const useFloorplanReducer = (): Api => {
    const [state, dispatch] = useReducer(reducer, initialState);

    const pastRef = useRef<FloorplanState[]>([]);
    const futureRef = useRef<FloorplanState[]>([]);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const stateRef = useRef<FloorplanState>(state);

    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    const refreshCanFlags = useCallback(() => {
        setCanUndo(pastRef.current.length > 0);
        setCanRedo(futureRef.current.length > 0);
    }, []);

    const wrappedDispatch = useCallback<Dispatch<FloorplanAction>>(
        (action) => {
            if (isNonHistoryAction(action) || isRemoteAction(action)) {
                dispatch(action);
                return;
            }

            pastRef.current.push(stateRef.current);

            if (pastRef.current.length > HISTORY_LIMIT) pastRef.current.shift();

            futureRef.current = [];

            dispatch(action);
            refreshCanFlags();
        },
        [refreshCanFlags]
    );

    const loadFromServer = useCallback(
        (s: ServerFloorSettings) => {
            pastRef.current = [];
            futureRef.current = [];
            dispatch({
                type: 'IMPORT_STRING',
                raw: s.tilemap,
                door: { x: s.entryPoint[0], y: s.entryPoint[1], dir: ((s.entryPointDir | 0) & 7) as EntryDir },
                thickness: { wall: s.thicknessWall, floor: s.thicknessFloor },
                wallHeight: s.wallHeight,
                source: 'remote'
            });
            refreshCanFlags();
        },
        [refreshCanFlags]
    );

    const undo = useCallback(() => {
        const previous = pastRef.current.pop();

        if (!previous) return;

        futureRef.current.push(stateRef.current);
        dispatch({
            type: 'APPLY_REMOTE_SNAPSHOT',
            raw: serializeTilesForSnapshot(previous.tiles),
            door: previous.door,
            thickness: previous.thickness,
            wallHeight: previous.wallHeight,
            seq: previous.seq
        });
        refreshCanFlags();
    }, [refreshCanFlags]);

    const redo = useCallback(() => {
        const next = futureRef.current.pop();

        if (!next) return;

        pastRef.current.push(stateRef.current);
        dispatch({
            type: 'APPLY_REMOTE_SNAPSHOT',
            raw: serializeTilesForSnapshot(next.tiles),
            door: next.door,
            thickness: next.thickness,
            wallHeight: next.wallHeight,
            seq: next.seq
        });
        refreshCanFlags();
    }, [refreshCanFlags]);

    return useMemo(
        () => ({
            state,
            dispatch: wrappedDispatch,
            loadFromServer,
            undo,
            redo,
            canUndo,
            canRedo
        }),
        [state, wrappedDispatch, loadFromServer, undo, redo, canUndo, canRedo]
    );
};

const serializeTilesForSnapshot = (tiles: { h: number; blocked: boolean }[][]): string => {
    if (!tiles || tiles.length === 0) return '';
    const scheme = 'x0123456789abcdefghijklmnopq';
    return tiles
        .map((row) =>
            row
                .map((tile) => {
                    if (tile.blocked) return 'x';
                    const h = Number.isFinite(tile.h) ? Math.max(0, Math.min(scheme.length - 2, tile.h)) : 0;
                    return scheme.charAt(h + 1);
                })
                .join('')
        )
        .join('\r');
};
