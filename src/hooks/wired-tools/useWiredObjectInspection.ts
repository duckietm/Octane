import { WiredGetVariablesForObjectComposer, WiredVariablesForObjectEvent } from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    isWiredObjectInspectionFor,
    SendMessageComposer,
    WIRED_OBJECT_INSPECTION_POLL_MS,
    WiredObjectInspectionData,
    WiredObjectInspectionRequest
} from '../../api';
import { useMessageEvent } from '../events';

export interface UseWiredObjectInspectionOptions {
    /** The inspection tab is open (AIR only polls while the tab is being viewed). */
    active: boolean;
    /** The object the tab looks at, or null when there is nothing to read. */
    request: WiredObjectInspectionRequest | null;
}

/**
 * The inspection tab's read of one object's variables, as AIR's `WiredMenuInspectionTab`: a request as
 * soon as an object is inspected (or the global type is picked), a re-read every 500 ms while the tab
 * is open, and only replies about the inspected object are kept.
 */
export const useWiredObjectInspection = ({ active, request }: UseWiredObjectInspectionOptions) => {
    const [data, setData] = useState<WiredObjectInspectionData | null>(null);
    const requestRef = useRef<WiredObjectInspectionRequest | null>(request);
    const type = request?.type ?? null;
    const objectId = request?.objectId ?? null;

    requestRef.current = request;

    const send = useCallback(() => {
        const current = requestRef.current;

        if (!current) return;

        SendMessageComposer(new WiredGetVariablesForObjectComposer(current.type, current.objectId));
    }, []);

    // Another object: the old values are not its values.
    useEffect(() => {
        setData((previousValue) => (isWiredObjectInspectionFor(previousValue, requestRef.current) ? previousValue : null));
    }, [type, objectId]);

    useEffect(() => {
        if (!active || type === null) return;

        send();

        const interval = window.setInterval(() => {
            if (!document.hidden) send();
        }, WIRED_OBJECT_INSPECTION_POLL_MS);

        return () => window.clearInterval(interval);
    }, [active, type, objectId, send]);

    useMessageEvent<WiredVariablesForObjectEvent>(WiredVariablesForObjectEvent, (event) => {
        const parser = event.getParser();
        const next: WiredObjectInspectionData = {
            type: parser.type,
            objectId: parser.objectId,
            userIndex: parser.userIndex,
            values: new Map(parser.values),
            configuredInWireds: [...parser.configuredInWireds]
        };

        if (!isWiredObjectInspectionFor(next, requestRef.current)) return;

        setData(next);
    });

    return { data: isWiredObjectInspectionFor(data, request) ? data : null, refresh: send };
};
