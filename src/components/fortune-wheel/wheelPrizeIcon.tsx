import { GetRoomEngine, IWheelPrize } from '@octane/renderer';
import { ReactNode } from 'react';
import { Column, LayoutBadgeImageView, LayoutCurrencyIcon, LayoutImage } from '../../common';

// Shared prize-icon renderer used both on the wheel slices (small) and in the
// win-reveal overlay (large). Keeping it in one place means the two stay
// visually consistent when prize types change.
export const renderPrizeIcon = (prize: IWheelPrize, large = false): ReactNode => {
    const imageClass = large ? 'h-20 w-20' : 'h-9 w-9';
    const amountClass = large ? 'text-xl font-bold text-[#2a3a42]' : 'text-[10px] font-bold text-[#2a3a42]';

    switch (prize.type) {
        case 'item':
            return (
                <LayoutImage
                    imageUrl={GetRoomEngine().getFurnitureFloorIconUrl(prize.spriteId)}
                    className={`${imageClass} bg-contain bg-center bg-no-repeat`}
                />
            );
        case 'badge':
            return (
                <div className={large ? 'scale-[1.8]' : ''}>
                    <LayoutBadgeImageView badgeCode={prize.badgeCode} />
                </div>
            );
        case 'credits':
            return (
                <Column alignItems="center" gap={0}>
                    <div className={large ? 'scale-150' : ''}>
                        <LayoutCurrencyIcon type={-1} />
                    </div>
                    <span className={amountClass}>{prize.amount}</span>
                </Column>
            );
        case 'points':
            return (
                <Column alignItems="center" gap={0}>
                    <div className={large ? 'scale-150' : ''}>
                        <LayoutCurrencyIcon type={prize.pointsType} />
                    </div>
                    <span className={amountClass}>{prize.amount}</span>
                </Column>
            );
        case 'spin':
            return <span className={large ? 'text-2xl font-bold text-[#2a3a42]' : 'text-xs font-bold text-[#2a3a42]'}>+{prize.amount}</span>;
        default:
            return <span className={large ? 'text-2xl font-bold text-[#2a3a42]/60' : 'text-xs font-bold text-[#2a3a42]/60'}>—</span>;
    }
};
