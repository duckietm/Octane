import { FC } from 'react';
import {
    LayoutAvatarImageView,
    LayoutBadgeImageView,
    LayoutCurrencyIcon,
    LayoutFurniIconImageView,
    LayoutHabbiconImageView,
    LayoutPetImageView
} from '../../common';

const CURRENCY_TYPES: Record<string, number> = { credits: -1, duckets: 0, diamonds: 5 };

/** The product_icon widget (40x40) of a prize. */
export const RewardTrackRewardIcon: FC<{ rewardTypeId: string; extraParams: string; productItemTypeId: number }> = ({
    rewardTypeId,
    extraParams,
    productItemTypeId
}) => {
    const type = (rewardTypeId || '').toLowerCase();

    if (type in CURRENCY_TYPES) return <LayoutCurrencyIcon type={CURRENCY_TYPES[type]} className="octane-reward-track-prize-currency" />;

    if (type === 'badge') return <LayoutBadgeImageView badgeCode={extraParams} />;

    // A furni prize: the server sends its sprite id and "<s|i>:<name>" (floor or wall, then the items_base name).
    if (type === 'furni')
        return (
            <LayoutFurniIconImageView
                productType={extraParams.startsWith('i:') ? 'i' : 's'}
                productClassId={productItemTypeId}
                className="octane-reward-track-prize-furni"
            />
        );

    // A Habbicon prize: its id is the product item type.
    if (type === 'habbicon') return <LayoutHabbiconImageView id={productItemTypeId} size={40} />;

    // A bot or a pet prize (AIR ProductIconWidget product types 6 and 10): the server sends its figure.
    if (type === 'bot' && extraParams) return <LayoutAvatarImageView className="octane-reward-track-prize-bot" direction={2} figure={extraParams} headOnly />;

    if (type === 'pet' && extraParams) return <LayoutPetImageView className="octane-reward-track-prize-pet" direction={2} figure={extraParams} />;

    return <div className="octane-reward-track-prize-generic">{rewardTypeId}</div>;
};
