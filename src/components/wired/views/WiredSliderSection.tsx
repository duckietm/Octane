import { FC, useEffect, useState } from 'react';
import { Slider, Text } from '../../../common';
import { NumberInput } from '../../../common/NumberInput';

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

/** The official createSliderSection: a titled slider, with an editable number in the header by default. */
export const WiredSliderSection: FC<WiredSliderSectionProps> = props => {
    const { title, value, min, max, step = 1, numberInput = true, toDisplay = identity, fromDisplay = identity, displayStep = 1, onChange } = props;
    const clamp = (next: number) => Math.max(min, Math.min(max, Math.round(next / step) * step));
    const [typed, setTyped] = useState(String(toDisplay(value)));

    useEffect(() => setTyped(String(toDisplay(value))), [ toDisplay, value ]);

    const commit = (text: string) => {
        const shown = parseFloat(text.replace(',', '.'));

        if (Number.isFinite(shown)) onChange(clamp(fromDisplay(shown)));
        else setTyped(String(toDisplay(value)));
    };

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
                <Text bold>{title}</Text>
                {numberInput && (
                    <NumberInput className="form-control form-control-sm text-center" step={displayStep} style={{ width: 64 }} value={typed} onBlur={event => commit(event.target.value)} onChange={event => setTyped(event.target.value)} onKeyDown={event => event.key === 'Enter' && commit((event.target as HTMLInputElement).value)} />
                )}
            </div>
            <Slider max={max} min={min} step={step} value={value} onChange={next => onChange(clamp(Array.isArray(next) ? next[0] : Number(next)))} />
        </div>
    );
};

/** Official SliderValuePulses: v half-second pulses shown as seconds. */
export const PULSES_TO_SECONDS = (value: number) => value / 2;
export const SECONDS_TO_PULSES = (seconds: number) => Math.round(seconds * 2);
