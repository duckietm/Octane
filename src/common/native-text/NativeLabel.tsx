import { CSSProperties, DetailedHTMLProps, FC, HTMLAttributes, memo, useLayoutEffect, useRef, useState } from 'react';
import { fitNativeText } from './fitNativeText';
import { loadNativeFont, measureNativeText, peekNativeFont } from './NativeFont';
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
    /** A wrapped label: the content width of its parent's container when it was laid out (see the resize watch). */
    outerWidth?: number;
    /** One line in a box that asks for `text-overflow: ellipsis`: shortened when the raster overflows it. */
    ellipsisBox?: boolean;
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
        const parentCss = host.parentElement ? getComputedStyle(host.parentElement) : null;
        const ellipsisBox =
            lines === 1 && !!parentCss && parentCss.textOverflow === 'ellipsis' && parentCss.overflowX !== 'visible' && !parentCss.display.startsWith('inline');

        setMeasurement({
            key,
            font,
            lines,
            maxWidth: lines > 1 && font?.wrap && host.parentElement ? contentWidth(host.parentElement) + 4 : undefined,
            outerWidth: lines > 1 && host.parentElement?.parentElement ? contentWidth(host.parentElement.parentElement) : undefined,
            lineHeight: Number.isFinite(lineHeight) ? lineHeight : undefined,
            ellipsisBox,
            align: lines > 1 ? ALIGN[css.textAlign] : undefined
        });
    }, [key, measurement?.key]);

    // A wrapped label follows its container's width: when that really changes, the browser lays the text out again. Changes up to a
    // scrollbar's width are left alone: the raster's own height can show or hide a scrollbar, and measuring again on that would
    // swap browser text and raster back and forth for ever.
    const wrapWidth = current?.maxWidth === undefined ? undefined : current.maxWidth - 4;
    const [clip, setClip] = useState<{ key: string; width?: number } | null>(null);
    const currentClip = clip?.key === key ? clip : null;
    const watchedWidth = wrapWidth ?? currentClip?.width;
    const outerWidth = wrapWidth === undefined ? undefined : current?.outerWidth;

    // The parent of a wrapped label can be sized by the label itself (a flex item, an inline-block): once the raster holds the wrapped
    // lines it keeps that width when the window around it widens (a window opening narrow, then laid out). The parent's container is
    // watched too, so the label is laid out again when the room it may take really changes.
    useLayoutEffect(() => {
        const parent = hostRef.current?.parentElement;
        const outer = parent?.parentElement;

        if (watchedWidth === undefined || !parent || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(() => {
            const parentMoved = Math.abs(contentWidth(parent) - watchedWidth) > SCROLLBAR_SLACK;
            const outerMoved = outerWidth !== undefined && !!outer && Math.abs(contentWidth(outer) - outerWidth) > SCROLLBAR_SLACK;

            if (!parentMoved && !outerMoved) return;

            observer.disconnect();
            setResizeTick((tick) => tick + 1);
        });

        observer.observe(parent);

        if (outerWidth !== undefined && outer) observer.observe(outer);

        return () => observer.disconnect();
    }, [watchedWidth, outerWidth]);

    // A box that asks for dots is checked with the raster in it: one sized to its text (a tab, a title) grows with the raster and never
    // overflows; a fixed one (a dropdown value) does, and the label is then shortened to it. That needs the font's metrics: until it has
    // loaded the label shows in full, then it is measured again.
    const ellipsisStyle = current?.ellipsisBox ? current.font?.style : undefined;
    const ellipsisFont = ellipsisStyle ? peekNativeFont(ellipsisStyle) : null;

    useLayoutEffect(() => {
        if (!ellipsisStyle) return;

        if (!ellipsisFont) {
            let disposed = false;

            loadNativeFont(ellipsisStyle)
                .then(() => !disposed && setResizeTick((tick) => tick + 1))
                .catch(() => undefined);

            return () => {
                disposed = true;
            };
        }

        const parent = hostRef.current?.parentElement;
        const raster = hostRef.current?.firstElementChild;

        if (currentClip || !parent || !raster) return;

        // The raster is drawn in a render of its own (until then NativeText holds a browser-text placeholder): the check waits for it.
        // Resize and mutation callbacks run before the frame is painted, so the full-length raster is never seen.
        const check = () => {
            if (raster.getAttribute('data-native-text') === 'fallback') return false;

            setClip({ key, width: parent.scrollWidth > parent.clientWidth ? contentWidth(parent) : undefined });

            return true;
        };

        if (check() || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(() => check() && disconnect());
        const mutations = new MutationObserver(() => check() && disconnect());
        const disconnect = () => {
            observer.disconnect();
            mutations.disconnect();
        };

        observer.observe(raster);
        mutations.observe(raster, { attributes: true, attributeFilter: ['data-native-text'] });

        return disconnect;
    }, [key, ellipsisStyle, ellipsisFont, currentClip]);

    if (!current?.font)
        return (
            <octane-label ref={hostRef} style={INHERIT}>
                {text}
            </octane-label>
        );

    const { font, maxWidth, lineHeight, align } = current;
    const clipWidth = currentClip?.width;
    const cased = font.transform === 'uppercase' ? text.toUpperCase() : font.transform === 'lowercase' ? text.toLowerCase() : text;
    const label =
        ellipsisFont && clipWidth !== undefined ? fitNativeText(cased, clipWidth, (part) => measureNativeText(ellipsisFont.font, part, font.style)) : cased;
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
