import { IEventDispatcher, OctaneEvent } from '@octane/renderer';
import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Listens once per set of event types and calls the latest handler. The handler and an inline array of types are new
 * on every render, and keying the listener on them removed and added it at each render.
 */
export const useEventDispatcher = <T extends OctaneEvent>(
    type: string | string[],
    eventDispatcher: IEventDispatcher,
    handler: (event: T) => void,
    enabled: boolean = true
) => {
    const handlerRef = useRef(handler);
    const typesKey = Array.isArray(type) ? type.join('\u0000') : type;

    useLayoutEffect(() => {
        handlerRef.current = handler;
    });

    useEffect(() => {
        if (!enabled || !eventDispatcher) return;

        const types = typesKey.split('\u0000');
        const listener = (event: T) => handlerRef.current(event);

        for (const name of types) eventDispatcher.addEventListener(name, listener);

        return () => {
            for (const name of types) eventDispatcher.removeEventListener(name, listener);
        };
    }, [typesKey, eventDispatcher, enabled]);
};
