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

/* Glow around the badge itself (highlightRarity); the tooltip is the skinned
   dark bubble, so the rarity line inside it is plain white text. */
const BADGE_RARITY_GLOW: Record<string, string> = {
    common: 'rgba(148, 163, 184, 0.55)',
    rare: 'rgba(59, 130, 246, 0.7)',
    epic: 'rgba(168, 85, 247, 0.72)',
    legendary: 'rgba(249, 115, 22, 0.76)',
    mythical: 'rgba(236, 72, 153, 0.76)',
    unique: 'rgba(34, 197, 94, 0.76)'
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
    const badgeRef = useRef<HTMLDivElement>(null);

    const tooltipsEnabled = showInfo && GetConfigurationValue<boolean>('badge.descriptions.enabled', true);

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

        if (highlightRarity && badgeRarityStat) {
            const glow = BADGE_RARITY_GLOW[badgeRarityStat.rarity];

            if (glow) {
                newStyle.borderRadius = 8;
                newStyle.boxShadow = `0 0 0 1px ${glow}, 0 0 14px ${glow}`;
            }
        }

        if (Object.keys(style).length) newStyle = { ...newStyle, ...style };

        return newStyle;
    }, [badgeCode, badgeRarityStat, highlightRarity, isGroup, imageElement, scale, style]);

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
        if (isGroup || !badgeCode || (!showRarityInfo && !highlightRarity)) {
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

    const rarityLabel = badgeRarityStat ? LocalizeText(`badge.rarity.${badgeRarityStat.rarity}`) : '';
    const rarityText = badgeRarityStat ? LocalizeText('badge.rarity.badge', ['rarity'], [rarityLabel]) : '';
    const ownersText = badgeRarityStat ? LocalizeText('badge.owner_count', ['count'], [badgeRarityStat.ownerCount.toString()]) : '';

    // The badge element itself is the hover target: wrapping it would change
    // the grid cell it sits in, so the headless hook spreads onto Base instead.
    const { anchorProps, tooltip } = useTooltip({
        disabled: !tooltipsEnabled,
        className: 'max-w-[210px]',
        content: tooltipsEnabled ? (
            <>
                <div className="font-bold">{isGroup ? customTitle : LocalizeBadgeName(badgeCode)}</div>
                {showRarityInfo && badgeRarityStat && (
                    <div className="mb-1">
                        <div className="font-bold uppercase text-[10px] tracking-[0.04em]">{rarityText}</div>
                        <div className="text-[10px] opacity-80">{ownersText}</div>
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
