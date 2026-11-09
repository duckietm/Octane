import { GetRoomEngine, IWheelPrize } from '@octane/renderer';
import { ReactNode } from 'react';
import { LayoutBadgeImageView, LayoutCurrencyIcon, LayoutImage } from '../../common';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

// Shared prize-icon renderer used both on the wheel slices (small) and in the
// win-reveal overlay (large). Keeping it in one place means the two stay
// visually consistent when prize types change. The look lives in FortuneWheelView.css.
export const renderPrizeIcon = (prize: IWheelPrize, large = false): ReactNode => {
    const size = large ? 'is-large' : 'is-small';

    switch (prize.type) {
        case 'item':
            return (
                <NativeTextTree>
                    <LayoutImage imageUrl={GetRoomEngine().getFurnitureFloorIconUrl(prize.spriteId)} className={`wheel-prize-furni ${size}`} />
                </NativeTextTree>
            );
        case 'badge':
            return (
                <NativeTextTree>
                    <div className={`wheel-prize-badge ${size}`}>
                        <LayoutBadgeImageView badgeCode={prize.badgeCode} />
                    </div>
                </NativeTextTree>
            );
        case 'credits':
        case 'points':
            return (
                <NativeTextTree>
                    <div className={`wheel-prize-currency ${size}`}>
                        <LayoutCurrencyIcon type={prize.type === 'credits' ? -1 : prize.pointsType} classNames={['wheel-prize-currency-icon']} />
                        <span className="wheel-prize-amount">{prize.amount}</span>
                    </div>
                </NativeTextTree>
            );
        case 'spin':
            return (
                <NativeTextTree>
                    <div className={`wheel-prize-spin ${size}`}>
                        <span className="wheel-prize-spin-icon" />
                        <span className="wheel-prize-amount">+{prize.amount}</span>
                    </div>
                </NativeTextTree>
            );
        default:
            // The empty slice: a plain mark, not a text glyph (the pixel font has no dash and drew a note instead).
            return <span className={`wheel-prize-nothing ${size}`} aria-hidden="true" />;
    }
};
