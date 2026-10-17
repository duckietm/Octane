import { CSSProperties, FC, Fragment, ReactNode, useEffect, useLayoutEffect, useRef, useState, ElementType } from 'react';
import { NativeTextStyleName } from '../../../common/native-text/NativeTextStyles';
import '../../../css/mod-tools/NativeWindow0.css';
import blueAtlas from '../../../assets/mod-tools/skins/habbo-blue-skin.png';
import borderWhiteXml from '../../../assets/mod-tools/skins/skin-border_white.xml?raw';
import buttonXml from '../../../assets/mod-tools/skins/skin-button_default.xml?raw';
import checkboxXml from '../../../assets/mod-tools/skins/skin-button_checkbox.xml?raw';
import closeXml from '../../../assets/mod-tools/skins/skin-button_close.xml?raw';
import dropmenuXml from '../../../assets/mod-tools/skins/skin-dropmenu.xml?raw';
import frameXml from '../../../assets/mod-tools/skins/skin-frame.xml?raw';
import scalerXml from '../../../assets/mod-tools/skins/skin-scaler.xml?raw';
import scrollbarXml from '../../../assets/mod-tools/skins/skin-scrollbar.xml?raw';
import scrollbar3Xml from '../../../assets/mod-tools/skins/skin-scrollbar_3.xml?raw';
import ubuntuAtlas from '../../../assets/mod-tools/skins/habbo-ubuntu-skin.png';
import tabXml from '../../../assets/mod-tools/skins/skin-button_tab.xml?raw';
import headerXml from '../../../assets/mod-tools/skins/skin-header.xml?raw';
import { NativeSkin, parseNativeSkin } from './NativeSkin';
import { NativeSkinView } from './NativeSkinView';
import { BaseButton } from '../../../common/BaseButton';
import { ListSelect } from '../../../common/ListSelect';
import { ToggleButton } from '../../../common/ToggleButton';

// Legacy window-manager style 0 (habbo_element_description_xml): blue frame 0xff418db0, white border, default button, checkbox, dropmenu, close button.
const SKINS = {
    frame: parseNativeSkin(frameXml),
    header: parseNativeSkin(headerXml),
    border: parseNativeSkin(borderWhiteXml),
    button: parseNativeSkin(buttonXml),
    checkbox: parseNativeSkin(checkboxXml),
    close: parseNativeSkin(closeXml),
    dropmenu: parseNativeSkin(dropmenuXml),
    scaler: parseNativeSkin(scalerXml),
    scrollbar: parseNativeSkin(scrollbarXml),
    scrollbar3: parseNativeSkin(scrollbar3Xml),
    tab: parseNativeSkin(tabXml)
};

// The open dropmenu list is the dropmenu frame without its arrow; a fixed (non-resizable) window draws no scaler.
const withoutEntities = (skin: NativeSkin, layoutName: string, keep: (name: string) => boolean): NativeSkin => ({
    ...skin,
    layouts: { ...skin.layouts, [layoutName]: { ...skin.layouts[layoutName], entities: skin.layouts[layoutName].entities.filter((entity) => keep(entity.name)) } }
});
const DROPMENU_LIST = withoutEntities(SKINS.dropmenu, 'dropmenu_frame', (name) => name !== 'arrow');

export const FRAME_COLOR = 0x418db0;

const rect = (x: number, y: number, width: number, height: number): CSSProperties => ({ left: x, top: y, width, height });

// the native bitmap font sets a string that starts with one of these glyphs one pixel further left than the web font does (the first glyph only; the same glyphs inside a string sit where the
// font puts them); measured on "1", "4", "no" and "yes" in the captures
const LEADING_ONE_OR_FOUR = /^[14nymr(]/;

interface Native0TextProps {
    text: string;
    x: number;
    y: number;
    width: number;
    height?: number;
    bold?: boolean;
    color?: number;
    underline?: boolean;
    wrap?: boolean;
    background?: number;
    /** Bold white letters with a glow of this opacity around them (a heading on the blue of a frame). */
    glow?: number;
    /** The field keeps its box and clips what does not fit (a non-wrapping text field of fixed width). */
    clip?: boolean;
    textStyle?: NativeTextStyleName;
    onClick?: () => void;
    style?: CSSProperties;
    onSize?: (size: { width: number; height: number }) => void;
}

/**
 * A `text` window set in Volter: the field's own 2px gutter puts the first glyph at (2, 2) and a line is 10px high, so a field is `lines * 10 + 4` high
 * (AS textHeight + 5, which `onSize` reports). The shared NativeText raster smears Volter glyphs across pixels, so the Volter web font draws the pixel glyphs.
 */
export const Native0Text: FC<Native0TextProps> = ({ text, x, y, width, height, bold, color = 0, underline, wrap, background, glow, clip, textStyle, onClick, style, onSize }) => {
    const ref = useRef<HTMLDivElement>(null);
    const Tag: ElementType = onClick ? BaseButton : 'div';
    const white = textStyle === 'frame_title';
    const lineRef = useRef<HTMLSpanElement>(null);
    const [lineStarts, setLineStarts] = useState('');
    const words = wrap ? text.split(' ') : null;

    // a wrapped text: the words that start a line are found from the layout, since each line start follows the leading-glyph rule
    useLayoutEffect(() => {
        const element = lineRef.current;

        if (!wrap || !element) return;

        const starts: number[] = [];
        let top = -1;

        element.querySelectorAll<HTMLElement>('[data-word]').forEach((word, index) => {
            if (word.offsetTop !== top) starts.push(index);

            top = word.offsetTop;
        });

        setLineStarts(starts.join(','));
    }, [text, width, wrap]);

    useEffect(() => {
        const element = ref.current;

        if (!element || !onSize || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(() => onSize({ width: element.offsetWidth, height: element.offsetHeight }));

        observer.observe(element);

        return () => observer.disconnect();
    }, [onSize]);

    return (
        <>
            {background !== undefined && (
                // drawn apart from the text: text on an opaque background is set with LCD subpixel fringes
                <div className="native0-text__background" style={{ left: x, top: y, width, height: height ?? 13, backgroundColor: `#${background.toString(16).padStart(6, '0')}` }} />
            )}
            <Tag
                ref={ref}
                className="native0-text"
                {...(onClick ? { type: 'button' } : {})}
                style={{ left: x, top: y, width: wrap || clip ? width : undefined, height: height === undefined ? undefined : height, overflow: clip ? 'hidden' : undefined, cursor: onClick ? 'pointer' : undefined, color: `#${(white ? 0xffffff : color).toString(16).padStart(6, '0')}`, ...(glow === undefined ? {} : { ['--native0-glow' as string]: glow }), ...style }}
                onClick={onClick}
            >
                <span
                    ref={lineRef}
                    className={`native0-text__line${glow === undefined ? '' : ' has-glow'}${bold || white ? ' is-bold' : ''}${underline ? ' is-underline' : ''}${wrap ? ' is-wrap' : ''}`}
                    style={!wrap && LEADING_ONE_OR_FOUR.test(text) ? { marginLeft: -1 } : undefined}
                >
                    {words
                        ? words.map((word, index) => (
                              <Fragment key={index}>
                                  {index > 0 && ' '}
                                  <span data-word style={LEADING_ONE_OR_FOUR.test(word) && (index === 0 || lineStarts.split(',').includes(`${index}`)) ? { marginLeft: -1 } : undefined}>
                                      {word}
                                  </span>
                              </Fragment>
                          ))
                        : text}
                </span>
            </Tag>
        </>
    );
};

interface Native0BorderProps {
    x: number;
    y: number;
    width: number;
    height: number;
    children?: ReactNode;
}

export const Native0Border: FC<Native0BorderProps> = ({ x, y, width, height, children }) => (
    <div className="native0-box" style={rect(x, y, width, height)}>
        <NativeSkinView atlas={blueAtlas} height={height} layout="border_white" skin={SKINS.border} width={width} />
        {children}
    </div>
);

interface Native0ButtonProps {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    enabled?: boolean;
    /** The button's own colour (RGB, multiplied over the skin like a window colour): the pink "Close as useless". */
    color?: number;
    onClick?: () => void;
    name?: string;
}

export const Native0Button: FC<Native0ButtonProps> = ({ x, y, width, height, label, enabled = true, color, onClick, name }) => {
    const [over, setOver] = useState(false);
    const [down, setDown] = useState(false);
    const state = !enabled ? 'disabled' : down ? 'pressed' : over ? 'hovering' : 'default';
    const labelRef = useRef<HTMLSpanElement>(null);
    const [labelOffset, setLabelOffset] = useState({ left: 0, top: 0 });

    // The label is centred on whole pixels (flex centring lands on half pixels and blurs the pixel glyphs): the native text field is 13px high and its first glyph row is 2px in, so a
    // 22px button sets its label one row lower than a 21px one; a label wider than the face minus 10px of padding on both sides
    // starts 10px in and runs under the right edge (the native "Send Message", "Enter room" and "Default sanction" buttons; "Chatlog" and "Edit in HK" stay centred).
    useLayoutEffect(() => {
        const element = labelRef.current;

        if (!element) return;

        const place = () => setLabelOffset({ left: element.offsetWidth > width - 20 ? 10 : Math.ceil((width - element.offsetWidth) / 2), top: Math.ceil((height - 13) / 2) + 2 });

        place();

        if (typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(place);

        observer.observe(element);

        return () => observer.disconnect();
    }, [label, width, height]);

    return (
        <BaseButton type="button"
            className="native0-box native0-button"
            data-native-name={name}
            data-native-enabled={enabled}
            style={rect(x, y, width, height)}
            onClick={enabled ? onClick : undefined}
            onPointerDown={() => enabled && setDown(true)}
            onPointerEnter={() => setOver(true)}
            onPointerLeave={() => {
                setOver(false);
                setDown(false);
            }}
            onPointerUp={() => setDown(false)}
        >
            <NativeSkinView atlas={blueAtlas} color={color} height={height} layout="button" skin={SKINS.button} state={state} width={width} />
            <div className="native0-button__label" style={{ width, height, color: enabled ? '#000' : '#808080' }}>
                <span ref={labelRef} className="native0-text__line" style={{ display: 'block', position: 'absolute', whiteSpace: 'nowrap', left: labelOffset.left + 1 + (LEADING_ONE_OR_FOUR.test(label) ? -1 : 0), top: labelOffset.top }}>
                    {label}
                </span>
            </div>
        </BaseButton>
    );
};

export const Native0Checkbox: FC<{ x: number; y: number; checked: boolean; enabled?: boolean; onToggle: () => void; name?: string }> = ({ x, y, checked, enabled = true, onToggle, name }) => (
    <ToggleButton type="button" pressed={checked} className="native0-box native0-checkbox" data-native-name={name} data-native-enabled={enabled} style={rect(x, y, 16, 16)} onClick={enabled ? onToggle : undefined}>
        <NativeSkinView atlas={blueAtlas} height={16} layout="button_checkbox" skin={SKINS.checkbox} state={checked ? 'selected' : 'default'} width={16} />
    </ToggleButton>
);

interface Native0InputProps {
    x: number;
    y: number;
    width: number;
    height: number;
    value: string;
    /** The TextField background: transparent until the field has been focused or filled, then white. */
    active: boolean;
    onChange: (value: string) => void;
    onFocus?: () => void;
    name?: string;
}

/** `input` window with border=true: a 1px black outline, Volter text inside the 2px gutter, white background once active. */
export const Native0Input: FC<Native0InputProps> = ({ x, y, width, height, value, active, onChange, onFocus, name }) => (
    <>
        {/* the white of the active field is drawn apart from its text: text on an opaque background is set with LCD subpixel fringes */}
        {active && <div className="native0-box native0-input-bg" style={rect(x + 1, y + 1, width - 2, height - 2)} />}
        <textarea
            className={`native0-input${active ? ' is-active' : ''}`}
            data-native-name={name}
            spellCheck={false}
            style={rect(x, y, width, height)}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onFocus={onFocus}
        />
    </>
);

interface Native0DropmenuProps {
    x: number;
    y: number;
    width: number;
    height: number;
    caption: string;
    items: string[];
    onSelect: (index: number) => void;
    name?: string;
}

/** dropmenu style 0: the closed menu is the dropmenu_frame skin with the caption at (10, 4); the open list is a white box over the menu (outline, 1px, then 16px rows) with a grey hover row. Opening, closing, keyboard and outside press are Base UI Select; no item is ever selected, so choosing the same row twice reports it twice (the callers use it to apply a template). */
export const Native0Dropmenu: FC<Native0DropmenuProps> = ({ x, y, width, height, caption, items, onSelect, name }) => {
    const listHeight = items.length * 16 + 7;

    return (
        <div className="native0-box native0-dropmenu" data-native-name={name} style={rect(x, y, width, height)}>
            <NativeSkinView atlas={blueAtlas} height={height} layout="dropmenu_frame" skin={SKINS.dropmenu} width={width} />
            <Native0Text text={caption} width={width - 40} x={10} y={4} />
            <ListSelect
                aria-label={caption}
                itemClassName="native0-dropmenu__item"
                options={items.map((item, index) => ({
                    value: String(index),
                    label: <Native0Text text={item} width={width - 12} x={7} y={1} />
                }))}
                popupClassName="native0-dropmenu__list"
                popupDecoration={<NativeSkinView atlas={blueAtlas} height={listHeight} layout="dropmenu_frame" skin={DROPMENU_LIST} width={width} />}
                popupStyle={{ width, height: listHeight }}
                positionerClassName="native0-dropmenu__positioner"
                renderTrigger={() => null}
                scaleWithTrigger
                sideOffset={({ anchor }) => -anchor.height}
                triggerClassName="native0-dropmenu__region"
                value="-1"
                onValueChange={(next) => onSelect(Number(next))}
            />
        </div>
    );
};

interface Native0FrameProps {
    width: number;
    height: number;
    caption: string;
    onClose: () => void;
    children?: ReactNode;
    className?: string;
    /** A resizable frame (params 98305) shows the scaler in its corner; the new size is reported while it is dragged (minimum 150 x 100). */
    onResize?: (width: number, height: number) => void;
    /** The smallest size the scaler gives the frame (150 x 100 unless the window's layout says otherwise). */
    minWidth?: number;
    minHeight?: number;
    /** Opacity of the glow around the caption letters (0.16, the native halo, unless the window says otherwise). */
    glow?: number;
}

/** Frame style 0: blue skin, header (6,6) with tiled centre and shine, centred frame_title caption, 15x15 close button; content sits at (6,25). */
export const Native0Frame: FC<Native0FrameProps> = ({ width, height, caption, onClose, children, className = '', onResize, minWidth = 150, minHeight = 100, glow }) => {
    const headerWidth = width - 12;
    const [closeState, setCloseState] = useState<'default' | 'hovering' | 'pressed'>('default');
    const captionRef = useRef<HTMLDivElement>(null);
    const [captionWidth, setCaptionWidth] = useState(0);
    // the size the parent last gave the frame (a resize it clamped shows up here after the render)
    const sizeRef = useRef({ width, height });

    useLayoutEffect(() => {
        sizeRef.current = { width, height };
    }, [width, height]);

    useEffect(() => {
        const element = captionRef.current;

        if (!element || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(() => setCaptionWidth(element.offsetWidth));

        observer.observe(element);

        return () => observer.disconnect();
    }, [caption]);

    return (
        <section aria-label={caption} className={`native0-frame ${className}`.trim()} role="dialog" style={{ width, height }}>
            <NativeSkinView atlas={blueAtlas} color={FRAME_COLOR} height={height} layout="frame" skin={SKINS.frame} width={width} />
            <div className="native0-header" style={rect(6, 6, headerWidth, 15)}>
                <NativeSkinView atlas={blueAtlas} color={FRAME_COLOR} height={15} layout="header" skin={SKINS.header} width={headerWidth} />
                <div className="native0-header__caption-bg" style={{ left: Math.floor((headerWidth - captionWidth) / 2), top: 0, width: captionWidth, height: 15 }} />
                <div ref={captionRef} className="native0-header__caption" style={{ left: Math.floor((headerWidth - captionWidth) / 2), top: 0, height: 15, ...(glow === undefined ? {} : { ['--native0-glow' as string]: glow }) }}>
                    <span className="native0-text__line is-bold">{caption}</span>
                </div>
                <BaseButton
                    aria-label="Close"
                    className="native0-close"
                    type="button"
                    style={rect(headerWidth - 15, 0, 15, 15)}
                    onClick={onClose}
                    onPointerDown={() => setCloseState('pressed')}
                    onPointerEnter={() => setCloseState('hovering')}
                    onPointerLeave={() => setCloseState('default')}
                    onPointerUp={() => setCloseState('hovering')}
                >
                    <NativeSkinView atlas={blueAtlas} height={15} fill={FRAME_COLOR} layout="button_close" skin={SKINS.close} state={closeState} width={15} />
                </BaseButton>
            </div>
            <div className="native0-client" style={{ left: 6, top: 25 }}>
                {children}
            </div>
            {onResize && (
                <div
                    className="native0-scaler"
                    style={rect(width - 15, height - 15, 15, 15)}
                    onPointerDown={(event) => {
                        // like the classic window manager the size follows the pointer by what it moved since the last event, so a size the window refused (its minimum) is not owed back when the pointer returns
                        // (the first movement after the press only starts the drag: the classic client resizes from the second one)
                        let lastX = event.clientX;
                        let lastY = event.clientY;
                        let started = false;
                        const move = (moveEvent: PointerEvent) => {
                            if (!started) {
                                started = true;
                                lastX = moveEvent.clientX;
                                lastY = moveEvent.clientY;

                                return;
                            }

                            const nextWidth = Math.max(minWidth, sizeRef.current.width + moveEvent.clientX - lastX);
                            const nextHeight = Math.max(minHeight, sizeRef.current.height + moveEvent.clientY - lastY);

                            lastX = moveEvent.clientX;
                            lastY = moveEvent.clientY;
                            sizeRef.current = { width: nextWidth, height: nextHeight };
                            onResize(nextWidth, nextHeight);
                        };
                        const up = () => {
                            window.removeEventListener('pointermove', move);
                            window.removeEventListener('pointerup', up);
                        };

                        event.preventDefault();
                        window.addEventListener('pointermove', move);
                        window.addEventListener('pointerup', up);
                    }}
                >
                    <NativeSkinView atlas={blueAtlas} color={FRAME_COLOR} height={15} layout="scaler" skin={SKINS.scaler} width={15} />
                </div>
            )}
        </section>
    );
};

interface Native0TabProps {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    selected: boolean;
    onClick: () => void;
}

/** `tab_button` of style 0: the tab skin (selected / hovering / default) with the label in Volter 9 (text style button_tab), centred in the label area inside the margins (8, 2, 8, 4). */
export const Native0Tab: FC<Native0TabProps> = ({ x, y, width, height, label, selected, onClick }) => {
    const [over, setOver] = useState(false);
    const state = selected ? 'selected' : over ? 'hovering' : 'default';
    const labelRef = useRef<HTMLSpanElement>(null);
    const [offset, setOffset] = useState({ left: 0, top: 0 });

    useLayoutEffect(() => {
        const element = labelRef.current;

        if (!element) return;

        const place = () => setOffset({ left: 8 + Math.floor((width - 16 - element.offsetWidth) / 2) + 2, top: 2 + Math.floor((height - 6 - element.offsetHeight) / 2) + 1 });

        place();

        if (typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(place);

        observer.observe(element);

        return () => observer.disconnect();
    }, [label, width, height]);

    return (
        <ToggleButton type="button" pressed={selected} className="native0-box native0-tab" style={rect(x, y, width, height)} onClick={onClick} onPointerEnter={() => setOver(true)} onPointerLeave={() => setOver(false)}>
            <NativeSkinView atlas={blueAtlas} height={height} layout="button_tab" skin={SKINS.tab} state={state} width={width} />
            <span ref={labelRef} className="native0-text__line native0-tab__label" style={offset}>
                {label}
            </span>
        </ToggleButton>
    );
};

interface Native0RowsProps {
    width: number;
    height?: number;
    /** The colour of each row, top to bottom (RGB). */
    colors: number[];
    /** One height for every row, or the height of each row. */
    rowHeight?: number;
    heights?: number[];
}

/**
 * Row backgrounds of a list drawn as one canvas: text set over opaque divs of its own layer gets LCD subpixel fringes, text over a canvas layer stays greyscale like the
 * classic client's.
 */
export const Native0Rows: FC<Native0RowsProps> = ({ width, height: fixedHeight, colors, rowHeight = 14, heights }) => {
    const height = fixedHeight ?? (heights ?? []).reduce((sum, value) => sum + value, 0);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useLayoutEffect(() => {
        const context = canvasRef.current?.getContext('2d');

        if (!context) return;

        context.clearRect(0, 0, width, height);

        let top = 0;

        colors.forEach((color, index) => {
            const rowTall = heights ? heights[index] : rowHeight;

            context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
            context.fillRect(0, top, width, rowTall);
            top += rowTall;
        });
    }, [width, height, colors, rowHeight, heights]);

    return <canvas ref={canvasRef} className="native0-rows" height={height} style={{ position: 'absolute', left: 0, top: 0 }} width={width} />;
};

interface Native0ScrollbarProps {
    x: number;
    y: number;
    height: number;
    viewHeight: number;
    contentHeight: number;
    offset: number;
    onOffset: (offset: number) => void;
    /** 0: the style 0 scrollbar (blue skin); 3: the style 3 scrollbar (Ubuntu skin, with a hover state). */
    variant?: 0 | 3;
    /** The opacity the scrollbar is drawn with over its surroundings (the style 3 scrollbar in the issue handler is 40% over the frame). */
    blend?: number;
    /** The arrow buttons stay opaque while the rest of the scrollbar is drawn at `blend` (the style 3 scrollbar of the handler's evidence list before its answer arrives). */
    arrowsOpaque?: boolean;
}

const SCROLL_LINE = 15;
const SCROLL_WHEEL = 0.75;

/**
 * The style 0 vertical scrollbar (habbo_skin_scrollbar): a 17px column with a 16px arrow button at each end, a track between them and a lift whose height is the track
 * times view / content (at least 12px). The arrows scroll 15px (repeating while held), the track a page less 16px, the wheel 75px per notch (deltaY 100).
 */
export const Native0Scrollbar: FC<Native0ScrollbarProps> = ({ x, y, height, viewHeight, contentHeight, offset, onOffset, variant = 0, blend, arrowsOpaque = false }) => {
    const [pressed, setPressed] = useState<'up' | 'down' | 'lift' | null>(null);
    const [hover, setHover] = useState<'up' | 'down' | 'lift' | null>(null);
    const skin = variant === 3 ? SKINS.scrollbar3 : SKINS.scrollbar;
    const atlas = variant === 3 ? ubuntuAtlas : blueAtlas;
    const suffix = variant === 3 ? '_3' : '';
    const stateOf = (part: 'up' | 'down' | 'lift', idle: string) => (pressed === part ? 'pressed' : variant === 3 && hover === part ? 'hovering' : idle);
    const track = height - 32;
    const range = Math.max(0, contentHeight - viewHeight);
    const liftHeight = Math.min(track, Math.max(12, Math.floor((track * viewHeight) / contentHeight)));
    const liftTop = range > 0 ? Math.round((offset / range) * (track - liftHeight)) : 0;
    const offsetRef = useRef(offset);
    const timers = useRef<{ delay: number | null; repeat: number | null }>({ delay: null, repeat: null });
    const clamp = (value: number) => Math.max(0, Math.min(range, value));

    offsetRef.current = offset;

    const stop = () => {
        window.clearTimeout(timers.current.delay);
        window.clearInterval(timers.current.repeat);
        timers.current = { delay: null, repeat: null };
        setPressed(null);
    };

    // An arrow steps once on press and, held for 400ms, keeps stepping.
    const hold = (direction: 1 | -1, which: 'up' | 'down') => {
        const step = () => onOffset(clamp(offsetRef.current + direction * SCROLL_LINE));

        setPressed(which);
        step();
        timers.current.delay = window.setTimeout(() => {
            timers.current.repeat = window.setInterval(step, 60);
        }, 400);
        window.addEventListener('pointerup', stop, { once: true });
    };

    return (
        <div className="native0-box native0-scrollbar" style={{ ...rect(x, y, 17, height), opacity: arrowsOpaque ? undefined : blend }} onWheel={(event) => onOffset(clamp(offset + event.deltaY * SCROLL_WHEEL))}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: 17, height, opacity: arrowsOpaque ? blend : undefined }}>
                <NativeSkinView atlas={atlas} height={height} layout={`scrollbar_vertical${suffix}`} skin={skin} width={17} />
            </div>
            <div className="native0-scrollbar__part" style={rect(0, 0, 17, 16)} onPointerDown={() => hold(-1, 'up')} onPointerEnter={() => setHover('up')} onPointerLeave={() => setHover(null)}>
                <NativeSkinView atlas={atlas} height={16} layout={`scrollbar_button_up${suffix}`} skin={skin} state={range === 0 ? 'disabled' : stateOf('up', 'default')} width={17} />
            </div>
            <div className="native0-scrollbar__part" style={{ ...rect(0, 16, 17, track), opacity: arrowsOpaque ? blend : undefined }} onPointerDown={(event) => {
                const bounds = event.currentTarget.getBoundingClientRect();
                const at = event.clientY - bounds.top;

                if (at < liftTop) onOffset(clamp(offset - (viewHeight - 16)));
                else if (at >= liftTop + liftHeight) onOffset(clamp(offset + (viewHeight - 16)));
            }}>
                <NativeSkinView atlas={atlas} height={track} layout={`scrollbar_track_vertical${suffix}`} skin={skin} width={17} />
                {range > 0 && (
                <div
                    className="native0-scrollbar__part"
                    style={rect(0, liftTop, 17, liftHeight)}
                    onPointerEnter={() => setHover('lift')}
                    onPointerLeave={() => setHover(null)}
                    onPointerDown={(event) => {
                        const startY = event.clientY;
                        const startOffset = offset;
                        const move = (moveEvent: PointerEvent) => onOffset(clamp(startOffset + ((moveEvent.clientY - startY) * range) / Math.max(1, track - liftHeight)));
                        const up = () => {
                            window.removeEventListener('pointermove', move);
                            window.removeEventListener('pointerup', up);
                            setPressed(null);
                        };

                        event.stopPropagation();
                        setPressed('lift');
                        window.addEventListener('pointermove', move);
                        window.addEventListener('pointerup', up);
                    }}
                >
                    <NativeSkinView atlas={atlas} height={liftHeight} layout={`scrollbar_lift_vertical${suffix}`} skin={skin} state={stateOf('lift', 'default')} width={17} />
                </div>
                )}
            </div>
            <div className="native0-scrollbar__part" style={rect(0, height - 16, 17, 16)} onPointerDown={() => hold(1, 'down')} onPointerEnter={() => setHover('down')} onPointerLeave={() => setHover(null)}>
                <NativeSkinView atlas={atlas} height={16} layout={`scrollbar_button_down${suffix}`} skin={skin} state={range === 0 ? 'disabled' : stateOf('down', 'default')} width={17} />
            </div>
        </div>
    );
};

export const NATIVE0_DROPMENU = SKINS.dropmenu;
export { blueAtlas as NATIVE0_ATLAS };
