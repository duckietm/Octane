import { AnimatePresence, motion } from 'framer-motion';
import { FC, MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Flex, FlexProps } from '../Flex';

// Official notification view config: time_fade_in / time_display / time_fade_out.
export const NOTIFICATION_FADE_IN_MS = 1000;
export const NOTIFICATION_DISPLAY_MS = 15000;
export const NOTIFICATION_FADE_OUT_MS = 1000;

export interface LayoutNotificationBubbleViewProps extends FlexProps {
    fadesOut?: boolean;
    timeoutMs?: number;
    /** Official items fade out once clicked. */
    closeOnClick?: boolean;
    onClose: () => void;
}

export const LayoutNotificationBubbleView: FC<LayoutNotificationBubbleViewProps> = (props) => {
    const {
        fadesOut = true,
        timeoutMs = NOTIFICATION_DISPLAY_MS,
        closeOnClick = true,
        onClose = null,
        onClick = null,
        onMouseEnter = null,
        onMouseLeave = null,
        overflow = 'hidden',
        classNames = [],
        ...rest
    } = props;
    const [isVisible, setIsVisible] = useState(true);
    const hoveringRef = useRef(false);
    const expiredRef = useRef(false);
    const closingRef = useRef(false);

    const getClassNames = useMemo(() => {
        const newClassNames: string[] = [
            'pointer-events-auto text-sm bg-[#1c1c20f2] px-[5px] py-[6px] [box-shadow:inset_0_5px_#22222799,inset_0_-4px_#12121599] ',
            'rounded',
            'octane-notification-bubble',
            'octane-swf-notification-bubble'
        ];

        if (classNames.length) newClassNames.push(...classNames);

        return newClassNames;
    }, [classNames]);

    const fadeOut = () => {
        if (closingRef.current) return;

        closingRef.current = true;
        setIsVisible(false);
    };

    // Like the official client, the display time does not run out while hovered.
    useEffect(() => {
        if (!fadesOut) return;

        const timeout = setTimeout(() => {
            expiredRef.current = true;

            if (!hoveringRef.current) fadeOut();
        }, NOTIFICATION_FADE_IN_MS + timeoutMs);

        return () => clearTimeout(timeout);
    }, [fadesOut, timeoutMs]);

    const handleClick = (event: MouseEvent<HTMLDivElement>) => {
        onClick?.(event);

        if (closeOnClick && !event.defaultPrevented) fadeOut();
    };

    const handleMouseEnter = (event: MouseEvent<HTMLDivElement>) => {
        hoveringRef.current = true;
        onMouseEnter?.(event);
    };

    const handleMouseLeave = (event: MouseEvent<HTMLDivElement>) => {
        hoveringRef.current = false;
        onMouseLeave?.(event);

        if (fadesOut && expiredRef.current) fadeOut();
    };

    return (
        <AnimatePresence onExitComplete={() => onClose?.()}>
            {isVisible && (
                <motion.div
                    layout="position"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { duration: NOTIFICATION_FADE_IN_MS / 1000 } }}
                    exit={{ opacity: 0, transition: { duration: NOTIFICATION_FADE_OUT_MS / 1000 } }}
                    transition={{ layout: { duration: 0.22, ease: 'easeOut' } }}
                >
                    <Flex
                        overflow={overflow}
                        classNames={getClassNames}
                        onClick={handleClick}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        {...rest}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};
