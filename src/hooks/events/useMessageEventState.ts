import { IMessageEvent, MessageEvent } from '@octane/renderer';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useMessageEvent } from './useMessageEvent';

/**
 * Subscribe to a server message event and expose the latest derived
 * value as React state. Mirror of useOctaneEventState for the Octane
 * communication channel (request/response composers, push parsers).
 *
 *   const data = useMessageEventState(SomeParser, e => e.getParser().data, null);
 */
export const useMessageEventState = <T extends IMessageEvent, S>(eventType: typeof MessageEvent, selector: (event: T) => S, initial: S | (() => S)): S => {
    const [value, setValue] = useState<S>(initial);
    const selectorRef = useRef(selector);

    useLayoutEffect(() => {
        selectorRef.current = selector;
    });

    const handler = useCallback((event: T) => {
        setValue(selectorRef.current(event));
    }, []);

    useMessageEvent<T>(eventType, handler);

    return value;
};
