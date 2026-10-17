import { Popover as BasePopover } from '@base-ui/react/popover';
import { ComponentProps, FC, ReactNode } from 'react';

export const Popover = BasePopover.Root;
export const PopoverTrigger = BasePopover.Trigger;

export interface PopoverContentProps {
    side?: ComponentProps<typeof BasePopover.Positioner>['side'];
    align?: ComponentProps<typeof BasePopover.Positioner>['align'];
    sideOffset?: number;
    /** Set to false to keep the popup on its side even when it overflows the viewport. */
    avoidCollisions?: boolean;
    /** Class for the positioner wrapper, e.g. a z-index. */
    positionerClassName?: string;
    /** Class for the popup surface itself. */
    className?: string;
    /** Anchor the popup to this element (or ref) instead of the trigger, for popups opened from code. */
    anchor?: ComponentProps<typeof BasePopover.Positioner>['anchor'];
    /** Where focus goes when the popup opens; defaults to the first tabbable element. */
    initialFocus?: ComponentProps<typeof BasePopover.Popup>['initialFocus'];
    children?: ReactNode;
}

const NO_COLLISION = { side: 'none', align: 'none', fallbackAxisSide: 'none' } as const;

export const PopoverContent: FC<PopoverContentProps> = (props) => {
    const { side = 'bottom', align = 'center', sideOffset = 0, avoidCollisions = true, positionerClassName, className, anchor, initialFocus, children } = props;

    return (
        <BasePopover.Portal>
            <BasePopover.Positioner
                align={align}
                anchor={anchor}
                className={positionerClassName}
                collisionAvoidance={avoidCollisions ? undefined : NO_COLLISION}
                side={side}
                sideOffset={sideOffset}
            >
                <BasePopover.Popup className={className} initialFocus={initialFocus}>{children}</BasePopover.Popup>
            </BasePopover.Positioner>
        </BasePopover.Portal>
    );
};
