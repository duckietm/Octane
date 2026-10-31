import { CreateLinkEvent } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { GetConfigurationValue, GetOptionalConfigurationValue, localizeWithFallback } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

interface SeasonalViewProps {
    type: number;
    amount: number;
}

/** AIR CurrencyIndicatorBase: the change overlay runs 40 steps of 40 ms. */
const CHANGE_ANIMATION_MS = 1000;

/** AIR SeasonalCurrencyIndicator: the name (activitypoint.name.<type>, localized), else ours. */
const currencyName = (type: number): string => {
    const nameKey = GetOptionalConfigurationValue<string>(`activitypoint.name.${type}`, '');

    if (nameKey) return localizeWithFallback(nameKey, nameKey);

    return localizeWithFallback(`purse.seasonal.currency.${type}`, '');
};

/**
 * AIR purse_indicator_seasonal (192 x 29) and SeasonalCurrencyIndicator: the currency's name, the amount as a whole
 * number ("Info" underlined at 0), the icon in its box, and a click that opens `seasonalcurrencyindicator.page`. A
 * change slides a "+50" overlay across the row while the amount counts to the new balance.
 */
export const SeasonalView: FC<SeasonalViewProps> = (props) => {
    const { type = -1, amount = -1 } = props;
    const iconUrl = GetConfigurationValue<string>('currency.asset.icon.url', '').replace('%type%', type.toString());
    const catalogPage = GetOptionalConfigurationValue<string>('seasonalcurrencyindicator.page', '');
    const previousAmount = useRef<number>(null);
    const [shownAmount, setShownAmount] = useState(amount);
    const [change, setChange] = useState<{ text: string; key: number } | null>(null);

    useEffect(() => {
        const start = previousAmount.current;

        previousAmount.current = amount;

        if (start === null || start === amount) {
            setShownAmount(amount);
            return;
        }

        setChange({ text: `${amount > start ? '+' : ''}${amount - start}`, key: Date.now() });

        // The amount counts up during the second half, as AIR's lerp(max(0, phase * 2 - 1)).
        const began = performance.now();
        let frame = 0;

        const tick = (now: number) => {
            const phase = Math.min(1, (now - began) / CHANGE_ANIMATION_MS);
            const progress = Math.max(0, phase * 2 - 1);

            setShownAmount(Math.round(start + (amount - start) * progress));

            if (phase < 1) frame = requestAnimationFrame(tick);
            else setChange(null);
        };

        frame = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(frame);
    }, [amount]);

    const isZero = shownAmount === 0;
    const amountText = isZero ? localizeWithFallback('purse.snowflakes.zero.amount.text', 'Info') : String(shownAmount);

    return (
        <NativeTextTree>
            <BaseButton
                className="octane-purse-seasonal-currency"
                type="button"
                onClick={() => {
                    if (catalogPage) CreateLinkEvent(`catalog/open/${catalogPage}`);
                }}
            >
                <span className="seasonal-text">{currencyName(type)}</span>
                <span className={`seasonal-amount${isZero ? ' is-zero' : ''}`}>{amountText}</span>
                <span className="octane-seasonal-box">{iconUrl && <img src={iconUrl} alt="" className="seasonal-image" />}</span>
                {change && (
                    <span key={change.key} className="seasonal-change" aria-hidden="true">
                        {change.text}
                    </span>
                )}
            </BaseButton>
        </NativeTextTree>
    );
};
