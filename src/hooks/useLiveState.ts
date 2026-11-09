import { Dispatch, RefObject, SetStateAction, useCallback, useRef, useState } from 'react';

export const useLiveState = <T>(initialValue: T): [T, Dispatch<SetStateAction<T>>, RefObject<T>] => {
    const [value, setValue] = useState<T>(initialValue);
    const liveValue = useRef<T>(initialValue);

    const setLiveValue = useCallback((next: SetStateAction<T>) => {
        liveValue.current = typeof next === 'function' ? (next as (previous: T) => T)(liveValue.current) : next;

        setValue(liveValue.current);
    }, []);

    return [value, setLiveValue, liveValue];
};
