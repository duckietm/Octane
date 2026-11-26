import { CreateLinkEvent } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { GetConfigurationValue, GetOptionalConfigurationValue, localizeWithFallback } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import { NativeText } from '../../../common/native-text/NativeText';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

interface SeasonalViewProps {
    type: number;
    amount: number;
}

/** purse_indicator_seasonal_xml: the name colour 0xbb7dc3. */
const NAME_COLOR = 0xbb7dc3;

/** AIR CurrencyIndicatorBase: a 40 ms timer moves the change on by 0.025, so a change runs 40 ticks (1.6 s). */
const CHANGE_TICK_MS = 40;
const CHANGE_STEP = 0.025;
/** The 192 px row and the 33 px change overlay that slides across it. */
const INDICATOR_WIDTH = 192;
const OVERLAY_WIDTH = 33;

interface BalanceChange {
    id: number;
    from: number;
    to: number;
    progress: number;
}

/** The last balance seen: a later different balance starts a change, the first one does not. */
const useBalanceChange = (amount: number): BalanceChange | null => {
    const [seen, setSeen] = useState({ amount, count: 0 });
    const [change, setChange] = useState<BalanceChange | null>(null);
    const changeId = change?.id ?? 0;

    if (seen.amount !== amount) {
        setSeen({ amount, count: seen.count + 1 });
        setChange({ id: seen.count + 1, from: seen.amount, to: amount, progress: 0 });
    }

    useEffect(() => {
        if (changeId === 0) return;

        const timer = setInterval(() => {
            setChange((previous) => {
                if (!previous || previous.id !== changeId) return previous;

                const progress = previous.progress + CHANGE_STEP;

                return progress >= 1 - CHANGE_STEP ? null : { ...previous, progress };
            });
        }, CHANGE_TICK_MS);

        return () => clearInterval(timer);
    }, [changeId]);

    return change;
};

/** AIR SeasonalCurrencyIndicator: the name (activitypoint.name.<type>, localized), else ours. */
const currencyName = (type: number): string => {
    const nameKey = GetOptionalConfigurationValue<string>(`activitypoint.name.${type}`, '');

    if (nameKey) return localizeWithFallback(nameKey, nameKey);

    return localizeWithFallback(`purse.seasonal.currency.${type}`, '');
};

/**
 * AIR purse_indicator_seasonal (192 x 29) and SeasonalCurrencyIndicator: the currency's name, the amount as a whole
 * number ("Info" underlined at 0), the icon in its badge, and a click that opens `seasonalcurrencyindicator.page`. A
 * change slides a "+50" overlay across the row while the amount counts to the new balance in the second half.
 */
export const SeasonalView: FC<SeasonalViewProps> = (props) => {
    const { type = -1, amount = -1 } = props;
    const iconUrl = GetConfigurationValue<string>('currency.asset.icon.url', '').replace('%type%', type.toString());
    const catalogPage = GetOptionalConfigurationValue<string>('seasonalcurrencyindicator.page', '');
    const change = useBalanceChange(amount);
    // The counter keeps the old balance for the first half of the change, then counts to the new one.
    const shownAmount = change ? Math.trunc(change.from + Math.max(0, change.progress * 2 - 1) * (change.to - change.from)) : amount;
    const isZero = shownAmount === 0;
    const amountText = isZero ? localizeWithFallback('purse.snowflakes.zero.amount.text', 'Info') : String(shownAmount);
    // The overlay eases across the row (4 (t - 0.5)^3 + 0.5) and fades in, then out, around its middle.
    const overlayT = change ? 4 * (change.progress - 0.5) ** 3 + 0.5 : 0;

    return (
        <NativeTextTree>
            <BaseButton
                className="octane-purse-seasonal-currency"
                type="button"
                onClick={() => {
                    if (catalogPage) CreateLinkEvent(`catalog/open/${catalogPage}`);
                }}
            >
                {/* seasonal_name (5,6) 105 wide: il_regular_white made bold with thickness 200, in the name colour */}
                <span className="seasonal-text">
                    <NativeText
                        nativeResolution
                        background={null}
                        maxWidth={105}
                        overrides={{ bold: true, thickness: 200, color: NAME_COLOR }}
                        text={currencyName(type)}
                        textStyle="il_regular_white"
                    />
                </span>
                {/* amount (90,6) 60 wide, right aligned, bold white; the zero text underlined */}
                <span className={`seasonal-amount${isZero ? ' is-zero' : ''}`}>
                    <NativeText background={null} overrides={{ bold: true, underline: isZero }} text={amountText} textStyle="il_regular_white" />
                </span>
                <span className="seasonal-badge">{iconUrl && <img src={iconUrl} alt="" className="seasonal-image" />}</span>
                {change && (
                    <span
                        className="seasonal-change"
                        aria-hidden="true"
                        style={{
                            left: Math.round(overlayT * (INDICATOR_WIDTH - OVERLAY_WIDTH)),
                            opacity: Math.min(1, Math.max(0, 1 - Math.abs(0.5 - overlayT) * 2))
                        }}
                    >
                        {`${change.to > change.from ? '+' : ''}${change.to - change.from}`}
                    </span>
                )}
            </BaseButton>
        </NativeTextTree>
    );
};
