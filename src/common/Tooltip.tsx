import { FC, FocusEvent, MouseEvent, ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type TooltipPlacement = 'auto' | 'above' | 'below';

export interface TooltipOptions {
    content: ReactNode;
    placement?: TooltipPlacement;
    /** Hover time before the bubble shows. The official theme ships tool_tip_delay values of 0 and 250. */
    delay?: number;
    disabled?: boolean;
    /** Extra classes for the bubble itself, e.g. a width cap. */
    className?: string;
}

export interface TooltipProps extends TooltipOptions {
    /** Render the anchor as a column so a full-width control keeps its width. */
    block?: boolean;
    children?: ReactNode;
}

export interface TooltipAnchorRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

export interface TooltipLayout {
    side: 'above' | 'below';
    top: number;
    left: number;
}

/* HintManager.as keeps 10px between the target and the bubble. */
export const TOOLTIP_GAP = 10;
/* Keep the bubble off the viewport edge when the target sits near it. */
export const TOOLTIP_EDGE = 4;
export const TOOLTIP_DEFAULT_DELAY = 250;

/**
 * Pure placement decision. Matches the official hint: go above when the
 * bubble and its gap fit between the target and the top of the screen,
 * otherwise flip below.
 */
export const resolveTooltipPlacement = (placement: TooltipPlacement, anchorTop: number, bubbleHeight: number): 'above' | 'below' => {
    if (placement !== 'auto') return placement;

    return anchorTop - bubbleHeight - TOOLTIP_GAP > 0 ? 'above' : 'below';
};

/** Pure position: centred on the target, clamped to the viewport width. */
export const resolveTooltipPosition = (
    anchor: TooltipAnchorRect,
    bubble: { width: number; height: number },
    placement: TooltipPlacement,
    viewportWidth: number
): TooltipLayout => {
    const side = resolveTooltipPlacement(placement, anchor.top, bubble.height);
    const top = side === 'above' ? anchor.top - bubble.height - TOOLTIP_GAP : anchor.top + anchor.height + TOOLTIP_GAP;
    const centred = anchor.left + (anchor.width - bubble.width) / 2;
    const left = Math.max(TOOLTIP_EDGE, Math.min(centred, viewportWidth - bubble.width - TOOLTIP_EDGE));

    return { side, top: Math.round(top), left: Math.round(left) };
};

const hasContent = (content: ReactNode) => content !== null && content !== undefined && content !== false && content !== '';

/**
 * Headless tooltip: spread `anchorProps` on the element that owns the hover
 * and render `tooltip` anywhere in the tree (it portals to the body). Use it
 * directly when wrapping the anchor would disturb its layout.
 */
export const useTooltip = (options: TooltipOptions) => {
    const { content, placement = 'auto', delay = TOOLTIP_DEFAULT_DELAY, disabled = false, className = '' } = options;
    const [anchorRect, setAnchorRect] = useState<TooltipAnchorRect | null>(null);
    const [layout, setLayout] = useState<TooltipLayout | null>(null);
    const bubbleRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<number | null>(null);

    const clearTimer = () => {
        if (timerRef.current === null) return;

        window.clearTimeout(timerRef.current);
        timerRef.current = null;
    };

    const hide = useCallback(() => {
        clearTimer();
        setAnchorRect(null);
        setLayout(null);
    }, []);

    const show = useCallback(
        (target: Element) => {
            clearTimer();

            const open = () => {
                timerRef.current = null;

                const rect = target.getBoundingClientRect();

                setAnchorRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
            };

            if (delay > 0) timerRef.current = window.setTimeout(open, delay);
            else open();
        },
        [delay]
    );

    useEffect(() => clearTimer, []);

    useEffect(() => {
        if (disabled) hide();
    }, [disabled, hide]);

    // The bubble has to exist before its size can decide above or below, so
    // it renders hidden first and gets its final spot here.
    useLayoutEffect(() => {
        if (!anchorRect || !bubbleRef.current) return;

        const bubble = bubbleRef.current;
        const next = resolveTooltipPosition(anchorRect, { width: bubble.offsetWidth, height: bubble.offsetHeight }, placement, window.innerWidth);

        // `content` is often a fresh element every render, so this runs a lot;
        // handing back the previous layout when nothing moved lets React bail
        // out instead of re-rendering in a loop.
        setLayout((previous) => (previous && previous.side === next.side && previous.top === next.top && previous.left === next.left ? previous : next));
    }, [anchorRect, placement, content]);

    // Anything that moves the target makes the stored rect stale; hiding is
    // cheaper and less surprising than chasing it.
    useEffect(() => {
        if (!anchorRect) return;

        window.addEventListener('scroll', hide, true);
        window.addEventListener('resize', hide);

        return () => {
            window.removeEventListener('scroll', hide, true);
            window.removeEventListener('resize', hide);
        };
    }, [anchorRect, hide]);

    const isOpen = !disabled && anchorRect !== null && hasContent(content);

    const anchorProps = {
        onMouseEnter: (event: MouseEvent<Element>) => {
            if (!disabled) show(event.currentTarget);
        },
        onMouseLeave: () => hide(),
        onFocus: (event: FocusEvent<Element>) => {
            if (!disabled) show(event.currentTarget);
        },
        onBlur: () => hide()
    };

    const tooltip = isOpen
        ? createPortal(
              <div
                  ref={bubbleRef}
                  role="tooltip"
                  className={['octane-tooltip', layout ? `octane-tooltip--${layout.side}` : 'is-measuring', className].filter(Boolean).join(' ')}
                  style={{ top: layout ? layout.top : 0, left: layout ? layout.left : 0 }}
              >
                  {content}
              </div>,
              document.body
          )
        : null;

    return { anchorProps, tooltip, isOpen, hide };
};

/**
 * Skinned tooltip (habbo_skin_tooltip: dark 6px-corner bubble, Ubuntu 11
 * white) shown above or below the wrapped element after `delay` ms. The
 * anchor is a wrapper rather than the child itself so disabled controls,
 * which drop pointer events, still get their hint.
 */
export const Tooltip: FC<TooltipProps> = (props) => {
    const { block = false, children = null, ...options } = props;
    const { anchorProps, tooltip } = useTooltip(options);

    if (block) {
        return (
            <div className="octane-tooltip-anchor flex flex-col" {...anchorProps}>
                {children}
                {tooltip}
            </div>
        );
    }

    return (
        <span className="octane-tooltip-anchor inline-flex" {...anchorProps}>
            {children}
            {tooltip}
        </span>
    );
};
