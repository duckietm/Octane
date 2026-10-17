import { Children, FC, isValidElement, ReactNode } from 'react';
import { ListSelect } from '../../../common/ListSelect';

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
    const selected = options.find((option) => option.value === String(value ?? '')) ?? options[0];

    return (
        <span className="octane-inventory-filter-choice">
            <ListSelect
                aria-label={label}
                disabled={disabled || !options.length}
                itemClassName="octane-inventory-filter-option"
                options={options}
                popupClassName="octane-inventory-filter-menu"
                scaleWithTrigger
                // The list opens over the trigger, like the AIR client's drop menu.
                sideOffset={({ anchor }) => -anchor.height}
                triggerClassName="octane-inventory-filter-select"
                value={selected?.value ?? ''}
                onValueChange={(next) => onChange?.(next)}
            />
        </span>
    );
};
