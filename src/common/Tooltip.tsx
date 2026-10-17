import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { cloneElement, FC, FocusEvent, MouseEvent, ReactElement, ReactNode, useCallback, useEffect, useRef, useState } from 'react';

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

/* HintManager.as keeps 10px between the target and the bubble. */
export const TOOLTIP_GAP = 10;
/* Keep the bubble off the viewport edge when the target sits near it. */
export const TOOLTIP_EDGE = 4;
export const TOOLTIP_DEFAULT_DELAY = 250;

/* An explicit placement never flips to the other side (only 'auto' does, like the official hint). */
const FIXED_SIDE = { side: 'none', align: 'shift', fallbackAxisSide: 'none' } as const;

const hasContent = (content: ReactNode) => content !== null && content !== undefined && content !== false && content !== '';

/**
 * Headless tooltip: spread `anchorProps` on the element that owns the hover
 * and render `tooltip` anywhere in the tree (it portals to the body). Use it
 * directly when wrapping the anchor would disturb its layout. The bubble is a
 * Base UI Tooltip popup anchored to the hovered element.
 */
export const useTooltip = (options: TooltipOptions) => {
    const { content, placement = 'auto', delay = TOOLTIP_DEFAULT_DELAY, disabled = false, className = '' } = options;
    const [anchor, setAnchor] = useState<Element | null>(null);
    const timerRef = useRef<number | null>(null);

    const clearTimer = () => {
        if (timerRef.current === null) return;

        window.clearTimeout(timerRef.current);
        timerRef.current = null;
    };

    const hide = useCallback(() => {
        clearTimer();
        setAnchor(null);
    }, []);

    const show = useCallback(
        (target: Element) => {
            clearTimer();

            const open = () => {
                timerRef.current = null;
                setAnchor(target);
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

    // The popup follows its anchor, but a scrolled or resized page is not worth a hint.
    useEffect(() => {
        if (!anchor) return;

        window.addEventListener('scroll', hide, true);
        window.addEventListener('resize', hide);

        return () => {
            window.removeEventListener('scroll', hide, true);
            window.removeEventListener('resize', hide);
        };
    }, [anchor, hide]);

    const isOpen = !disabled && anchor !== null && hasContent(content);

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

    const tooltip = isOpen ? (
        <BaseTooltip.Root open>
            <BaseTooltip.Portal>
                <BaseTooltip.Positioner
                    anchor={anchor}
                    className="octane-tooltip-positioner"
                    collisionAvoidance={placement === 'auto' ? undefined : FIXED_SIDE}
                    collisionPadding={TOOLTIP_EDGE}
                    side={placement === 'below' ? 'bottom' : 'top'}
                    sideOffset={TOOLTIP_GAP}
                >
                    <BaseTooltip.Popup className={['octane-tooltip', className].filter(Boolean).join(' ')} role="tooltip">
                        {content}
                    </BaseTooltip.Popup>
                </BaseTooltip.Positioner>
            </BaseTooltip.Portal>
        </BaseTooltip.Root>
    ) : null;

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

type HintHandler = (event: never) => void;

const chain = (own: HintHandler | undefined, extra: HintHandler): HintHandler => (event) => {
    own?.(event);
    extra(event);
};

/**
 * The tooltip of a single control, without a wrapper element: the hover and
 * focus handlers are merged into the child itself, so an absolutely
 * positioned or flex child keeps its place. A disabled control receives no
 * pointer events, so use `Tooltip` for those.
 */
export const Hint: FC<TooltipOptions & { children: ReactElement<Record<string, HintHandler | undefined>> }> = (props) => {
    const { children, ...options } = props;
    const { anchorProps, tooltip } = useTooltip(options);

    return (
        <>
            {cloneElement(children, {
                onMouseEnter: chain(children.props.onMouseEnter, anchorProps.onMouseEnter as HintHandler),
                onMouseLeave: chain(children.props.onMouseLeave, anchorProps.onMouseLeave as HintHandler),
                onFocus: chain(children.props.onFocus, anchorProps.onFocus as HintHandler),
                onBlur: chain(children.props.onBlur, anchorProps.onBlur as HintHandler)
            })}
            {tooltip}
        </>
    );
};
