import { Children, FC, isValidElement, KeyboardEvent, ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface InventoryFilterSelectProps {
    value?: string | number;
    disabled?: boolean;
    'aria-label': string;
    onChange?: (value: string) => void;
    children: ReactNode;
}

export const InventoryFilterSelect: FC<InventoryFilterSelectProps> = ({ value, disabled, onChange, children, 'aria-label': label }) => {
    const options = Children.toArray(children)
        .filter(isValidElement<{ value?: string | number; children: ReactNode }>)
        .map((child) => ({
            value: String(child.props.value ?? ''),
            label: String(child.props.children ?? '').slice(0, 200)
        }));
    const selected = Math.max(
        0,
        options.findIndex((option) => option.value === String(value ?? ''))
    );
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const [position, setPosition] = useState({ left: 0, top: 0, scale: 1 });
    const trigger = useRef<HTMLButtonElement>(null);
    const menu = useRef<HTMLDivElement>(null);
    const typeahead = useRef({ query: '', time: 0 });
    const id = useId();

    const close = (restoreFocus = false) => {
        setOpen(false);
        if (restoreFocus) trigger.current?.focus();
    };

    const choose = (index: number) => {
        if (!options[index]) return;
        onChange?.(options[index].value);
        close(true);
    };

    const show = () => {
        if (disabled || !options.length || !trigger.current) return;
        const bounds = trigger.current.getBoundingClientRect();
        setPosition({ left: bounds.left, top: bounds.top, scale: bounds.width / trigger.current.offsetWidth });
        setActive(selected);
        setOpen(true);
    };

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' || event.key === 'Tab') {
            close(true);
            if (event.key === 'Escape') event.preventDefault();
            return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (open) choose(active);
            else show();
            return;
        }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            if (!open) show();
            else
                setActive((index) =>
                    event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? options.length - 1
                          : Math.max(0, Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))
                );
            return;
        }
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            const now = Date.now();
            const query = (now - typeahead.current.time < 700 ? typeahead.current.query : '') + event.key.toLowerCase();
            typeahead.current = { query, time: now };
            const index = options.findIndex((option) => option.label.toLowerCase().startsWith(query));
            if (index >= 0) {
                if (!open) show();
                setActive(index);
            }
        }
    };

    useLayoutEffect(() => {
        if (!open || !menu.current) return;
        const bounds = menu.current.getBoundingClientRect();
        const left = Math.max(0, Math.min(position.left, window.innerWidth - bounds.width));
        const top = bounds.height > window.innerHeight - 30 ? 30 : Math.max(0, Math.min(position.top, window.innerHeight - bounds.height));
        if (left !== position.left || top !== position.top) setPosition((previous) => ({ ...previous, left, top }));
        menu.current.focus();
    }, [open, position]);

    useEffect(() => {
        if (!open) return;
        const outside = (event: PointerEvent) => {
            if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false);
        };
        const dismiss = () => setOpen(false);
        document.addEventListener('pointerdown', outside);
        window.addEventListener('resize', dismiss);
        return () => {
            document.removeEventListener('pointerdown', outside);
            window.removeEventListener('resize', dismiss);
        };
    }, [open]);

    useEffect(() => {
        if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' });
    }, [active, id, open]);

    return (
        <span className="octane-inventory-filter-choice">
            <button
                ref={trigger}
                type="button"
                className="octane-inventory-filter-select"
                role="combobox"
                aria-label={label}
                aria-expanded={open}
                aria-controls={open ? id : undefined}
                aria-haspopup="listbox"
                disabled={disabled}
                onClick={() => (open ? close() : show())}
                onKeyDown={onKeyDown}
            >
                {options[selected]?.label}
            </button>
            {open &&
                createPortal(
                    <div
                        ref={menu}
                        id={id}
                        role="listbox"
                        aria-label={label}
                        aria-activedescendant={`${id}-${active}`}
                        tabIndex={-1}
                        className="octane-inventory-filter-menu"
                        style={{
                            left: position.left,
                            top: position.top,
                            transform: `scale(${position.scale})`,
                            maxHeight: (window.innerHeight - 30) / position.scale
                        }}
                        onKeyDown={onKeyDown}
                    >
                        {options.map((option, index) => (
                            <div
                                key={option.value}
                                id={`${id}-${index}`}
                                role="option"
                                aria-selected={index === selected}
                                className={`octane-inventory-filter-option ${index === active ? 'is-active' : ''}`}
                                onPointerMove={() => setActive(index)}
                                onPointerDown={(event) => event.preventDefault()}
                                onClick={() => choose(index)}
                            >
                                {option.label}
                            </div>
                        ))}
                    </div>,
                    document.body
                )}
        </span>
    );
};
