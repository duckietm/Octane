import { IRareValue, RareValuesEvent, RequestRareValuesComposer } from '@octane/renderer';
import { useCallback, useEffect, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

// spriteId -> catalog value, fetched once from the server (RareValuesComposer).
// Shared across all consumers via Zustand so the request fires a single time.
// Read by both the furni infostand and the toolbar "Valore Rari" panel.
const useRareValuesState = () => {
    const [values, setValues] = useState<Map<number, IRareValue>>(() => new Map());
    const [loaded, setLoaded] = useState(false);

    useMessageEvent<RareValuesEvent>(RareValuesEvent, (event) => {
        setValues(event.getParser().values);
        setLoaded(true);
    });

    useEffect(() => {
        SendMessageComposer(new RequestRareValuesComposer());
    }, []);

    const getValue = useCallback((spriteId: number): IRareValue => values.get(spriteId) ?? null, [values]);

    return { values, loaded, getValue };
};

export const useRareValues = () => useSharedHook(useRareValuesState);

registerSharedHook(useRareValuesState);
