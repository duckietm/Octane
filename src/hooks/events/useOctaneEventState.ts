import { OctaneEvent } from '@octane/renderer';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useOctaneEvent } from './useOctaneEvent';

/**
 * Subscribe to a Octane renderer event and expose the latest derived value
 * as React state. Replaces the boilerplate pattern:
 *
 *   const [foo, setFoo] = useState(initial);
 *   useOctaneEvent(EVENT, e => setFoo(selector(e)));
 *
 * with:
 *
 *   const foo = useOctaneEventState(EVENT, selector, initial);
 *
 * The selector closure is captured in a ref refreshed in commit, so
 * a new selector identity per render does not re-subscribe the listener.
 */
export const useOctaneEventState = <T extends OctaneEvent, S>(
    type: string | string[],
    selector: (event: T) => S,
    initial: S | (() => S),
    enabled: boolean = true
): S => {
    const [value, setValue] = useState<S>(initial);
    const selectorRef = useRef(selector);

    useLayoutEffect(() => {
        selectorRef.current = selector;
    });

    const handler = useCallback((event: T) => {
        setValue(selectorRef.current(event));
    }, []);

    useOctaneEvent<T>(type, handler, enabled);

    return value;
};
