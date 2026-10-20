import { GetCommunication, IMessageEvent, MessageEvent } from '@octane/renderer';
import { useEffect, useLayoutEffect, useRef } from 'react';

type MessageEventConstructor<T extends IMessageEvent> = new (callBack: (event: T) => void) => IMessageEvent;

/**
 * The listener is registered once per event type: the handler is read through a
 * ref, so a handler that changes on every render (an inline closure over state)
 * no longer removes and adds the listener each time.
 */
export const useMessageEvent = <T extends IMessageEvent>(eventType: typeof MessageEvent, handler: (event: T) => void) => {
    const handlerRef = useRef(handler);

    useLayoutEffect(() => {
        handlerRef.current = handler;
    });

    useEffect(() => {
        const event = new (eventType as unknown as MessageEventConstructor<T>)((incoming) => handlerRef.current(incoming));

        GetCommunication().registerMessageEvent(event);

        return () => GetCommunication().removeMessageEvent(event);
    }, [eventType]);
};
