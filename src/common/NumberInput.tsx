import { NumberField } from '@base-ui/react/number-field';
import { InputHTMLAttributes, MouseEvent as ReactMouseEvent, Ref, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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

const STEPPER_WIDTH = 14;
const HIDE_DELAY_MS = 90;

interface StepperRect {
    top: number;
    left: number;
    height: number;
}

/**
 * The up / down buttons of a native number field, drawn as an overlay over the right edge of
 * the input (it is a portal, so the field's own layout never changes).
 */
const NumberSteppers = ({ input, onEnter, onLeave }: { input: HTMLInputElement; onEnter: () => void; onLeave: () => void }) => {
    const [rect, setRect] = useState<StepperRect | null>(null);

    useLayoutEffect(() => {
        const measure = () => {
            const box = input.getBoundingClientRect();

            setRect({ top: box.top + 1, left: box.right - STEPPER_WIDTH - 1, height: Math.max(box.height - 2, 2) });
        };

        measure();
        window.addEventListener('scroll', measure, true);
        window.addEventListener('resize', measure);

        return () => {
            window.removeEventListener('scroll', measure, true);
            window.removeEventListener('resize', measure);
        };
    }, [input]);

    if (!rect) return null;

    return createPortal(
        <span
            className="octane-number-steppers"
            style={{ top: rect.top, left: rect.left, width: STEPPER_WIDTH, height: rect.height }}
            // Keeps the focus (and the caret) in the input while a stepper is pressed.
            onMouseDown={(event: ReactMouseEvent) => event.preventDefault()}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
        >
            <NumberField.Increment className="octane-number-step octane-number-step--up" />
            <NumberField.Decrement className="octane-number-step octane-number-step--down" />
        </span>,
        document.body
    );
};

const assignRef = <T,>(ref: Ref<T> | undefined, node: T | null) => {
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as { current: T | null }).current = node;
};

/**
 * Base UI number field that is a drop-in for `<input type="number" value onChange>`.
 * The box carries `octane-number-input` so the css written for `input[type='number']`
 * also applies. Like a native field, up / down buttons appear while the pointer is over it
 * or it has focus (an overlay, so the layout is untouched); arrow keys and press-and-hold
 * step too. The wrapper span is `display: contents`.
 */
export const NumberInput = (props: NumberInputProps) => {
    const { value, onChange, min, max, step, className, disabled, readOnly, name, id, required, ref, onMouseEnter, onMouseLeave, onFocus, onBlur, ...rest } =
        props;
    const [input, setInput] = useState<HTMLInputElement | null>(null);
    const [pointerOver, setPointerOver] = useState(false);
    const [focused, setFocused] = useState(false);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const cancelHide = useCallback(() => {
        if (hideTimer.current) clearTimeout(hideTimer.current);

        hideTimer.current = null;
    }, []);

    const show = useCallback(() => {
        cancelHide();
        setPointerOver(true);
    }, [cancelHide]);

    const hideSoon = useCallback(() => {
        cancelHide();
        hideTimer.current = setTimeout(() => setPointerOver(false), HIDE_DELAY_MS);
    }, [cancelHide]);

    useEffect(() => cancelHide, [cancelHide]);

    const setInputRef = useCallback(
        (node: HTMLInputElement | null) => {
            setInput(node);
            assignRef(ref, node);
        },
        [ref]
    );

    const steppersVisible = !!input && !disabled && !readOnly && (pointerOver || focused);

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
                ref={setInputRef}
                aria-valuemax={toOptionalNumber(max)}
                aria-valuemin={toOptionalNumber(min)}
                aria-valuenow={toNumber(value) ?? undefined}
                className={className ? `octane-number-input ${className}` : 'octane-number-input'}
                // Keeps the role a native number input has; Base UI renders a text input.
                role="spinbutton"
                onBlur={(event) => {
                    setFocused(false);
                    onBlur?.(event);
                }}
                onFocus={(event) => {
                    setFocused(true);
                    onFocus?.(event);
                }}
                onMouseEnter={(event) => {
                    show();
                    onMouseEnter?.(event);
                }}
                onMouseLeave={(event) => {
                    hideSoon();
                    onMouseLeave?.(event);
                }}
                {...rest}
            />
            {steppersVisible && <NumberSteppers input={input} onEnter={show} onLeave={hideSoon} />}
        </NumberField.Root>
    );
};
