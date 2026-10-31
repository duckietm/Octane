import { GetCommunication, IMessageEvent, MessageEvent } from '@octane/renderer';
import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Registers once per event type and calls the latest handler. A handler written inline is a new function on every
 * render, and keying the registration on it removed and added the listener at each render.
 */
export const useMessageEvent = <T extends IMessageEvent>(eventType: typeof MessageEvent, handler: (event: T) => void) => {
    const handlerRef = useRef(handler);

    useLayoutEffect(() => {
        handlerRef.current = handler;
    });

    useEffect(() => {
        //@ts-ignore
        const event = new eventType((received: T) => handlerRef.current(received));

        GetCommunication().registerMessageEvent(event);

        return () => GetCommunication().removeMessageEvent(event);
    }, [eventType]);
};
