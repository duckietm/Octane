import { Radio as BaseRadio } from '@base-ui/react/radio';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import { ComponentProps, FC } from 'react';

export interface RadioProps extends Omit<ComponentProps<typeof BaseRadio.Root>, 'onChange' | 'className' | 'value' | 'render'> {
    checked?: boolean;
    className?: string;
    name?: string;
    /** Fires when the radio becomes checked, like a native radio's change event. */
    onCheckedChange?: () => void;
}

const CHECKED = 'on';

/**
 * A standalone, controlled Base UI radio: it is its own one-item group, so it
 * stays a drop-in for `<input type="radio" checked onChange>`. The skin lives on
 * `.octane-radio` (HabboTheme.css / WiredView.css), driven by `data-checked`.
 */
export const Radio: FC<RadioProps> = (props) => {
    const { checked = false, className, name, onCheckedChange, disabled, readOnly, required, ...rest } = props;

    return (
        <BaseRadioGroup
            // An <i>, not a div: host windows style `div` / `span` / `input` children generically.
            render={<i className="octane-radio-group" />}
            disabled={disabled}
            name={name}
            readOnly={readOnly}
            required={required}
            value={checked ? CHECKED : ''}
            onValueChange={() => onCheckedChange?.()}
        >
            <BaseRadio.Root render={<i />} className={className ? `octane-radio ${className}` : 'octane-radio'} value={CHECKED} {...rest} />
        </BaseRadioGroup>
    );
};
