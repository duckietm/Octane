import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { localizeWithFallback } from '../../../../api';
import { useRoom } from '../../../../hooks';
import { classNames } from '../../../../layout';
import {
    getHelpBubbleModalStrips,
    HELP_BUBBLE_LINK_PREFIX,
    HELP_BUBBLE_WIDTH,
    HelpBubbleItem,
    HelpBubblePlacement,
    HelpBubbleRect,
    parseHelpBubbleLink,
    placeHelpBubble
} from './uiHelpBubbles.helpers';

const findAnchorElement = (name: string): HTMLElement | null => {
    if (typeof document === 'undefined') return null;

    return document.querySelector<HTMLElement>(`[data-help-bubble="${name}"]`);
};

const readRect = (element: HTMLElement): HelpBubbleRect => {
    const rect = element.getBoundingClientRect();

    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
};

/**
 * Script-driven tutorial bubbles of the official `UiHelpBubblesWidget`: `helpBubble/add/<element>/
 * <textKey>[/...]` queues bubbles anchored to toolbar, room-tool and chat-input elements (the
 * `data-help-bubble` anchors), `helpBubble/remove/<element>` drops one. One bubble shows at a time
 * behind a modal that leaves only its element clickable; the OK button, the element or the chat
 * field advance the queue, and the last bubble answers the script with `sendScriptProceed`
 * (`RWPM_ANSWER`).
 */
export const UiHelpBubblesView: FC<{}> = (props) => {
    const { roomSession = null } = useRoom();
    const [queue, setQueue] = useState<HelpBubbleItem[]>([]);
    const [anchorRect, setAnchorRect] = useState<HelpBubbleRect | null>(null);
    const [placement, setPlacement] = useState<HelpBubblePlacement | null>(null);
    const bubbleRef = useRef<HTMLDivElement>(null);
    const anchorRef = useRef<HTMLElement | null>(null);

    const current = queue[0] ?? null;
    const hasNext = queue.length > 1;

    // Official `addNextBubble`: a bubble whose element is nowhere on screen is skipped.
    const dropUnanchored = useCallback((items: HelpBubbleItem[]): HelpBubbleItem[] => {
        let index = 0;

        while (index < items.length && !findAnchorElement(items[index].name)) index++;

        return items.slice(index);
    }, []);

    const removeBubble = useCallback(
        (name: string) => {
            setQueue((prev) => {
                const index = prev.findIndex((item) => item.name === name);

                if (index === -1) return prev;

                const next = [...prev.slice(0, index), ...prev.slice(index + 1)];

                return index === 0 ? dropUnanchored(next) : next;
            });
        },
        [dropUnanchored]
    );

    const advance = useCallback(() => {
        if (!current) return;

        // Official `onLastBubble`: the last bubble answers the running script.
        if (!hasNext) roomSession?.sendScriptProceed?.();

        removeBubble(current.name);
    }, [current, hasNext, removeBubble, roomSession]);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const command = parseHelpBubbleLink(url);

                if (!command) return;

                if (command.type === 'add') {
                    setQueue((prev) => {
                        const kept = prev.filter((item) => !command.items.some((added) => added.name === item.name));
                        const merged = [...kept, ...command.items];

                        return prev.length ? merged : dropUnanchored(merged);
                    });
                    return;
                }

                removeBubble(command.name);
            },
            eventUrlPrefix: HELP_BUBBLE_LINK_PREFIX
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [dropUnanchored, removeBubble]);

    // Measure the element and the rendered bubble, then place the bubble; redo it on resize
    // (official `onDesktopResized`).
    useLayoutEffect(() => {
        if (!current) {
            anchorRef.current = null;
            setAnchorRect(null);
            setPlacement(null);
            return;
        }

        const element = findAnchorElement(current.name);

        if (!element) {
            anchorRef.current = null;
            setQueue((prev) => dropUnanchored(prev.slice(1)));
            return;
        }

        anchorRef.current = element;

        const update = () => {
            const rect = readRect(element);
            const bubbleHeight = bubbleRef.current?.offsetHeight ?? 90;

            setAnchorRect(rect);
            setPlacement(placeHelpBubble(rect, bubbleHeight, window.innerWidth));
        };

        update();
        window.addEventListener('resize', update);

        return () => window.removeEventListener('resize', update);
    }, [current, dropUnanchored]);

    // Official `setCallback` / `setChatFieldCallback`: clicking the element advances too.
    useEffect(() => {
        const element = anchorRef.current;

        if (!element || !current) return;

        const onClick = () => advance();

        element.addEventListener('click', onClick);

        return () => element.removeEventListener('click', onClick);
    }, [advance, current]);

    if (!current) return null;

    const text = localizeWithFallback(current.textKey, current.textKey);
    const buttonLabel = hasNext ? 'OK' : localizeWithFallback('alert.close.button', 'Close');
    const strips = anchorRect ? getHelpBubbleModalStrips(anchorRect, window.innerWidth, window.innerHeight) : [];

    return (
        <>
            {strips.map((strip, index) => (
                <div
                    key={index}
                    className="octane-ui-help-modal"
                    style={{ left: strip.x, top: strip.y, width: strip.width, height: strip.height }}
                    onClick={() => bubbleRef.current?.focus()}
                />
            ))}
            <div
                ref={bubbleRef}
                tabIndex={-1}
                className={classNames('octane-ui-help-bubble', placement?.direction === 'up' ? 'is-arrow-up' : 'is-arrow-down')}
                style={{
                    width: HELP_BUBBLE_WIDTH,
                    left: placement?.left ?? 0,
                    top: placement?.top ?? 0,
                    visibility: placement ? 'visible' : 'hidden',
                    ['--help-bubble-arrow-offset' as string]: `${placement?.arrowOffset ?? 0}px`
                }}
                data-testid="ui-help-bubble"
                data-help-bubble-for={current.name}
            >
                <div className="octane-ui-help-bubble-text">{text}</div>
                <button type="button" className="octane-ui-help-bubble-button" onClick={advance}>
                    {buttonLabel}
                </button>
            </div>
        </>
    );
};
