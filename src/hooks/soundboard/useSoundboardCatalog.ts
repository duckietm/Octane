import {
    ISoundboardCatalogSound,
    SoundboardCatalogEvent,
    SoundboardCatalogReorderComposer,
    SoundboardCatalogRequestComposer,
    SoundboardCatalogResultEvent,
    SoundboardCatalogUpsertComposer
} from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
import { SoundboardCatalogDraft } from './soundboardCatalogState';

export interface SoundboardCatalogOperationResult {
    operation: number;
    resultCode: number;
    soundId: number;
}

// The server drops a packet that arrives too soon after the last one without answering,
// so a pending operation has to give up on its own or the panel stays locked.
export const SOUNDBOARD_CATALOG_TIMEOUT_MS = 8_000;
export const SOUNDBOARD_CATALOG_NO_ANSWER_CODE = -1;

export const useSoundboardCatalog = () => {
    const [sounds, setSounds] = useState<ISoundboardCatalogSound[]>([]);
    const [lastResult, setLastResult] = useState<SoundboardCatalogOperationResult | null>(null);
    const [pendingOperation, setPendingOperation] = useState<number | null>(null);
    const pendingOperationRef = useRef<number | null>(null);
    const timeoutRef = useRef<number | null>(null);

    const settle = useCallback((result: SoundboardCatalogOperationResult) => {
        if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);

        timeoutRef.current = null;
        pendingOperationRef.current = null;
        setPendingOperation(null);
        setLastResult(result);
    }, []);

    const begin = useCallback(
        (operation: number) => {
            pendingOperationRef.current = operation;
            setPendingOperation(operation);
            timeoutRef.current = window.setTimeout(
                () => settle({ operation, resultCode: SOUNDBOARD_CATALOG_NO_ANSWER_CODE, soundId: 0 }),
                SOUNDBOARD_CATALOG_TIMEOUT_MS
            );
        },
        [settle]
    );

    useEffect(
        () => () => {
            if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
        },
        []
    );

    const request = useCallback(() => {
        SendMessageComposer(new SoundboardCatalogRequestComposer());
    }, []);

    const upsert = useCallback((draft: SoundboardCatalogDraft) => {
        if (pendingOperationRef.current !== null) return false;

        begin(1);
        SendMessageComposer(new SoundboardCatalogUpsertComposer(
            draft.id,
            draft.name.trim(),
            draft.url.trim(),
            draft.minRank,
            draft.enabled,
            draft.classname?.trim().toLowerCase() ?? '',
            draft.cooldownSeconds
        ));
        return true;
    }, [begin]);

    const reorder = useCallback((orderedIds: number[]) => {
        if (pendingOperationRef.current !== null) return false;

        begin(2);
        SendMessageComposer(new SoundboardCatalogReorderComposer(orderedIds));
        return true;
    }, [begin]);

    const handleCatalog = useCallback((event: SoundboardCatalogEvent) => {
        setSounds(event.getParser().sounds);
    }, []);

    const handleResult = useCallback(
        (event: SoundboardCatalogResultEvent) => {
            const parser = event.getParser();
            const result = { operation: parser.operation, resultCode: parser.resultCode, soundId: parser.soundId };
            settle(result);

            if (result.resultCode === 0) request();
        },
        [request, settle]
    );

    useMessageEvent<SoundboardCatalogEvent>(SoundboardCatalogEvent, handleCatalog);
    useMessageEvent<SoundboardCatalogResultEvent>(SoundboardCatalogResultEvent, handleResult);

    return { sounds, lastResult, pendingOperation, request, upsert, reorder };
};
