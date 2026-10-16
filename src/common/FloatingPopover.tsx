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
    children?: ReactNode;
}

const NO_COLLISION = { side: 'none', align: 'none', fallbackAxisSide: 'none' } as const;

export const PopoverContent: FC<PopoverContentProps> = (props) => {
    const { side = 'bottom', align = 'center', sideOffset = 0, avoidCollisions = true, positionerClassName, className, children } = props;

    return (
        <BasePopover.Portal>
            <BasePopover.Positioner
                align={align}
                className={positionerClassName}
                collisionAvoidance={avoidCollisions ? undefined : NO_COLLISION}
                side={side}
                sideOffset={sideOffset}
            >
                <BasePopover.Popup className={className}>{children}</BasePopover.Popup>
            </BasePopover.Positioner>
        </BasePopover.Portal>
    );
};
