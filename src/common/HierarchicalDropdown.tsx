import { Menu } from '@base-ui/react/menu';
import { FC, ReactNode, useRef, useState } from 'react';

/** One row of a {@link HierarchicalDropdown}: a choice (`value`), or a branch that opens a column of `children`. */
export interface IHierarchicalDropdownOption {
    label: string;
    value?: string;
    children?: IHierarchicalDropdownOption[];
}

const isBranch = (option: IHierarchicalDropdownOption) => !!option.children && option.children.length > 0;

/** The rows from the top level down to the choice with this value, or null when no row carries it. */
export const findHierarchicalDropdownPath = (
    options: readonly IHierarchicalDropdownOption[],
    value: string | null | undefined
): IHierarchicalDropdownOption[] | null => {
    if (value === null || value === undefined) return null;

    for (const option of options) {
        if (!isBranch(option)) {
            if (option.value === value) return [option];

            continue;
        }

        const below = findHierarchicalDropdownPath(option.children, value);

        if (below) return [option, ...below];
    }

    return null;
};

/** AIR sizes a column to its selector, but never under 180 px or over 280 px. */
const MIN_COLUMN_WIDTH = 180;
const MAX_COLUMN_WIDTH = 280;

export interface HierarchicalDropdownProps {
    options: readonly IHierarchicalDropdownOption[];
    /** The value of the chosen row; a value no row carries shows the caption. */
    value: string | null;
    onChange: (value: string, path: IHierarchicalDropdownOption[]) => void;
    /** Shown while nothing is chosen. */
    caption?: string;
    disabled?: boolean;
    className?: string;
    'aria-label'?: string;
    'data-testid'?: string;
}

/**
 * AIR's HierarchicalDropdown (hierarchical_dropdown.xml, client 1.0.31): a 24 px selector showing the chosen path
 * ("Group > Choice") that opens a column of 22 px rows; hovering a branch row opens its column beside it, flipped
 * to the other side when there is no room. A column is as wide as the selector within 180-280 px and at most
 * 300 px high. Escape and a press outside close it.
 */
export const HierarchicalDropdown: FC<HierarchicalDropdownProps> = (props) => {
    const { options, value, onChange, caption = '', disabled = false, className = '' } = props;
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(false);
    const [columnWidth, setColumnWidth] = useState(MIN_COLUMN_WIDTH);
    const path = findHierarchicalDropdownPath(options, value);

    const onOpenChange = (next: boolean) => {
        if (next) {
            const width = triggerRef.current?.offsetWidth ?? 0;

            setColumnWidth(Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, width || MIN_COLUMN_WIDTH)));
        }

        setOpen(next);
    };

    const rowClass = (index: number, selected: boolean, inert: boolean) =>
        ['octane-hdropdown-row', index % 2 ? 'is-odd' : '', selected ? 'is-selected' : '', inert ? 'is-inert' : ''].filter(Boolean).join(' ');

    const rows = (entries: readonly IHierarchicalDropdownOption[], above: IHierarchicalDropdownOption[]): ReactNode =>
        entries.map((option, index) => {
            const key = `${index}:${option.value ?? option.label}`;

            if (isBranch(option)) {
                return (
                    <Menu.SubmenuRoot key={key}>
                        <Menu.SubmenuTrigger className={rowClass(index, false, false)} closeDelay={0} delay={0} openOnHover>
                            <span className="octane-hdropdown-label">{option.label}</span>
                            <span aria-hidden className="octane-hdropdown-branch" />
                        </Menu.SubmenuTrigger>
                        <Menu.Portal>
                            <Menu.Positioner align="start" alignOffset={-2} className="octane-hdropdown-positioner" side="inline-end" sideOffset={2}>
                                <Menu.Popup className="octane-hdropdown-column" style={{ width: columnWidth }}>
                                    {rows(option.children, [...above, option])}
                                </Menu.Popup>
                            </Menu.Positioner>
                        </Menu.Portal>
                    </Menu.SubmenuRoot>
                );
            }

            const inert = option.value === undefined || option.value === null;

            return (
                <Menu.Item
                    key={key}
                    className={rowClass(index, !inert && option.value === value, inert)}
                    disabled={inert}
                    onClick={() => !inert && onChange(option.value, [...above, option])}
                >
                    <span className="octane-hdropdown-label">{option.label}</span>
                </Menu.Item>
            );
        });

    return (
        <Menu.Root modal={false} open={open} onOpenChange={onOpenChange}>
            <Menu.Trigger
                ref={triggerRef}
                aria-label={props['aria-label']}
                className={`octane-hdropdown ${className}`.trim()}
                data-testid={props['data-testid']}
                disabled={disabled || !options.length}
            >
                <span className="octane-hdropdown-selection">{path ? path.map((option) => option.label).join(' > ') : caption}</span>
                <span aria-hidden className="octane-hdropdown-arrow" />
            </Menu.Trigger>
            <Menu.Portal>
                <Menu.Positioner align="start" className="octane-hdropdown-positioner" side="bottom" sideOffset={0}>
                    <Menu.Popup className="octane-hdropdown-column" style={{ width: columnWidth }}>
                        {rows(options, [])}
                    </Menu.Popup>
                </Menu.Positioner>
            </Menu.Portal>
        </Menu.Root>
    );
};
