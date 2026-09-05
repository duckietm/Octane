import {
    ISoundboardCatalogSound,
    SoundboardCatalogEvent,
    SoundboardCatalogReorderComposer,
    SoundboardCatalogRequestComposer,
    SoundboardCatalogResultEvent,
    SoundboardCatalogUpsertComposer
} from '@octane/renderer';
import { useCallback, useRef, useState } from 'react';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
import { SoundboardCatalogDraft } from './soundboardCatalogState';

export interface SoundboardCatalogOperationResult {
    operation: number;
    resultCode: number;
    soundId: number;
}

export const useSoundboardCatalog = () => {
    const [sounds, setSounds] = useState<ISoundboardCatalogSound[]>([]);
    const [lastResult, setLastResult] = useState<SoundboardCatalogOperationResult | null>(null);
    const [pendingOperation, setPendingOperation] = useState<number | null>(null);
    const pendingOperationRef = useRef<number | null>(null);

    const request = useCallback(() => {
        SendMessageComposer(new SoundboardCatalogRequestComposer());
    }, []);

    const upsert = useCallback((draft: SoundboardCatalogDraft) => {
        if (pendingOperationRef.current !== null) return false;

        pendingOperationRef.current = 1;
        setPendingOperation(1);
        SendMessageComposer(new SoundboardCatalogUpsertComposer(
            draft.id,
            draft.name.trim(),
            draft.url.trim(),
            draft.minRank,
            draft.enabled,
            draft.classname?.trim().toLowerCase() ?? ''
        ));
        return true;
    }, []);

    const reorder = useCallback((orderedIds: number[]) => {
        if (pendingOperationRef.current !== null) return false;

        pendingOperationRef.current = 2;
        setPendingOperation(2);
        SendMessageComposer(new SoundboardCatalogReorderComposer(orderedIds));
        return true;
    }, []);

    const handleCatalog = useCallback((event: SoundboardCatalogEvent) => {
        setSounds(event.getParser().sounds);
    }, []);

    const handleResult = useCallback(
        (event: SoundboardCatalogResultEvent) => {
            const parser = event.getParser();
            const result = { operation: parser.operation, resultCode: parser.resultCode, soundId: parser.soundId };
            pendingOperationRef.current = null;
            setPendingOperation(null);
            setLastResult(result);

            if (result.resultCode === 0) request();
        },
        [request]
    );

    useMessageEvent<SoundboardCatalogEvent>(SoundboardCatalogEvent, handleCatalog);
    useMessageEvent<SoundboardCatalogResultEvent>(SoundboardCatalogResultEvent, handleResult);

    return { sounds, lastResult, pendingOperation, request, upsert, reorder };
};
