import { FC, useLayoutEffect, useRef, useState } from 'react';
import { NativeText, NativeTextProps } from './NativeText';

/** `rgb(r, g, b)` / `rgba(r, g, b, a)` as 0xRRGGBB; anything else (a transparent colour, an empty jsdom value) is null. */
export const parseCssTextColor = (value: string): number | null => {
    const match = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(value ?? '');

    if (!match || (match[4] !== undefined && parseFloat(match[4]) === 0)) return null;

    return (Number(match[1]) << 16) | (Number(match[2]) << 8) | Number(match[3]);
};

interface CssNativeTextProps extends Omit<NativeTextProps, 'background' | 'overrides'> {
    /** Opaque surface colour, or null (the default) for a transparent raster over a skinned or hover-dependent surface. */
    background?: number | null;
    /** The colour is re-read when this changes: pass the state the surrounding CSS colours by (active, open, ...). */
    colorKey?: unknown;
}

/**
 * NativeText in the colour the stylesheet gives its host, so the CSS keeps deciding the colour (active rows, sub rows, the Builders
 * Club tint). Until the colour is known, and wherever the native raster cannot be drawn, the host shows the plain DOM text.
 */
export const CssNativeText: FC<CssNativeTextProps> = ({ background = null, colorKey, ...props }) => {
    const hostRef = useRef<HTMLSpanElement>(null);
    const [color, setColor] = useState<number | null>(null);

    useLayoutEffect(() => {
        const host = hostRef.current;

        setColor(host ? parseCssTextColor(getComputedStyle(host).color) : null);
    }, [colorKey]);

    return (
        <span ref={hostRef} className="octane-css-native-text">
            {color === null ? props.text : <NativeText {...props} background={background} overrides={{ color }} />}
        </span>
    );
};
