import { OctaneEvent } from '@octane/renderer';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useOctaneEvent } from './useOctaneEvent';

/**
 * Reducer companion of useOctaneEventState for the cases where multiple
 * event types collapse into a single state slice. Replaces the pattern:
 *
 *   const [state, setState] = useState(initial);
 *   useOctaneEvent(EVENT_A, e => setState(prev => reduceA(prev, e)));
 *   useOctaneEvent(EVENT_B, e => setState(prev => reduceB(prev, e)));
 *
 * with:
 *
 *   const state = useOctaneEventReducer<S, A | B>(
 *       [EVENT_A, EVENT_B],
 *       (state, event) => {
 *           if (event instanceof EventA) return reduceA(state, event);
 *           if (event instanceof EventB) return reduceB(state, event);
 *           return state;
 *       },
 *       initial
 *   );
 *
 * Closure stability: the reducer ref is refreshed in commit phase, so a
 * new reducer identity per render does not force the listener to
 * re-subscribe.
 */
export const useOctaneEventReducer = <S, T extends OctaneEvent>(
    types: string | string[],
    reducer: (state: S, event: T) => S,
    initial: S | (() => S),
    enabled: boolean = true
): S => {
    const [value, setValue] = useState<S>(initial);
    const reducerRef = useRef(reducer);

    useLayoutEffect(() => {
        reducerRef.current = reducer;
    });

    const handler = useCallback((event: T) => {
        setValue((prev) => reducerRef.current(prev, event));
    }, []);

    useOctaneEvent<T>(types, handler, enabled);

    return value;
};
