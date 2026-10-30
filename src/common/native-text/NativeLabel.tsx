import { CSSProperties, DetailedHTMLProps, FC, HTMLAttributes, memo, useLayoutEffect, useRef, useState } from 'react';
import { NativeText } from './NativeText';
import { isNativeTextEnabled } from './nativeTextEnabled';
import { CssNativeFont, resolveCssNativeFont } from './resolveCssNativeFont';

// The host is a custom element: a window's generic `span` / `i` rules (colours, sizes) would otherwise land on it instead of
// letting it inherit the text's own style.
declare module 'react' {
    namespace JSX {
        interface IntrinsicElements {
            'octane-label': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
        }
    }
}

interface NativeLabelProps {
    text: string;
    /** The label is measured again when this changes: pass the state the surrounding CSS styles by (class names, active, disabled). */
    stateKey?: unknown;
}

interface Measurement {
    key: string;
    font: CssNativeFont | null;
    maxWidth?: number;
    lineHeight?: number;
    lines: number;
    align?: 'left' | 'center' | 'right';
}

// The host takes the text's own style even where a sheet sets every element (`.octane-login-view * { font-family: Volter }`).
const INHERIT: CSSProperties = {
    font: 'inherit',
    color: 'inherit',
    letterSpacing: 'inherit',
    textTransform: 'inherit',
    whiteSpace: 'inherit',
    textAlign: 'inherit'
};

const ALIGN: Record<string, Measurement['align']> = { center: 'center', right: 'right', end: 'right', left: 'left', start: 'left' };

// Width changes this small are a scrollbar coming or going, not a resized container.
const SCROLLBAR_SLACK = 24;

// The width the browser wraps in: the parent's content box (the label is an inline run inside it).
const contentWidth = (element: HTMLElement) => {
    const css = getComputedStyle(element);

    return Math.max(1, Math.floor(element.clientWidth - (parseFloat(css.paddingLeft) || 0) - (parseFloat(css.paddingRight) || 0)));
};

const countLines = (host: HTMLElement) => new Set(Array.from(host.getClientRects(), (rect) => Math.round(rect.top))).size || 1;

/**
 * A text label drawn by AIR's native text renderer in the font its CSS asks for (see resolveCssNativeFont). The browser lays the
 * text out first: the font, colour, line height and, for text the browser wrapped, the width to wrap in are read from that, then the
 * raster takes its place, each line centred in the CSS line height. The raster's 2 px TextField gutter is folded away so the text stays
 * where the CSS put it. Anything the native fonts cannot draw stays browser text.
 */
const NativeLabelView: FC<NativeLabelProps> = ({ text, stateKey }) => {
    const hostRef = useRef<HTMLElement>(null);
    const [measurement, setMeasurement] = useState<Measurement | null>(null);
    const [resizeTick, setResizeTick] = useState(0);
    const key = `${text}\u0000${String(stateKey)}\u0000${resizeTick}`;
    const current = measurement?.key === key ? measurement : null;

    useLayoutEffect(() => {
        const host = hostRef.current;

        if (!host || measurement?.key === key) return;
        if (!isNativeTextEnabled()) {
            setMeasurement({ key, font: null, lines: 1 });

            return;
        }

        const css = getComputedStyle(host);
        // text-decoration is not inherited: the underline belongs to the element that holds the text.
        const decoration = host.parentElement ? getComputedStyle(host.parentElement).textDecorationLine : css.textDecorationLine;
        const font = resolveCssNativeFont({
            fontFamily: css.fontFamily,
            fontSize: css.fontSize,
            fontWeight: css.fontWeight,
            fontStyle: css.fontStyle,
            color: css.color,
            letterSpacing: css.letterSpacing,
            textTransform: css.textTransform,
            textDecorationLine: decoration,
            whiteSpace: css.whiteSpace
        });
        const lines = countLines(host);
        const lineHeight = parseFloat(css.lineHeight);

        setMeasurement({
            key,
            font,
            lines,
            maxWidth: lines > 1 && font?.wrap && host.parentElement ? contentWidth(host.parentElement) + 4 : undefined,
            lineHeight: Number.isFinite(lineHeight) ? lineHeight : undefined,
            align: lines > 1 ? ALIGN[css.textAlign] : undefined
        });
    }, [key, measurement?.key]);

    // A wrapped label follows its container's width: when that really changes, the browser lays the text out again. Changes up to a
    // scrollbar's width are left alone: the raster's own height can show or hide a scrollbar, and measuring again on that would
    // swap browser text and raster back and forth for ever.
    const wrapWidth = current?.maxWidth === undefined ? undefined : current.maxWidth - 4;

    useLayoutEffect(() => {
        const parent = hostRef.current?.parentElement;

        if (wrapWidth === undefined || !parent || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(() => {
            if (Math.abs(contentWidth(parent) - wrapWidth) <= SCROLLBAR_SLACK) return;

            observer.disconnect();
            setResizeTick((tick) => tick + 1);
        });

        observer.observe(parent);

        return () => observer.disconnect();
    }, [wrapWidth]);

    if (!current?.font)
        return (
            <octane-label ref={hostRef} style={INHERIT}>
                {text}
            </octane-label>
        );

    const { font, maxWidth, lineHeight, align } = current;
    const label = font.transform === 'uppercase' ? text.toUpperCase() : font.transform === 'lowercase' ? text.toLowerCase() : text;
    const hostStyle: CSSProperties = {
        ...INHERIT,
        display: 'inline-flex',
        alignItems: 'center',
        verticalAlign: 'top',
        maxWidth: '100%'
    };

    return (
        <octane-label ref={hostRef} className="octane-native-label" style={hostStyle}>
            <NativeText
                align={align}
                background={null}
                lineHeight={lineHeight}
                maxWidth={maxWidth}
                overrides={font.style}
                style={{ font: 'inherit', color: 'inherit' }}
                text={label}
                textStyle="u_regular"
            />
        </octane-label>
    );
};

/** Memoised: the trees around a label re-render often (a dragged window), the label only when its text or state changes. */
export const NativeLabel = memo(NativeLabelView);
