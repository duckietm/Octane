import { FC } from 'react';
import { LocalizeShortNumber, localizeWithFallback } from '../../../api';
import creditsIcon from '../../../assets/images/purse/air/credits.png';
import diamondIcon from '../../../assets/images/purse/air/diamond.png';
import ducketsIcon from '../../../assets/images/purse/air/duckets.png';
import { LayoutCurrencyIcon, Text } from '../../../common';
import { BaseButton } from '../../../common/BaseButton';
import { Hint } from '../../../common/Tooltip';

interface CurrencyViewProps {
    type: number;
    amount: number;
    /** `currency.display.number.short`: ours; AIR always shows the whole number. */
    short: boolean;
    onClick?: () => void;
}

const AIR_PURSE_ICONS: Record<number, string> = {
    [-1]: creditsIcon,
    0: ducketsIcon,
    5: diamondIcon
};

/** AIR purse_xml tool_tip_caption of each row. */
const AIR_PURSE_TOOLTIPS: Record<number, { key: string; fallback: string }> = {
    [-1]: { key: 'purse_coins', fallback: 'Credits' },
    0: { key: 'achievements.activitypoint.0', fallback: 'Duckets' },
    5: { key: 'achievements.activitypoint.5', fallback: 'Diamonds' }
};

/**
 * One AIR purse row (credit_count_button, ducket_count_button, diamond_count_button): the amount as a plain
 * number (`balance.toString()`, growing to the left of the 15 px icon), the currency name as its tooltip, and a
 * click that opens what the row is about.
 */
export const CurrencyView: FC<CurrencyViewProps> = (props) => {
    const { type = -1, amount = -1, short = false, onClick = null } = props;
    const airIcon = AIR_PURSE_ICONS[type];
    const tooltip = AIR_PURSE_TOOLTIPS[type];
    const label = tooltip ? localizeWithFallback(tooltip.key, tooltip.fallback) : '';
    const displayAmount = short ? LocalizeShortNumber(amount).toLowerCase() : String(amount);

    const row = (
        <BaseButton
            aria-label={label ? `${label}: ${amount}` : String(amount)}
            className={`octane-purse-button allcurrencypurse currency-info currency-${type}`}
            type="button"
            onClick={(event) => {
                event.stopPropagation();
                onClick?.();
            }}
        >
            <Text textEnd variant="white" className="octane-purse-button__amount currency-text">
                {displayAmount}
            </Text>
            {airIcon ? <img src={airIcon} alt="" className="octane-purse-air-currency" /> : <LayoutCurrencyIcon type={type} />}
        </BaseButton>
    );

    // A shortened amount shows the whole number in the tooltip too.
    const hint = short ? `${label} ${amount}`.trim() : label;

    return hint ? <Hint content={hint}>{row}</Hint> : row;
};
