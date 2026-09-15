import { CSSProperties, FC, useEffect, useMemo, useRef, useState } from 'react';
import { LocalizeFormattedNumber, LocalizeShortNumber } from '../../../api';
import creditsIcon from '../../../assets/images/purse/air/credits.png';
import diamondIcon from '../../../assets/images/purse/air/diamond.png';
import ducketsIcon from '../../../assets/images/purse/air/duckets.png';
import { Flex, LayoutCurrencyIcon, Text } from '../../../common';
import { CURRENCY_CHANGE_OVERLAY_MS, formatCurrencyChange } from './currencyChange';

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

/**
 * Sits on top of the indicator; the flyover motion is driven through the Web Animations API
 * below so the purse stylesheet needs no keyframes for it.
 */
const changeOverlayStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    display: 'flex',
    alignItems: 'center',
    paddingLeft: 4,
    fontWeight: 'bold',
    pointerEvents: 'none',
    color: '#ffffff',
    textShadow: '0 1px 0 rgba(0, 0, 0, 0.45)'
};

/**
 * The official `change_overlay` slides from the left edge to the right edge of the indicator
 * while fading in and back out (CurrencyIndicatorBase.onOverlayTimer).
 */
const playChangeFlyover = (element: HTMLElement) => {
    if (!element || typeof element.animate !== 'function') return;

    const travel = Math.max(0, (element.parentElement?.clientWidth ?? 0) - element.clientWidth);

    element.animate(
        [
            { transform: 'translateX(0px)', opacity: 0 },
            { opacity: 1, offset: 0.5 },
            { transform: `translateX(${travel}px)`, opacity: 0 }
        ],
        { duration: CURRENCY_CHANGE_OVERLAY_MS, easing: 'ease-in-out', fill: 'forwards' }
    );
};

export const CurrencyView: FC<CurrencyViewProps> = (props) => {
    const { type = -1, amount = -1, short = false } = props;
    const [change, setChange] = useState<string>(null);
    const previousAmountRef = useRef<number>(null);
    const shouldShorten = short || Math.abs(amount) >= 1000;
    const displayAmount = useMemo(() => {
        if (!shouldShorten) return LocalizeFormattedNumber(amount);

        return LocalizeShortNumber(amount).toLowerCase();
    }, [amount, shouldShorten]);
    const airIcon = AIR_PURSE_ICONS[type];

    useEffect(() => {
        const nextChange = formatCurrencyChange(previousAmountRef.current, amount);

        previousAmountRef.current = amount;

        if (!nextChange) return;

        setChange(nextChange);

        const timeout = setTimeout(() => setChange(null), CURRENCY_CHANGE_OVERLAY_MS);

        return () => clearTimeout(timeout);
    }, [amount]);

    const element = useMemo(() => {
        return (
            <Flex justifyContent="end" pointer gap={1} className={`octane-purse-button allcurrencypurse octane-purse-button currency-info currency-${type}`}>
                <Text truncate textEnd variant="white" grow className="octane-purse-button__amount currency-text">
                    {displayAmount}
                </Text>
                {airIcon ? <img src={airIcon} alt="" className="octane-purse-air-currency" /> : <LayoutCurrencyIcon type={type} />}
            </Flex>
        );
    }, [airIcon, displayAmount, type]);

    const changeOverlay = change && (
        <span
            key={`${amount}-${change}`}
            ref={playChangeFlyover}
            aria-live="polite"
            className="octane-purse-change-overlay"
            data-testid="purse-currency-change"
            style={changeOverlayStyle}
        >
            {change}
        </span>
    );

    if (!shouldShorten) {
        return (
            <div className="relative">
                {element}
                {changeOverlay}
            </div>
        );
    }

    return (
        <div className="group relative">
            {element}
            {changeOverlay}
            <div
                role="tooltip"
                className="pointer-events-none absolute right-full top-1/2 z-50 mr-2 -translate-y-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity duration-150 group-hover:opacity-100"
            >
                {LocalizeFormattedNumber(amount)}
            </div>
        </div>
    );
};
