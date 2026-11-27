import { ComponentProps, createContext, FC, MouseEvent, PointerEvent, ReactNode, useContext, useMemo, useRef, useState } from 'react';
import { FaChevronDown, FaChevronLeft, FaChevronUp, FaTimes } from 'react-icons/fa';
import { localizeWithFallback } from '../../api/utils/localizeWithFallback';
import { sheetDragIntent, sheetPullDistance } from '../../api/handheld/handheldSheet';
import { useHandheldLayout } from '../../hooks/handheld/useHandheldLayout';
import { BaseButton } from '../BaseButton';
import { NativeTextTree } from '../native-text/NativeTextTree';

/**
 * What a view rendered inside the phone drawer can ask for: `actionsSlot` is the element at the head of the
 * drawer's action grid, where an infostand portals the buttons it shows under its panel on the desktop.
 * The room context menus read the same context to lay their rows out as the drawer's action buttons.
 */
export interface HandheldDrawerSlots {
    actionsSlot: HTMLElement | null;
}

export const HandheldDrawerContext = createContext<HandheldDrawerSlots | null>(null);

/** Null on the desktop and outside the drawer. */
export const useHandheldDrawer = (): HandheldDrawerSlots | null => useContext(HandheldDrawerContext);

export type HandheldDrawerTone = 'primary' | 'danger';

interface HandheldDrawerActionProps extends Omit<ComponentProps<typeof BaseButton>, 'disabled'> {
    icon?: ReactNode;
    /** Green for the one main action, red for what takes something away (pick up, eject, kick, ban, delete). */
    tone?: HandheldDrawerTone;
    /** Shown, greyed, and not acting; stays focusable so its reason can be read. */
    disabled?: boolean;
}

/** One button of the drawer's action grid: an icon over a short label, a finger wide and high. */
export const HandheldDrawerAction: FC<HandheldDrawerActionProps> = ({ icon = null, tone, disabled = false, className = '', onClick, children, ...rest }) => (
    <BaseButton
        {...rest}
        aria-disabled={disabled || undefined}
        className={`octane-handheld-drawer__action ${className}`.trim()}
        data-tone={tone}
        onClick={(event) => {
            if (disabled) return;

            onClick?.(event);
        }}
    >
        {icon && (
            <span aria-hidden="true" className="octane-handheld-drawer__action-icon">
                {icon}
            </span>
        )}
        <span className="octane-handheld-drawer__action-label">{children}</span>
    </BaseButton>
);

/** A heading over a group of actions; only the open drawer shows it. */
export const HandheldDrawerSection: FC<{ children: ReactNode }> = ({ children }) => (
    <h3 className="octane-handheld-drawer__section">{children}</h3>
);

interface HandheldInfoDrawerProps {
    /** Names the drawer for assistive technology. */
    label: string;
    title: ReactNode;
    subtitle?: ReactNode;
    picture?: ReactNode;
    /** Tints the head: a Builders Club furni, a temporary (Wired) copy. */
    kind?: 'builders-club' | 'temporary';
    /** Peek (false) or open (true). Landscape and sub-pages are always open. */
    expanded?: boolean;
    onExpandedChange?: (expanded: boolean) => void;
    onClose: () => void;
    /** Makes the drawer a sub-page: a back button replaces the picture and there is no peek. */
    onBack?: () => void;
    isPage?: boolean;
    /** The scrolling part between the head and the actions; the peek leaves it out. */
    details?: ReactNode;
    /** The action grid along the drawer's lower edge; the peek shows its first row. A function is told whether the drawer is open. */
    actions?: ReactNode | ((open: boolean) => ReactNode);
    /** A heading over the whole action grid (the open drawer shows it); grouped actions bring their own headings instead. */
    actionsLabel?: string;
}

/**
 * Phone drawer of whatever is selected in the room: docked over the toolbar strip in portrait (a peek with the
 * picture, the name and the first row of actions, pulled or tapped open to everything), a full-height panel at
 * the right edge in landscape. The same shell carries the sub-pages (pet commands, bot forms) with a back button.
 */
export const HandheldInfoDrawer: FC<HandheldInfoDrawerProps> = ({
    label,
    title,
    subtitle = null,
    picture = null,
    kind,
    expanded = false,
    onExpandedChange,
    onClose,
    onBack,
    isPage = false,
    details = null,
    actions = null,
    actionsLabel
}) => {
    const { orientation } = useHandheldLayout();
    const [pulled, setPulled] = useState(0);
    const [actionsSlot, setActionsSlot] = useState<HTMLElement | null>(null);
    const drawerRef = useRef<HTMLElement>(null);
    const dragRef = useRef<{ pointerId: number; startY: number } | null>(null);
    const slots = useMemo(() => ({ actionsSlot }), [actionsSlot]);

    const page = isPage || !!onBack;
    const foldable = !page && orientation === 'portrait' && !!onExpandedChange;
    const open = !foldable || expanded;

    const onDragDown = (event: PointerEvent<HTMLElement>) => {
        if (!foldable || !event.isPrimary) return;
        // The head's own buttons keep their taps.
        if ((event.target as Element).closest?.('button')) return;

        dragRef.current = { pointerId: event.pointerId, startY: event.clientY };

        try {
            event.currentTarget.setPointerCapture(event.pointerId);
        } catch {}
    };

    const onDragMove = (event: PointerEvent<HTMLElement>) => {
        const drag = dragRef.current;

        if (!drag || drag.pointerId !== event.pointerId) return;

        setPulled(sheetPullDistance(drag.startY, event.clientY));
    };

    const onDragUp = (event: PointerEvent<HTMLElement>) => {
        const drag = dragRef.current;

        if (!drag || drag.pointerId !== event.pointerId) return;

        dragRef.current = null;
        setPulled(0);

        if (event.type === 'pointercancel') return;

        switch (sheetDragIntent(event.clientY - drag.startY, expanded, drawerRef.current?.offsetHeight ?? 0)) {
            case 'toggle':
                onExpandedChange(!expanded);
                return;
            case 'expand':
                onExpandedChange(true);
                return;
            case 'collapse':
                onExpandedChange(false);
                return;
            case 'dismiss':
                onClose();
                return;
        }
    };

    // A context-menu row that keeps the drawer (a sub-menu, "give respect") was tapped in the peek: show all of it.
    const onActionsClick = (event: MouseEvent<HTMLDivElement>) => {
        if (open || !(event.target as Element).closest?.('.octane-handheld-drawer__menu')) return;

        onExpandedChange?.(true);
    };

    const closeLabel = localizeWithFallback('octane.handheld.drawer.close', 'Close');
    const foldLabel = expanded ? localizeWithFallback('octane.handheld.drawer.less', 'Show less') : localizeWithFallback('octane.handheld.drawer.more', 'Show everything');

    return (
        <NativeTextTree>
            <section
                ref={drawerRef}
                aria-label={label}
                className="octane-handheld-drawer"
                data-kind={kind}
                data-page={page ? '' : undefined}
                data-pulling={pulled > 0 ? '' : undefined}
                data-state={open ? 'open' : 'peek'}
                style={pulled > 0 ? { transform: `translateY(${pulled}px)` } : undefined}
            >
                <HandheldDrawerContext value={slots}>
                    <div className="octane-handheld-drawer__head" onPointerCancel={onDragUp} onPointerDown={onDragDown} onPointerMove={onDragMove} onPointerUp={onDragUp}>
                        {foldable && <span aria-hidden="true" className="octane-handheld-drawer__grip" />}
                        {onBack && (
                            <BaseButton aria-label={localizeWithFallback('octane.handheld.drawer.back', 'Back')} className="octane-handheld-drawer__round" onClick={onBack}>
                                <FaChevronLeft aria-hidden="true" />
                            </BaseButton>
                        )}
                        {picture && <div className="octane-handheld-drawer__picture">{picture}</div>}
                        <div className="octane-handheld-drawer__titles">
                            <h2 className="octane-handheld-drawer__title">{title}</h2>
                            {subtitle && <p className="octane-handheld-drawer__subtitle">{subtitle}</p>}
                        </div>
                        {foldable && (
                            <BaseButton aria-expanded={expanded} aria-label={foldLabel} className="octane-handheld-drawer__round" onClick={() => onExpandedChange(!expanded)}>
                                {expanded ? <FaChevronDown aria-hidden="true" /> : <FaChevronUp aria-hidden="true" />}
                            </BaseButton>
                        )}
                        <BaseButton aria-label={closeLabel} className="octane-handheld-drawer__round octane-handheld-drawer__close" onClick={onClose}>
                            <FaTimes aria-hidden="true" />
                        </BaseButton>
                    </div>
                    {details && (
                        <div className="octane-handheld-drawer__details" hidden={!open}>
                            {details}
                        </div>
                    )}
                    <div className="octane-handheld-drawer__actions" onClick={onActionsClick}>
                        {actionsLabel && <HandheldDrawerSection>{actionsLabel}</HandheldDrawerSection>}
                        <div ref={setActionsSlot} className="octane-handheld-drawer__slot" />
                        {typeof actions === 'function' ? actions(open) : actions}
                    </div>
                </HandheldDrawerContext>
            </section>
        </NativeTextTree>
    );
};
