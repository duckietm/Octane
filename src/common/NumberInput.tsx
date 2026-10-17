import { NumberField } from '@base-ui/react/number-field';
import { InputHTMLAttributes, Ref } from 'react';

export interface NumberChangeEvent {
    target: { value: string; valueAsNumber: number; name?: string };
    currentTarget: { value: string; valueAsNumber: number; name?: string };
    preventDefault: () => void;
    stopPropagation: () => void;
}

export interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'type' | 'min' | 'max' | 'step'> {
    value?: number | string | null;
    /** Same fields a native number input's change event exposes: `target.value` (string) and `target.valueAsNumber`. */
    onChange?: (event: NumberChangeEvent) => void;
    min?: number | string;
    max?: number | string;
    step?: number | string;
    ref?: Ref<HTMLInputElement>;
}

// No digit grouping and no 3-digit rounding: the field has to round-trip the raw number, like a native one.
const FORMAT: Intl.NumberFormatOptions = { useGrouping: false, maximumFractionDigits: 20 };

const toNumber = (value: number | string | null | undefined): number | null => {
    if (value === null || value === undefined || value === '') return null;

    const parsed = typeof value === 'number' ? value : Number(value);

    return Number.isFinite(parsed) ? parsed : null;
};

const toOptionalNumber = (value: number | string | undefined): number | undefined => toNumber(value) ?? undefined;

const makeEvent = (value: number | null, name?: string): NumberChangeEvent => {
    const text = value === null ? '' : String(value);
    const valueAsNumber = value === null ? Number.NaN : value;

    return {
        target: { value: text, valueAsNumber, name },
        currentTarget: { value: text, valueAsNumber, name },
        preventDefault: () => undefined,
        stopPropagation: () => undefined
    };
};

/**
 * Base UI number field that is a drop-in for `<input type="number" value onChange>`.
 * The box carries `octane-number-input` so the css written for `input[type='number']`
 * also applies. There are no stepper buttons (a native field has none until hovered);
 * arrow keys still step. The wrapper span is `display: contents`, so layout is unchanged.
 */
export const NumberInput = (props: NumberInputProps) => {
    const { value, onChange, min, max, step, className, disabled, readOnly, name, id, required, ref, ...rest } = props;

    return (
        <NumberField.Root
            className="octane-number-field"
            disabled={disabled}
            format={FORMAT}
            id={id}
            max={toOptionalNumber(max)}
            min={toOptionalNumber(min)}
            name={name}
            readOnly={readOnly}
            required={required}
            step={toOptionalNumber(step)}
            value={toNumber(value)}
            onValueChange={(next) => onChange?.(makeEvent(next, name))}
        >
            <NumberField.Input
                ref={ref}
                aria-valuemax={toOptionalNumber(max)}
                aria-valuemin={toOptionalNumber(min)}
                aria-valuenow={toNumber(value) ?? undefined}
                className={className ? `octane-number-input ${className}` : 'octane-number-input'}
                // Keeps the role a native number input has; Base UI renders a text input.
                role="spinbutton"
                {...rest}
            />
        </NumberField.Root>
    );
};
