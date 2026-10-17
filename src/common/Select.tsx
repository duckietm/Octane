import { Select as BaseSelect } from '@base-ui/react/select';
import { Children, CSSProperties, FC, Fragment, isValidElement, ReactElement, ReactNode } from 'react';

export interface SelectChangeEvent {
    target: { value: string; name?: string };
    currentTarget: { value: string; name?: string };
    preventDefault: () => void;
    stopPropagation: () => void;
}

export interface SelectProps {
    value?: string | number;
    /** Same shape as a native select's change event: read `event.target.value` (always a string). */
    onChange?: (event: SelectChangeEvent) => void;
    /** `<option>` / `<optgroup>` elements, written exactly like a native select. */
    children?: ReactNode;
    className?: string;
    style?: CSSProperties;
    disabled?: boolean;
    id?: string;
    name?: string;
    title?: string;
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'data-testid'?: string;
}

interface SelectOption {
    value: string;
    label: ReactNode;
    disabled: boolean;
}

interface SelectGroup {
    label: ReactNode;
    options: SelectOption[];
}

type SelectEntry = SelectOption | SelectGroup;

const isGroup = (entry: SelectEntry): entry is SelectGroup => 'options' in entry;

const textOf = (node: ReactNode): string => {
    if (node === null || node === undefined || typeof node === 'boolean') return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(textOf).join('');
    if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);

    return '';
};

const collect = (nodes: ReactNode, out: SelectEntry[]) => {
    Children.forEach(nodes, (child) => {
        if (!isValidElement(child)) return;

        const element = child as ReactElement<{ value?: string | number; disabled?: boolean; hidden?: boolean; label?: ReactNode; children?: ReactNode }>;

        if (element.type === Fragment) return collect(element.props.children, out);

        if (element.type === 'optgroup') {
            const options: SelectOption[] = [];

            collect(element.props.children, options);
            out.push({ label: element.props.label, options: options.filter((entry): entry is SelectOption => !isGroup(entry)) });

            return;
        }

        if (element.type === 'option') {
            if (element.props.hidden) return;

            out.push({
                value: element.props.value !== undefined ? String(element.props.value) : textOf(element.props.children),
                label: element.props.children,
                disabled: !!element.props.disabled
            });
        }
    });
};

const makeEvent = (value: string, name?: string): SelectChangeEvent => ({
    target: { value, name },
    currentTarget: { value, name },
    preventDefault: () => undefined,
    stopPropagation: () => undefined
});

/**
 * Base UI select that is a drop-in for a native `<select value onChange>` with
 * `<option>` children. The trigger keeps the caller's className (e.g. `form-select`),
 * and carries `octane-select-trigger` so the css written for `select` also applies.
 */
export const Select: FC<SelectProps> = (props) => {
    const { value, onChange, children, className, style, disabled, id, name, title, ...aria } = props;
    const entries: SelectEntry[] = [];

    collect(children, entries);

    const flat = entries.flatMap((entry) => (isGroup(entry) ? entry.options : [entry]));
    const current = value === undefined || value === null ? '' : String(value);
    // A native select shows its first option when the value matches none.
    const shown = flat.find((option) => option.value === current) ?? flat[0];

    const renderOption = (option: SelectOption) => (
        <BaseSelect.Item key={option.value} className="octane-select-item" disabled={option.disabled} label={textOf(option.label)} value={option.value}>
            <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
        </BaseSelect.Item>
    );

    return (
        <BaseSelect.Root
            disabled={disabled}
            name={name}
            value={current}
            onValueChange={(next) => onChange?.(makeEvent(next === null || next === undefined ? '' : String(next), name))}
        >
            <BaseSelect.Trigger
                className={className ? `octane-select-trigger ${className}` : 'octane-select-trigger'}
                id={id}
                style={style}
                title={title}
                {...aria}
            >
                <span className="octane-select-body">
                    <BaseSelect.Value className="octane-select-value">{() => shown?.label ?? ''}</BaseSelect.Value>
                    {/* Reserves the width of the widest option, like a native select, without duplicating text nodes. */}
                    <span aria-hidden="true" className="octane-select-sizer">
                        {flat.map((option) => (
                            <span key={option.value} data-label={textOf(option.label)} />
                        ))}
                    </span>
                </span>
            </BaseSelect.Trigger>
            <BaseSelect.Portal>
                <BaseSelect.Positioner alignItemWithTrigger={false} className="octane-select-positioner" sideOffset={2}>
                    <BaseSelect.Popup className="octane-select-popup">
                        <BaseSelect.List className="octane-select-list">
                            {entries.map((entry, index) =>
                                isGroup(entry) ? (
                                    <BaseSelect.Group key={`group-${index}`}>
                                        <BaseSelect.GroupLabel className="octane-select-group-label">{entry.label}</BaseSelect.GroupLabel>
                                        {entry.options.map(renderOption)}
                                    </BaseSelect.Group>
                                ) : (
                                    renderOption(entry)
                                )
                            )}
                        </BaseSelect.List>
                    </BaseSelect.Popup>
                </BaseSelect.Positioner>
            </BaseSelect.Portal>
        </BaseSelect.Root>
    );
};
