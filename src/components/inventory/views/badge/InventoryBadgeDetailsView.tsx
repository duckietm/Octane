import { FC } from 'react';
import { GetConfigurationValue, LocalizeBadgeDescription, LocalizeBadgeName, localizeWithFallback } from '../../../../api';
import { badgeRarityColorToCss, formatBadgeOwnerCount, getBadgeRarityTagColor, shouldShowBadgeOwnerCount } from '../../../../api/badges/badgeRarity';
import { LayoutBadgeImageView } from '../../../../common';
import { getBadgeRarityTierLabel, getInventoryBadgeRarity } from './inventoryBadgeFilters';

/**
 * The official `badge_details` layout (BadgesView.updateSelectedBadgeDetails): the badge name in
 * bold, its description, a coloured `rarity_tag` reading "<Tier> badge" (tiers below rare read
 * "Common"), and the owner count while it stays under 1000.
 */
export const InventoryBadgeDetailsView: FC<{ badgeCode: string }> = (props) => {
    const { badgeCode = null } = props;
    const uncommonRarityEnabled = GetConfigurationValue<boolean>('badge_rarity.uncommon', false) === true;
    const rarity = getInventoryBadgeRarity(badgeCode);
    const description = LocalizeBadgeDescription(badgeCode);
    const showOwnerCount = !!rarity && shouldShowBadgeOwnerCount(rarity.ownerCount);
    const rarityLabel = rarity ? getBadgeRarityTierLabel(rarity.tier, uncommonRarityEnabled) : '';
    const ownerCountText = rarity ? formatBadgeOwnerCount(rarity.ownerCount) : '';

    if (!badgeCode) return null;

    return (
        <div className="octane-inventory-badge-details flex gap-2" data-testid="inventory-badge-details">
            <LayoutBadgeImageView shrink badgeCode={badgeCode} />
            <div className="flex flex-col gap-[3px] min-w-0 grow">
                <span className="octane-inventory-badge-details__name text-sm font-bold truncate">{LocalizeBadgeName(badgeCode)}</span>
                {description && description !== `badge_desc_${badgeCode}` && (
                    <span className="octane-inventory-badge-details__desc text-xs">{description}</span>
                )}
                {rarity && (
                    <span
                        className="octane-inventory-badge-details__rarity self-start rounded-[3px] px-[5px] py-[2px] text-[10px] font-bold text-white"
                        data-rarity-tier={rarity.tier}
                        style={{ backgroundColor: badgeRarityColorToCss(getBadgeRarityTagColor(rarity.tier, uncommonRarityEnabled)) }}
                    >
                        {localizeWithFallback('badge.rarity.badge', `${rarityLabel} badge`, ['rarity'], [rarityLabel])}
                    </span>
                )}
                {showOwnerCount && (
                    <span className="octane-inventory-badge-details__owners text-xs">
                        {localizeWithFallback('badge.owner_count', `Owned by ${ownerCountText} Habbos`, ['count'], [ownerCountText])}
                    </span>
                )}
            </div>
        </div>
    );
};
