import { GetRoomEngine, IWiredLabel, RoomObjectCategory, WiredLabelSaveTextComposer } from '@octane/renderer';
import { FC, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AddAnimationTickerCallback, GetRoomObjectBounds, GetRoomObjectScreenLocation, localizeWithFallback, SendMessageComposer } from '../../../../api';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

export interface WiredLabelBubbleViewProps {
    roomId: number;
    label: IWiredLabel;
    open: boolean;
    hovered: boolean;
    canModify: boolean;
    onClose: () => void;
}

// The official furniture_label layout: the text field grows from 100x50 up to 220x250, then
// scrolls; the bubble is never smaller than 142x80; at most 1000 characters.
const MIN_WIDTH = 100;
const MAX_WIDTH = 220;
const MIN_HEIGHT = 50;
const MAX_HEIGHT = 250;
const MAX_CHARS = 1000;
/** The bubble's 142 px minimum less its 8 + 9 px side margins. */
const MIN_FIELD_WIDTH = 142 - 8 - 9;
/** How long a hover preview stays after the mouse leaves the furni, so it can be reached and scrolled. */
const PREVIEW_LINGER_MS = 400;

/** A label colour as css. */
export const wiredLabelCss = (color: number): string => `#${ (color & 0xFFFFFF).toString(16).padStart(6, '0') }`;

/** The room's zoom as the official label scales by it: 1 at normal zoom, 0.5 zoomed out. */
const roomScale = (roomId: number): number => {
    const engine = GetRoomEngine();
    const geometry = engine?.getRoomInstanceGeometry(roomId, 1);
    const canvas = engine?.getRoomInstanceRenderingCanvas(roomId, 1);

    if (!geometry || !canvas) return 1;

    return (geometry.scale / 64) * Math.abs(canvas.scale || 1);
};

/**
 * One furniture label above its furni, as the AIR client draws it: shown faded while the mouse is
 * over the furni, fully while open (clicked) or kept open. People who may modify wired type into it
 * while it is open; the text is saved when the field loses focus or the label closes.
 */
export const WiredLabelBubbleView: FC<WiredLabelBubbleViewProps> = (props) => {
    const { roomId, label, open, hovered, canModify, onClose } = props;
    const elementRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [ text, setText ] = useState(label.text);
    const [ focused, setFocused ] = useState(false);
    const [ overBubble, setOverBubble ] = useState(false);
    const [ lingering, setLingering ] = useState(false);
    const lastSent = useRef<string>(null);

    const shown = open || label.alwaysOpen;

    // A hover preview stays a moment after the mouse leaves the furni, and as long as the mouse is
    // on the bubble, so a long label can be scrolled. It stays read-only, as in the original.
    useEffect(() => {
        if (hovered) {
            setLingering(true);
            return;
        }

        const timeout = window.setTimeout(() => setLingering(false), PREVIEW_LINGER_MS);

        return () => window.clearTimeout(timeout);
    }, [ hovered ]);

    const previewing = hovered || lingering || overBubble;
    const interactive = open || (label.alwaysOpen && canModify);
    const editable = interactive && canModify;

    // A server update replaces the text, unless this player is typing something else.
    useEffect(() => {
        if (!focused || !canModify) setText(label.text);
        lastSent.current = null;
    }, [ label.text, focused, canModify ]);

    const save = () => {
        if (!canModify) {
            setText(label.text);
            return;
        }

        if (text === label.text || text === lastSent.current) return;

        SendMessageComposer(new WiredLabelSaveTextComposer(label.furnitureId, text));
        lastSent.current = text;
    };

    // Closing the label saves what was typed, as AIR does.
    const wasOpen = useRef(open);

    useEffect(() => {
        if (wasOpen.current && !open) save();

        wasOpen.current = open;
    });

    useLayoutEffect(() => {
        const input = inputRef.current;

        if (!input) return;

        input.style.width = 'auto';
        input.style.height = 'auto';

        const measure = document.createElement('canvas').getContext('2d');

        if (measure) measure.font = getComputedStyle(input).font;

        const longest = text.split('\n').reduce((width, line) => Math.max(width, measure ? measure.measureText(line).width : line.length * 6), 0);

        // As the original sizes its field: the text width plus the field's margins and 4 px. The
        // field always spans the bubble (142 px wide at least), so a scrollbar sits on its edge.
        const textWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.ceil(longest) + 8));

        input.style.overflowY = 'hidden';
        input.style.width = `${ Math.max(MIN_FIELD_WIDTH, textWidth) }px`;

        const scrolls = input.scrollHeight > MAX_HEIGHT;

        if (scrolls) {
            input.style.overflowY = 'auto';

            const scrollbarWidth = input.offsetWidth - input.clientWidth;

            input.style.width = `${ Math.max(MIN_FIELD_WIDTH, textWidth + scrollbarWidth) }px`;
        }

        input.style.height = `${ Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, input.scrollHeight)) }px`;
    }, [ text, shown, previewing ]);

    useEffect(() => {
        const updatePosition = () => {
            const element = elementRef.current;

            if (!element) return;

            const bounds = GetRoomObjectBounds(roomId, label.furnitureId, RoomObjectCategory.FLOOR, 1);
            const location = GetRoomObjectScreenLocation(roomId, label.furnitureId, RoomObjectCategory.FLOOR, 1);

            if (!bounds || !location) {
                element.style.visibility = 'hidden';
                return;
            }

            const scale = roomScale(roomId);

            element.style.visibility = 'visible';
            element.style.left = `${ Math.round(location.x) }px`;
            element.style.top = `${ Math.round(bounds.top - 4 * scale) }px`;
            element.style.transform = `translate(-50%, -100%) scale(${ scale })`;
        };

        updatePosition();

        return AddAnimationTickerCallback(updatePosition);
    }, [ roomId, label.furnitureId ]);

    if (!shown && !previewing) return null;

    const placeholder = shown && canModify && !text.length;

    return (
        <NativeTextTree>
            <div
                ref={elementRef}
                className={`octane-wired-label${ shown ? '' : ' is-preview' }${ interactive ? ' is-interactive' : '' }`}
                style={{ visibility: 'hidden', ['--octane-wired-label-color' as string]: wiredLabelCss(label.color) }}
                data-testid="wired-label"
                onMouseEnter={() => setOverBubble(true)}
                onMouseLeave={() => setOverBubble(false)}
                onKeyDown={(event) => {
                    if (event.key === 'Escape') onClose();
                }}>
                <textarea
                    ref={inputRef}
                    className="octane-wired-label__text"
                    value={text}
                    readOnly={!editable}
                    maxLength={MAX_CHARS}
                    tabIndex={interactive ? 0 : -1}
                    spellCheck={false}
                    placeholder={placeholder ? localizeWithFallback('widget.furniture_label.placeholder', 'Write something here...') : ''}
                    onChange={(event) => setText(event.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => {
                        setFocused(false);
                        save();
                    }} />
            </div>
        </NativeTextTree>
    );
};
