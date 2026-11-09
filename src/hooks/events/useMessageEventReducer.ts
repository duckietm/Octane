import { GetCommunication, IMessageEvent, MessageEvent } from '@octane/renderer';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

/**
 * Reducer companion of useMessageEventState for the server message
 * channel. Accepts either a single event type or an array of event types
 * that all collapse into the same state slice — typical for streams where
 * different composers update the same shape (e.g. furniture list +
 * add/update + remove all maintain one GroupItem[]).
 *
 *   const groupItems = useMessageEventReducer<GroupItem[], A | B | C>(
 *       [ParserA, ParserB, ParserC],
 *       (state, event) => {
 *           if (event instanceof ParserA) return applyA(state, event);
 *           if (event instanceof ParserB) return applyB(state, event);
 *           return state;
 *       },
 *       []
 *   );
 *
 * Closure stability via reducerRef refreshed in commit phase.
 */
export const useMessageEventReducer = <S, T extends IMessageEvent>(
    eventType: typeof MessageEvent | (typeof MessageEvent)[],
    reducer: (state: S, event: T) => S,
    initial: S | (() => S)
): S => {
    const [value, setValue] = useState<S>(initial);
    const reducerRef = useRef(reducer);

    useLayoutEffect(() => {
        reducerRef.current = reducer;
    });

    const handler = useCallback((event: T) => {
        setValue((prev) => reducerRef.current(prev, event));
    }, []);

    const types = useMemo(() => (Array.isArray(eventType) ? eventType : [eventType]), [eventType]);

    useEffect(() => {
        const communication = GetCommunication();

        const registered = types.map((t) => {
            //@ts-ignore
            const event = new t(handler);

            communication.registerMessageEvent(event);

            return event;
        });

        return () => {
            for (const event of registered) communication.removeMessageEvent(event);
        };
    }, [types, handler]);

    return value;
};
