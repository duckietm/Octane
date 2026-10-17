import { FC, useEffect, useState } from 'react';
import {
    encodeWiredDelay,
    formatWiredDelaySeconds,
    isPreciseWiredDelay,
    LocalizeText,
    WIRED_ACTION_DELAY_MAX_PRECISE_STEPS,
    WIRED_ACTION_DELAY_MAX_PULSES,
    wiredDelayFromSeconds,
    wiredDelayUnits
} from '../../../../api';
import delayPreciseIcon from '../../../../assets/images/wired/delay/delay_precise.png';
import delayStandardIcon from '../../../../assets/images/wired/delay/delay_standard.png';
import { Slider, Text } from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';
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

    // A loaded delay says its mode; zero keeps the mode the user picked.
    useEffect(() => {
        if (value < 0) setPrecise(true);
        else if (value > 0) setPrecise(false);
    }, [value]);

    const units = wiredDelayUnits(value);

    const selectMode = (nextPrecise: boolean) => {
        setMenuOpen(false);

        if (nextPrecise === precise) return;

        setPrecise(nextPrecise);
        // Keep the time: 1 pulse is 10 precise steps.
        onChange(encodeWiredDelay(nextPrecise ? units * 10 : units / 10, nextPrecise));
    };

    return (
        <div className="flex flex-col octane-wired__section octane-wired__section--delay">
            <div className="octane-wired__delay-head">
                <Text bold>{LocalizeText('wiredfurni.params.delay.seconds')}</Text>
                <input
                    className="octane-wired__delay-input"
                    inputMode="decimal"
                    type="text"
                    value={typed ?? formatWiredDelaySeconds(value)}
                    onBlur={() => setTyped(null)}
                    onChange={(event) => {
                        setTyped(event.target.value);

                        const seconds = parseFloat(event.target.value.replace(',', '.'));

                        if (Number.isFinite(seconds)) onChange(wiredDelayFromSeconds(seconds, precise));
                    }}
                />
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
                    onChange(encodeWiredDelay(next, precise));
                }}
            />
        </div>
    );
};
