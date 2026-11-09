import { FC, useEffect, useState } from 'react';
import { formatWiredNumber, restrictWiredNumberInput, validateWiredNumberInput, WiredNumberInputError, wiredNumberInputMessage } from '../../../api/wired/WiredNumberInput';
import { Slider, Text } from '../../../common';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

interface WiredSliderSectionProps {
    /** The section title, already localized (the official %param% already filled in). */
    title: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    /** The official number input in the section header; off when the title carries the value. */
    numberInput?: boolean;
    /** The slider value as the header shows it (pulses as seconds, steps as ms...). */
    toDisplay?: (value: number) => number;
    /** A typed header number back to a slider value. */
    fromDisplay?: (shown: number) => number;
    /** The header input's step, in shown units. */
    displayStep?: number;
    onChange: (value: number) => void;
}

const identity = (value: number) => value;

/**
 * The official createSliderSection: a titled slider, with an editable number in the header by default.
 * The number is checked as AIR's NumberInputPreset checks it, on every change: a valid number moves the
 * slider at once, anything else keeps what was typed, turns the field invalidInputBackgroundColor and
 * shows the wiredfurni.params.number_input.* warning above it; nothing is clamped or rounded.
 */
export const WiredSliderSection: FC<WiredSliderSectionProps> = (props) => {
    const { title, value, min, max, step = 1, numberInput = true, toDisplay = identity, fromDisplay = identity, onChange } = props;
    const clamp = (next: number) => Math.max(min, Math.min(max, Math.round(next / step) * step));
    const [typed, setTyped] = useState(formatWiredNumber(toDisplay(value)));
    const [error, setError] = useState<WiredNumberInputError | null>(null);
    const range = { min, max, step, toDisplay, fromDisplay };

    useEffect(() => {
        setTyped(formatWiredNumber(toDisplay(value)));
        setError(null);
    }, [toDisplay, value]);

    const onType = (text: string) => {
        const restricted = restrictWiredNumberInput(text, range);
        const result = validateWiredNumberInput(restricted, range);

        setTyped(restricted);

        if ('error' in result) {
            setError(result.error);
            return;
        }

        setError(null);

        if (result.value !== value) onChange(result.value);
    };

    return (
        <NativeTextTree>
            <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                    <Text bold>{title}</Text>
                    {numberInput && (
                        <div className="relative">
                            <input
                                aria-invalid={!!error}
                                className={`form-control form-control-sm text-center octane-wired__number-input ${error ? 'is-invalid' : ''}`}
                                inputMode="decimal"
                                style={{ width: 64 }}
                                type="text"
                                value={typed}
                                onChange={(event) => onType(event.target.value)}
                            />
                            {error && (
                                <div className="octane-wired__value-input-error" role="alert">
                                    {wiredNumberInputMessage(error)}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <Slider max={max} min={min} step={step} value={value} onChange={(next) => onChange(clamp(Array.isArray(next) ? next[0] : Number(next)))} />
            </div>
        </NativeTextTree>
    );
};

/** Official SliderValuePulses: v half-second pulses shown as seconds. */
export const PULSES_TO_SECONDS = (value: number) => value / 2;
export const SECONDS_TO_PULSES = (seconds: number) => Math.round(seconds * 2);
