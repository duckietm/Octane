import { FC, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HELP_BUBBLE_ANCHORS, IHelpBubbleRect, localizeWithFallback, placeHelpBubble } from '../../api';
import { BaseButton } from '../../common/BaseButton';
import { useHelpBubbles } from '../../hooks';

/** UiHelpBubble: the bubble is 180 px wide; its height follows the text. */
const BUBBLE_WIDTH = 180;
/** How long an element may take to show up (toolbar animations, a room loading) before it is skipped. */
const ANCHOR_WAIT_MS = 3000;
const ANCHOR_POLL_MS = 250;

const findAnchor = (name: string): HTMLElement => {
    for (const selector of HELP_BUBBLE_ANCHORS[name] ?? []) {
        let elements: NodeListOf<HTMLElement>;

        try {
            elements = document.querySelectorAll<HTMLElement>(selector);
        } catch {
            continue;
        }

        for (const element of Array.from(elements)) {
            const rect = element.getBoundingClientRect();

            if (rect.width > 0 && rect.height > 0) return element;
        }
    }

    return null;
};

const toRect = (element: HTMLElement): IHelpBubbleRect => {
    const rect = element.getBoundingClientRect();

    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
};

/**
 * Official UiHelpBubblesWidget (`ui_help_bubble` + `ui_help_modal`): a pointer bubble next to the
 * element a new user is shown, over a dimmed desktop with a hole at that element. A click on the
 * element, or OK, moves on to the next bubble.
 */
export const UiHelpBubblesView: FC = () => {
    const { current, isLast, closeBubble, skipBubble } = useHelpBubbles();
    const [anchor, setAnchor] = useState<HTMLElement>(null);
    const [rect, setRect] = useState<IHelpBubbleRect>(null);
    const [bubbleHeight, setBubbleHeight] = useState(90);
    const bubbleRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef(closeBubble);
    const skipRef = useRef(skipBubble);

    closeRef.current = closeBubble;
    skipRef.current = skipBubble;

    // Find the element, then follow it while it moves (toolbar slides, window resizes).
    useEffect(() => {
        setAnchor(null);
        setRect(null);

        if (!current) return;

        const startedAt = Date.now();
        let found: HTMLElement = null;

        const poll = () => {
            if (!found || !found.isConnected) found = findAnchor(current.name);

            if (found) {
                setAnchor(found);
                setRect(toRect(found));
                return;
            }

            if (Date.now() - startedAt >= ANCHOR_WAIT_MS) skipRef.current();
        };

        poll();

        const interval = window.setInterval(poll, ANCHOR_POLL_MS);

        return () => window.clearInterval(interval);
    }, [current]);

    // _r72b7b7b15a8834: a click on the element itself closes the bubble too.
    useEffect(() => {
        if (!anchor) return;

        const onClick = () => closeRef.current();

        anchor.addEventListener('click', onClick, true);

        return () => anchor.removeEventListener('click', onClick, true);
    }, [anchor]);

    useEffect(() => {
        if (bubbleRef.current) setBubbleHeight(bubbleRef.current.offsetHeight);
    });

    if (!current || !rect) return null;

    const placement = placeHelpBubble(rect, BUBBLE_WIDTH, bubbleHeight, window.innerWidth);
    const pad = 4;
    const hole = { left: rect.x - pad, top: rect.y - pad, right: rect.x + rect.width + pad, bottom: rect.y + rect.height + pad };

    return createPortal(
        <div className="octane-help-bubbles">
            {/* ui_help_modal: the desktop is dimmed around the element, which stays clickable. */}
            <div className="octane-help-bubbles__dim" style={{ left: 0, top: 0, right: 0, height: Math.max(0, hole.top) }} />
            <div className="octane-help-bubbles__dim" style={{ left: 0, top: hole.bottom, right: 0, bottom: 0 }} />
            <div className="octane-help-bubbles__dim" style={{ left: 0, top: hole.top, width: Math.max(0, hole.left), height: hole.bottom - hole.top }} />
            <div className="octane-help-bubbles__dim" style={{ left: hole.right, top: hole.top, right: 0, height: hole.bottom - hole.top }} />
            <div
                ref={bubbleRef}
                className="octane-help-bubble"
                data-direction={placement.direction}
                style={{ left: placement.x, top: placement.y, width: BUBBLE_WIDTH, ['--arrow-x' as string]: `${placement.arrowX}px` }}
            >
                <div className="octane-help-bubble__text">{current.text}</div>
                <BaseButton className="octane-help-bubble__ok" type="button" onClick={closeBubble}>
                    {isLast ? localizeWithFallback('alert.close.button', 'Close') : 'OK'}
                </BaseButton>
            </div>
        </div>,
        document.body
    );
};
