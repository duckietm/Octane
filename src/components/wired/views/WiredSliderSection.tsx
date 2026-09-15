import { FC, useEffect, useState } from 'react';
import { localizeWithFallback } from '../../../api';
import { Slider, Text } from '../../../common';
import { OctaneInput } from '../../../layout';

/**
 * A slider with the editable number box the official window puts beside its title, 40px wide.
 *
 * The box keeps its own draft while the builder types, so an intermediate value does not fight
 * the slider, and commits on blur or Enter. That clamp stands in for the official red invalid
 * border and its message, which we do not ship: an out-of-range number snaps instead of
 * complaining.
 */
export interface WiredSliderSectionProps {
    titleKey: string;
    titleFallback: string;
    titleParameters?: string[];
    titleReplacements?: string[];
    min: number;
    max: number;
    step?: number;
    value: number;
    normalize?: (value: number) => number;
    onChange: (value: number) => void;
    /**
     * The official number box shows the CONVERTED value, not the stored one - a pulses slider
     * reads 2.5 where it stores 5. Pass the pair when the two differ; `boxStep` is then the step
     * of the displayed unit.
     */
    toDisplay?: (value: number) => string;
    fromDisplay?: (text: string) => number;
    boxStep?: number;
}

export const WiredSliderSection: FC<WiredSliderSectionProps> = (props) => {
    const {
        titleKey = null,
        titleFallback = '',
        titleParameters = null,
        titleReplacements = null,
        min = 0,
        max = 0,
        step = 1,
        value = 0,
        normalize = null,
        onChange = null,
        toDisplay = null,
        fromDisplay = null,
        boxStep = null
    } = props;

    const display = (next: number): string => (toDisplay ? toDisplay(next) : String(next));
    const [draft, setDraft] = useState(display(value));

    useEffect(() => setDraft(display(value)), [value, toDisplay]);

    const clamp = (next: number): number => {
        const bounded = Math.max(min, Math.min(max, Number.isFinite(next) ? next : min));

        return normalize ? normalize(bounded) : bounded;
    };

    const commit = () => {
        const next = clamp(fromDisplay ? fromDisplay(draft) : Number(draft));

        setDraft(display(next));
        onChange(next);
    };

    return (
        <div className="octane-wired__section">
            <div className="octane-wired__slider-header">
                <Text bold>{localizeWithFallback(titleKey, titleFallback, titleParameters, titleReplacements)}</Text>
                <OctaneInput
                    className="octane-wired__slider-number"
                    max={toDisplay ? undefined : max}
                    min={toDisplay ? undefined : min}
                    step={boxStep ?? step}
                    type="number"
                    value={draft}
                    onBlur={commit}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') commit();
                    }}
                />
            </div>
            <Slider
                max={max}
                min={min}
                step={step}
                value={value}
                onChange={(next) => onChange(clamp(Array.isArray(next) ? next[0] : Number(next)))}
            />
        </div>
    );
};
