import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { ComponentProps, FC } from 'react';

export interface CheckboxProps extends Omit<ComponentProps<typeof BaseCheckbox.Root>, 'onCheckedChange' | 'className'> {
    className?: string;
    onCheckedChange?: (checked: boolean) => void;
}

/**
 * Base UI checkbox. The `octane-checkbox` class mirrors the native
 * `input[type='checkbox']` skin (HabboTheme.css / WiredView.css), driven by
 * `data-checked` instead of `:checked`.
 */
export const Checkbox: FC<CheckboxProps> = (props) => {
    const { className, onCheckedChange, ...rest } = props;

    return (
        <BaseCheckbox.Root
            // An <i>, not the default span: host windows style `span` / `input` children generically.
            render={<i />}
            className={className ? `octane-checkbox ${className}` : 'octane-checkbox'}
            onCheckedChange={(checked) => onCheckedChange?.(checked)}
            {...rest}
        />
    );
};
