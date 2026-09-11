import { BadgeImageReadyEvent, GetEventDispatcher, GetSessionDataManager, OctaneSprite, TextureUtils } from '@octane/renderer';
import { CSSProperties, FC, useEffect, useMemo, useRef, useState } from 'react';
import {
    BadgeLeaderboardStat,
    ensureBadgeLeaderboardLoaded,
    GetConfigurationValue,
    getCachedBadgeRarityStat,
    LocalizeBadgeDescription,
    LocalizeBadgeName,
    LocalizeText
} from '../../api';
import {
    badgeRarityColorToCss,
    formatBadgeOwnerCount,
    getBadgeRarityFromPacket,
    getBadgeRarityGlowColor,
    getBadgeRarityLabelKey,
    getBadgeRarityTagColor,
    getBadgeRarityTier,
    isBadgeRarityStandaloneTier,
    shouldShowBadgeOwnerCount
} from '../../api/badges/badgeRarity';
import { Base, BaseProps } from '../Base';
import { useTooltip } from '../Tooltip';

export interface LayoutBadgeImageViewProps extends BaseProps<HTMLDivElement> {
    badgeCode: string;
    isGroup?: boolean;
    showInfo?: boolean;
    customTitle?: string;
    isGrayscale?: boolean;
    scale?: number;
    showRarityInfo?: boolean;
    highlightRarity?: boolean;
}

/* Glow around the badge itself (highlightRarity). The official infostand
   (InfoStandUserView.setBadge) only glows standalone tiers — rare and above,
   plus uncommon when `badge_rarity.uncommon` is on — in the tier's colour;
   anything else stays flat. */
const glowCss = (color: number): string => {
    const red = (color >> 16) & 0xff;
    const green = (color >> 8) & 0xff;
    const blue = color & 0xff;

    return `rgba(${red}, ${green}, ${blue}, 0.75)`;
};

export const LayoutBadgeImageView: FC<LayoutBadgeImageViewProps> = (props) => {
    const {
        badgeCode = null,
        isGroup = false,
        showInfo = false,
        customTitle = null,
        isGrayscale = false,
        scale = 1,
        showRarityInfo = false,
        highlightRarity = false,
        classNames = [],
        style = {},
        children = null,
        ...rest
    } = props;
    const [imageElement, setImageElement] = useState<HTMLImageElement>(null);
    const [badgeRarityStat, setBadgeRarityStat] = useState<BadgeLeaderboardStat>(null);
    // The badges packet (1087) carries the official tier per worn slot; it
    // wins over the leaderboard classification when the server sent it.
    const packetRarity = !isGroup && badgeCode && (showRarityInfo || highlightRarity) ? getBadgeRarityFromPacket(badgeCode) : null;
    const badgeRef = useRef<HTMLDivElement>(null);

    const tooltipsEnabled = showInfo && GetConfigurationValue<boolean>('badge.descriptions.enabled', true);
    const uncommonRarityEnabled = GetConfigurationValue<boolean>('badge_rarity.uncommon', false) === true;
    const rarityTier = packetRarity ? packetRarity.tier : badgeRarityStat ? getBadgeRarityTier(badgeRarityStat.rarity) : null;
    const ownerCount = packetRarity ? packetRarity.ownerCount : badgeRarityStat ? badgeRarityStat.ownerCount : 0;

    const getClassNames = useMemo(() => {
        const newClassNames: string[] = ['relative w-[40px] h-[40px] bg-no-repeat bg-center'];

        if (isGroup) newClassNames.push('group-badge');

        if (isGrayscale) newClassNames.push('grayscale');

        if (classNames.length) newClassNames.push(...classNames);

        return newClassNames;
    }, [classNames, isGroup, isGrayscale]);

    const getStyle = useMemo(() => {
        let newStyle: CSSProperties = {};

        if (imageElement) {
            newStyle.backgroundImage = `url(${isGroup ? imageElement.src : GetConfigurationValue<string>('badge.asset.url').replace('%badgename%', badgeCode.toString())})`;
            newStyle.width = imageElement.width;
            newStyle.height = imageElement.height;

            if (scale !== 1) {
                newStyle.transform = `scale(${scale})`;

                if (!(scale % 1)) newStyle.imageRendering = 'pixelated';

                newStyle.width = imageElement.width * scale;
                newStyle.height = imageElement.height * scale;
            }
        }

        if (highlightRarity && rarityTier !== null && isBadgeRarityStandaloneTier(rarityTier, uncommonRarityEnabled)) {
            const glow = glowCss(getBadgeRarityGlowColor(rarityTier, uncommonRarityEnabled));

            newStyle.borderRadius = 8;
            newStyle.boxShadow = `0 0 0 1px ${glow}, 0 0 14px ${glow}`;
        }

        if (Object.keys(style).length) newStyle = { ...newStyle, ...style };

        return newStyle;
    }, [badgeCode, rarityTier, highlightRarity, isGroup, imageElement, scale, style, uncommonRarityEnabled]);

    useEffect(() => {
        if (!badgeCode || !badgeCode.length) return;

        let didSetBadge = false;

        const onBadgeImageReadyEvent = async (event: BadgeImageReadyEvent) => {
            if (event.badgeId !== badgeCode) return;

            if (isGroup) {
                const element = await TextureUtils.generateImage({ target: new OctaneSprite(event.image), resolution: 1 });

                if (element.complete && element.naturalWidth) setImageElement(element);
                else element.onload = () => setImageElement(element);
            } else {
                const badgeUrl = GetConfigurationValue<string>('badge.asset.url').replace('%badgename%', badgeCode.toString());
                const img = new Image();

                img.onload = () => setImageElement(img);
                img.src = badgeUrl;
            }

            didSetBadge = true;

            GetEventDispatcher().removeEventListener(BadgeImageReadyEvent.IMAGE_READY, onBadgeImageReadyEvent);
        };

        GetEventDispatcher().addEventListener(BadgeImageReadyEvent.IMAGE_READY, onBadgeImageReadyEvent);

        const texture = isGroup ? GetSessionDataManager().getGroupBadgeImage(badgeCode) : GetSessionDataManager().getBadgeImage(badgeCode);

        if (texture && !didSetBadge) {
            if (isGroup) {
                (async () => {
                    const element = await TextureUtils.generateImage({ target: new OctaneSprite(texture), resolution: 1 });

                    if (element.complete && element.naturalWidth) setImageElement(element);
                    else element.onload = () => setImageElement(element);
                })();
            } else {
                const badgeUrl = GetConfigurationValue<string>('badge.asset.url').replace('%badgename%', badgeCode.toString());
                const img = new Image();

                img.onload = () => setImageElement(img);
                img.src = badgeUrl;
            }
        }

        return () => GetEventDispatcher().removeEventListener(BadgeImageReadyEvent.IMAGE_READY, onBadgeImageReadyEvent);
    }, [badgeCode, isGroup]);

    useEffect(() => {
        if (isGroup || !badgeCode || (!showRarityInfo && !highlightRarity) || getBadgeRarityFromPacket(badgeCode)) {
            setBadgeRarityStat(null);
            return;
        }

        const cached = getCachedBadgeRarityStat(badgeCode);

        if (cached) {
            setBadgeRarityStat(cached);
            return;
        }

        let cancelled = false;

        ensureBadgeLeaderboardLoaded()
            .then(() => {
                if (cancelled) return;

                setBadgeRarityStat(getCachedBadgeRarityStat(badgeCode));
            })
            .catch(() => {
                if (cancelled) return;

                setBadgeRarityStat(null);
            });

        return () => {
            cancelled = true;
        };
    }, [badgeCode, highlightRarity, isGroup, showRarityInfo]);

    // Official badge_details bubble: a coloured "rarity_tag" with "<Tier> badge"
    // (non-standalone tiers read "Common"), and an owner count only while it
    // stays under 1000 (BadgeOwnerCountUtils.shouldShowOwnerCount).
    const rarityLabel = rarityTier !== null ? LocalizeText(getBadgeRarityLabelKey(rarityTier, uncommonRarityEnabled)) : '';
    const rarityText = rarityTier !== null ? LocalizeText('badge.rarity.badge', ['rarity'], [rarityLabel]) : '';
    const rarityTagColor = rarityTier !== null ? badgeRarityColorToCss(getBadgeRarityTagColor(rarityTier, uncommonRarityEnabled)) : '';
    const showOwnerCount = rarityTier !== null && shouldShowBadgeOwnerCount(ownerCount);
    const ownersText = showOwnerCount ? LocalizeText('badge.owner_count', ['count'], [formatBadgeOwnerCount(ownerCount)]) : '';

    // The badge element itself is the hover target: wrapping it would change
    // the grid cell it sits in, so the headless hook spreads onto Base instead.
    const { anchorProps, tooltip } = useTooltip({
        disabled: !tooltipsEnabled,
        className: 'max-w-[210px]',
        content: tooltipsEnabled ? (
            <>
                <div className="font-bold">{isGroup ? customTitle : LocalizeBadgeName(badgeCode)}</div>
                {showRarityInfo && rarityTier !== null && (
                    <div className="mb-1">
                        <div
                            className="octane-badge-rarity-tag inline-block rounded-[3px] px-[5px] py-[2px] font-bold text-[10px] tracking-[0.04em] text-white"
                            data-rarity-tier={rarityTier}
                            style={{ backgroundColor: rarityTagColor }}
                        >
                            {rarityText}
                        </div>
                        {showOwnerCount && <div className="text-[10px] opacity-80">{ownersText}</div>}
                    </div>
                )}
                <div>{isGroup ? LocalizeText('group.badgepopup.body') : LocalizeBadgeDescription(badgeCode)}</div>
            </>
        ) : null
    });

    return (
        <Base innerRef={badgeRef} classNames={getClassNames} style={getStyle} {...anchorProps} {...rest}>
            {tooltip}
            {children}
        </Base>
    );
};
