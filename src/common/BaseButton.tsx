import { Button } from '@base-ui/react/button';
import { ComponentProps } from 'react';
import { nativeTextChildren } from './native-text/nativeTextChildren';

/**
 * Base UI button: still a native `<button>`, and it sets `type="button"` unless a
 * `type` is passed (use `type="submit"` for form submit buttons). Use it instead of a raw `<button>`.
 * A caption that is only text is drawn by AIR's native text renderer (see nativeTextChildren).
 */
export const BaseButton = ({ children, ...props }: ComponentProps<typeof Button>) => (
    <Button {...props}>{nativeTextChildren(children, `${typeof props.className === 'string' ? props.className : ''}|${props.disabled ?? ''}`)}</Button>
);
