import {
    IWiredVariableDiffEntry,
    RoomSessionEvent,
    WiredAllVariablesDiffEvent,
    WiredAllVariablesHashEvent,
    WiredAllVariablesRequestComposer,
    WiredVariableHashesComposer
} from '@octane/renderer';
import { useCallback, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { SendMessageComposer } from '../../api';
import { applyWiredVariableCatalogDiff, wiredVariableCatalogHashes } from '../../api/wired/WiredVariableCatalog';
import { useMessageEvent, useOctaneEvent } from '../events';

/** AIR WiredVariablesSynchronizer: a catalogue asked for less than this long ago is not asked for again. */
export const WIRED_VARIABLE_CATALOG_CACHE_MS = 800;
/** A request the server never answered (no right to inspect) is given up after this long. */
export const WIRED_VARIABLE_CATALOG_TIMEOUT_MS = 4000;

type Phase = 'idle' | 'hash' | 'diff';

const EMPTY_CATALOG: ReadonlyMap<string, IWiredVariableDiffEntry> = new Map();

/**
 * The room's wired variable catalogue, kept in sync the official way: ask for the hash of the whole set, and when
 * it differs from the one held, send the per-variable hashes and apply the diff chunks the server answers with.
 * The catalogue is published once the last chunk is in.
 */
export const useWiredVariableCatalogStore = () => {
    const [catalog, setCatalog] = useState<ReadonlyMap<string, IWiredVariableDiffEntry>>(EMPTY_CATALOG);
    const [ready, setReady] = useState(false);
    const catalogRef = useRef<ReadonlyMap<string, IWiredVariableDiffEntry>>(EMPTY_CATALOG);
    const pendingRef = useRef<ReadonlyMap<string, IWiredVariableDiffEntry>>(EMPTY_CATALOG);
    const hashRef = useRef<number>(null);
    const phaseRef = useRef<Phase>('idle');
    const requestedAtRef = useRef<number>(null);

    const reset = useCallback(() => {
        catalogRef.current = EMPTY_CATALOG;
        pendingRef.current = EMPTY_CATALOG;
        hashRef.current = null;
        phaseRef.current = 'idle';
        requestedAtRef.current = null;
        setCatalog(EMPTY_CATALOG);
        setReady(false);
    }, []);

    const refresh = useCallback(() => {
        const now = Date.now();
        const since = requestedAtRef.current === null ? Infinity : now - requestedAtRef.current;

        if (phaseRef.current !== 'idle' && since < WIRED_VARIABLE_CATALOG_TIMEOUT_MS) return;
        if (phaseRef.current === 'idle' && since < WIRED_VARIABLE_CATALOG_CACHE_MS) return;

        phaseRef.current = 'hash';
        requestedAtRef.current = now;
        SendMessageComposer(new WiredAllVariablesRequestComposer());
    }, []);

    useMessageEvent<WiredAllVariablesHashEvent>(WiredAllVariablesHashEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        if (hashRef.current !== null && parser.allVariablesHash === hashRef.current) {
            phaseRef.current = 'idle';
            setReady(true);
            return;
        }

        phaseRef.current = 'diff';
        pendingRef.current = catalogRef.current;
        SendMessageComposer(new WiredVariableHashesComposer(wiredVariableCatalogHashes(catalogRef.current)));
    });

    useMessageEvent<WiredAllVariablesDiffEvent>(WiredAllVariablesDiffEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        pendingRef.current = applyWiredVariableCatalogDiff(pendingRef.current, parser.removedVariables, parser.addedOrUpdated);

        if (!parser.isLastChunk) return;

        catalogRef.current = pendingRef.current;
        hashRef.current = parser.allVariablesHash;
        phaseRef.current = 'idle';
        setCatalog(catalogRef.current);
        setReady(true);
    });

    // A catalogue belongs to its room.
    useOctaneEvent<RoomSessionEvent>([RoomSessionEvent.CREATED, RoomSessionEvent.ENDED], reset);

    return { catalog, ready, refresh };
};

export const useWiredVariableCatalog = (): { catalog: ReadonlyMap<string, IWiredVariableDiffEntry>; ready: boolean; refresh: () => void } =>
    useSharedHook(useWiredVariableCatalogStore);

registerSharedHook(useWiredVariableCatalogStore);
