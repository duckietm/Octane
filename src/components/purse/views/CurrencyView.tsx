import { Tooltip } from '@base-ui/react/tooltip';
import { FC, useMemo } from 'react';
import { LocalizeFormattedNumber, LocalizeShortNumber } from '../../../api';
import creditsIcon from '../../../assets/images/purse/air/credits.png';
import diamondIcon from '../../../assets/images/purse/air/diamond.png';
import ducketsIcon from '../../../assets/images/purse/air/duckets.png';
import { Flex, LayoutCurrencyIcon, Text } from '../../../common';

interface CurrencyViewProps {
    type: number;
    amount: number;
    short: boolean;
}

const AIR_PURSE_ICONS: Record<number, string> = {
    [-1]: creditsIcon,
    0: ducketsIcon,
    5: diamondIcon
};

export const CurrencyView: FC<CurrencyViewProps> = (props) => {
    const { type = -1, amount = -1, short = false } = props;
    const shouldShorten = short || Math.abs(amount) >= 1000;
    const displayAmount = useMemo(() => {
        if (!shouldShorten) return LocalizeFormattedNumber(amount);

        return LocalizeShortNumber(amount).toLowerCase();
    }, [amount, shouldShorten]);
    const airIcon = AIR_PURSE_ICONS[type];

    const element = useMemo(() => {
        return (
            <Flex justifyContent="end" pointer gap={1} className={`octane-purse-button allcurrencypurse octane-purse-button currency-info currency-${type}`}>
                <Text truncate textEnd variant="white" grow className="octane-purse-button__amount currency-text">
                    {displayAmount}
                </Text>
                {airIcon
                    ? <img src={ airIcon } alt="" className="octane-purse-air-currency" />
                    : <LayoutCurrencyIcon type={ type } />}
            </Flex>
        );
    }, [airIcon, displayAmount, type]);

    if (!shouldShorten) return element;

    return (
        <Tooltip.Root>
            <Tooltip.Trigger delay={0} render={<div className="relative" />}>
                {element}
            </Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Positioner className="pointer-events-none z-[9999]" side="left" sideOffset={8}>
                    <Tooltip.Popup
                        role="tooltip"
                        className="whitespace-nowrap rounded bg-black/80 px-2 py-1 text-xs text-white shadow transition-opacity duration-150 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
                    >
                        {LocalizeFormattedNumber(amount)}
                    </Tooltip.Popup>
                </Tooltip.Positioner>
            </Tooltip.Portal>
        </Tooltip.Root>
    );
};
