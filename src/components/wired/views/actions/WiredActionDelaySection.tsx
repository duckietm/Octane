import { FC, useEffect, useState } from 'react';
import {
    encodeWiredDelay,
    formatWiredDelaySeconds,
    isPreciseWiredDelay,
    LocalizeText,
    WIRED_ACTION_DELAY_MAX_PRECISE_STEPS,
    WIRED_ACTION_DELAY_MAX_PULSES,
    wiredDelayUnits
} from '../../../../api';
import { restrictWiredNumberInput, validateWiredNumberInput, WiredNumberInputError, WiredNumberInputRange, wiredNumberInputMessage } from '../../../../api/wired/WiredNumberInput';
import delayPreciseIcon from '../../../../assets/images/wired/delay/delay_precise.png';
import delayStandardIcon from '../../../../assets/images/wired/delay/delay_standard.png';
import { Slider, Text } from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { Hint } from '../../../../common/Tooltip';

interface WiredActionDelaySectionProps {
    /** The delay as sent: pulses, or a negative number of milliseconds in precise mode. */
    value: number;
    onChange: (value: number) => void;
}

/**
 * The official delay section: "Delay (seconds):" with a number field, a Standard (0.5 s) / Precise
 * (0.05 s) mode button, and the slider of that mode.
 */
export const WiredActionDelaySection: FC<WiredActionDelaySectionProps> = ({ value, onChange }) => {
    const [precise, setPrecise] = useState(isPreciseWiredDelay(value));
    const [menuOpen, setMenuOpen] = useState(false);
    const [typed, setTyped] = useState<string>(null);
    const [error, setError] = useState<WiredNumberInputError | null>(null);

    // A loaded delay says its mode; zero keeps the mode the user picked.
    useEffect(() => {
        if (value < 0) setPrecise(true);
        else if (value > 0) setPrecise(false);
    }, [value]);

    const units = wiredDelayUnits(value);
    // Official NumberInputPreset on the delay: whole steps of 0.5 s (standard) or 0.05 s (precise).
    const range: WiredNumberInputRange = precise
        ? { min: 0, max: WIRED_ACTION_DELAY_MAX_PRECISE_STEPS, toDisplay: (steps) => steps / 20, fromDisplay: (seconds) => seconds * 20 }
        : { min: 0, max: WIRED_ACTION_DELAY_MAX_PULSES, toDisplay: (pulses) => pulses / 2, fromDisplay: (seconds) => seconds * 2 };

    const onType = (text: string) => {
        const restricted = restrictWiredNumberInput(text, range);
        const result = validateWiredNumberInput(restricted, range);

        setTyped(restricted);

        if ('error' in result) {
            setError(result.error);
            return;
        }

        setError(null);
        onChange(encodeWiredDelay(result.value, precise));
    };

    const selectMode = (nextPrecise: boolean) => {
        setMenuOpen(false);

        if (nextPrecise === precise) return;

        setPrecise(nextPrecise);
        // Keep the time: 1 pulse is 10 precise steps.
        onChange(encodeWiredDelay(nextPrecise ? units * 10 : units / 10, nextPrecise));
    };

    return (
        <NativeTextTree>
            <div className="flex flex-col octane-wired__section octane-wired__section--delay">
                <div className="octane-wired__delay-head">
                    <Text bold>{LocalizeText('wiredfurni.params.delay.seconds')}</Text>
                    <div className="relative">
                        <input
                            aria-invalid={!!error}
                            className={`octane-wired__delay-input ${error ? 'is-invalid' : ''}`}
                            inputMode="decimal"
                            type="text"
                            value={typed ?? formatWiredDelaySeconds(value)}
                            onBlur={() => {
                                // An invalid number is dropped for the stored delay, as the slider still shows it.
                                setTyped(null);
                                setError(null);
                            }}
                            onChange={(event) => onType(event.target.value)}
                        />
                        {error && (
                            <div className="octane-wired__value-input-error" role="alert">
                                {wiredNumberInputMessage(error)}
                            </div>
                        )}
                    </div>
                    <div className="octane-wired__delay-mode">
                        <Hint content={LocalizeText(precise ? 'wiredfurni.params.delay.mode.precise' : 'wiredfurni.params.delay.mode.standard')}>
                            <BaseButton aria-label={LocalizeText(precise ? 'wiredfurni.params.delay.mode.precise' : 'wiredfurni.params.delay.mode.standard')}
                                type="button"
                                className="octane-wired__delay-mode-button"
                                onClick={() => setMenuOpen((open) => !open)}
                            >
                                <img src={precise ? delayPreciseIcon : delayStandardIcon} alt="" />
                            </BaseButton>
                        </Hint>
                        {menuOpen && (
                            <div className="octane-wired__delay-mode-menu">
                                <BaseButton type="button" className={!precise ? 'is-active' : ''} onClick={() => selectMode(false)}>
                                    {LocalizeText('wiredfurni.params.delay.mode.standard')}
                                </BaseButton>
                                <BaseButton type="button" className={precise ? 'is-active' : ''} onClick={() => selectMode(true)}>
                                    {LocalizeText('wiredfurni.params.delay.mode.precise')}
                                </BaseButton>
                            </div>
                        )}
                    </div>
                </div>
                <Slider
                    max={precise ? WIRED_ACTION_DELAY_MAX_PRECISE_STEPS : WIRED_ACTION_DELAY_MAX_PULSES}
                    min={0}
                    value={units}
                    onChange={(next) => {
                        setTyped(null);
                        setError(null);
                        onChange(encodeWiredDelay(next, precise));
                    }}
                />
            </div>
        </NativeTextTree>
    );
};
