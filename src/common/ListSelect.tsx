import { Select as BaseSelect } from '@base-ui/react/select';
import { CSSProperties, FC, ReactNode, RefObject, useRef, useState } from 'react';

export interface ListSelectOption {
    value: string;
    label: ReactNode;
    disabled?: boolean;
}

export interface ListSelectProps {
    options: ListSelectOption[];
    value: string;
    onValueChange: (value: string) => void;
    'aria-label'?: string;
    disabled?: boolean;
    /** Class for the trigger button. */
    triggerClassName?: string;
    /** Class for the popup surface (the skinned list). */
    popupClassName?: string;
    /** Inline style for the popup surface (merged with the zoom scale). */
    popupStyle?: CSSProperties;
    /** Rendered inside the popup before the options (a drawn frame behind the list). */
    popupDecoration?: ReactNode;
    /** Class added to every option. */
    itemClassName?: string;
    /** Class for the positioner wrapper. */
    positionerClassName?: string;
    /** What the trigger shows; defaults to the selected label. */
    renderTrigger?: (selected: ListSelectOption | undefined) => ReactNode;
    /** Mount the popup inside this element instead of `document.body`, so window-scoped css applies. */
    container?: RefObject<HTMLElement | null>;
    onOpenChange?: (open: boolean) => void;
    side?: 'top' | 'bottom';
    align?: 'start' | 'center' | 'end';
    /** Gap to the trigger; a function gets the anchor size (use `-anchor.height` to overlay the trigger). */
    sideOffset?: number | ((data: { anchor: { width: number; height: number } }) => number);
    /** Scale the popup like the trigger (the client UI may be zoomed through a css transform). */
    scaleWithTrigger?: boolean;
}

const textOf = (node: ReactNode): string => (typeof node === 'string' || typeof node === 'number' ? String(node) : '');

/**
 * Base UI select for the bespoke dropdowns (pixel-skinned triggers and lists): same behavior as
 * `common/Select` but the trigger content, the classes and the mount point belong to the caller.
 */
export const ListSelect: FC<ListSelectProps> = (props) => {
    const {
        options,
        value,
        onValueChange,
        disabled,
        triggerClassName,
        popupClassName,
        popupStyle: popupStyleProp,
        popupDecoration,
        itemClassName,
        positionerClassName,
        renderTrigger,
        container,
        onOpenChange,
        side = 'bottom',
        align = 'start',
        sideOffset = 0,
        scaleWithTrigger = false,
        'aria-label': ariaLabel
    } = props;
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [scale, setScale] = useState(1);
    const selected = options.find((option) => option.value === value);

    const handleOpenChange = (open: boolean) => {
        if (open && scaleWithTrigger && triggerRef.current?.offsetWidth)
            setScale(triggerRef.current.getBoundingClientRect().width / triggerRef.current.offsetWidth);

        onOpenChange?.(open);
    };

    const scaledStyle: CSSProperties | undefined =
        scaleWithTrigger && scale !== 1
            ? { transform: `scale(${scale})`, transformOrigin: 'top left', maxHeight: (window.innerHeight - 30) / scale }
            : undefined;
    const popupStyle: CSSProperties | undefined = popupStyleProp || scaledStyle ? { ...popupStyleProp, ...scaledStyle } : undefined;

    return (
        <BaseSelect.Root
            disabled={disabled}
            value={value}
            onOpenChange={handleOpenChange}
            onValueChange={(next) => {
                if (next !== null && next !== undefined) onValueChange(String(next));
            }}
        >
            <BaseSelect.Trigger ref={triggerRef} aria-label={ariaLabel} className={triggerClassName}>
                {renderTrigger ? renderTrigger(selected) : selected?.label}
            </BaseSelect.Trigger>
            <BaseSelect.Portal container={container}>
                <BaseSelect.Positioner align={align} alignItemWithTrigger={false} className={positionerClassName} side={side} sideOffset={sideOffset}>
                    <BaseSelect.Popup className={popupClassName} style={popupStyle}>
                        {popupDecoration}
                        <BaseSelect.List>
                            {options.map((option) => (
                                <BaseSelect.Item
                                    key={option.value}
                                    className={itemClassName}
                                    disabled={option.disabled}
                                    label={textOf(option.label)}
                                    value={option.value}
                                >
                                    <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
                                </BaseSelect.Item>
                            ))}
                        </BaseSelect.List>
                    </BaseSelect.Popup>
                </BaseSelect.Positioner>
            </BaseSelect.Portal>
        </BaseSelect.Root>
    );
};
