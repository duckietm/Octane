import { ReactNode } from 'react';
import { NativeLabel } from './NativeLabel';
import { isNativeTextEnabled } from './nativeTextEnabled';

const isEmpty = (part: unknown) => part === null || part === undefined || part === false || part === true;

/**
 * Children that are only text (strings and numbers, with the false / null of conditional parts) become one NativeLabel; anything
 * with elements in it is returned as it is, so mixed inline markup keeps the browser's layout.
 */
export const nativeTextChildren = (children: ReactNode, stateKey?: unknown): ReactNode => {
    if (!isNativeTextEnabled()) return children;

    const parts = Array.isArray(children) ? children : [children];

    if (!parts.every((part) => isEmpty(part) || typeof part === 'string' || typeof part === 'number')) return children;

    const text = parts.filter((part) => !isEmpty(part)).join('');

    if (!text.trim()) return children;

    return <NativeLabel stateKey={stateKey} text={text} />;
};
