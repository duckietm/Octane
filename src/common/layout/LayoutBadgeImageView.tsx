import { BadgeImageReadyEvent, GetEventDispatcher, GetSessionDataManager, OctaneSprite, TextureUtils } from '@octane/renderer';
import { CSSProperties, FC, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

const BADGE_RARITY_COLORS: Record<string, { glow: string; pillBackground: string; pillBorder: string; pillText: string }> = {
    common: { glow: 'rgba(148, 163, 184, 0.55)', pillBackground: 'rgba(71, 85, 105, 0.16)', pillBorder: 'rgba(100, 116, 139, 0.45)', pillText: '#475569' },
    rare: { glow: 'rgba(59, 130, 246, 0.7)', pillBackground: 'rgba(59, 130, 246, 0.12)', pillBorder: 'rgba(37, 99, 235, 0.38)', pillText: '#1d4ed8' },
    epic: { glow: 'rgba(168, 85, 247, 0.72)', pillBackground: 'rgba(168, 85, 247, 0.14)', pillBorder: 'rgba(147, 51, 234, 0.4)', pillText: '#7e22ce' },
    legendary: { glow: 'rgba(249, 115, 22, 0.76)', pillBackground: 'rgba(249, 115, 22, 0.16)', pillBorder: 'rgba(234, 88, 12, 0.4)', pillText: '#c2410c' },
    mythical: { glow: 'rgba(236, 72, 153, 0.76)', pillBackground: 'rgba(236, 72, 153, 0.15)', pillBorder: 'rgba(219, 39, 119, 0.4)', pillText: '#be185d' },
    unique: { glow: 'rgba(34, 197, 94, 0.76)', pillBackground: 'rgba(34, 197, 94, 0.14)', pillBorder: 'rgba(22, 163, 74, 0.4)', pillText: '#15803d' }
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
    const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
    const [badgeRarityStat, setBadgeRarityStat] = useState<BadgeLeaderboardStat>(null);
    const badgeRef = useRef<HTMLDivElement>(null);

    const tooltipsEnabled = showInfo && GetConfigurationValue<boolean>('badge.descriptions.enabled', true);

    const showTooltip = () => {
        if (!tooltipsEnabled || !badgeRef.current) return;

        const rect = badgeRef.current.getBoundingClientRect();
        const tooltipWidth = 210;
        const gap = 10;
        let left = rect.left - tooltipWidth - gap;

        if (left < gap) left = rect.right + gap;

        setTooltipPosition({ top: rect.top, left });
    };

    const hideTooltip = () => setTooltipPosition(null);

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
            const colors = BADGE_RARITY_COLORS[badgeRarityStat.rarity];

            if (colors) {
                newStyle.borderRadius = 8;
                newStyle.boxShadow = `0 0 0 1px ${colors.glow}, 0 0 14px ${colors.glow}`;
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

    const rarityColors = badgeRarityStat ? BADGE_RARITY_COLORS[badgeRarityStat.rarity] : null;
    const rarityLabel = badgeRarityStat ? LocalizeText(`badge.rarity.${badgeRarityStat.rarity}`) : '';
    const rarityText = badgeRarityStat ? LocalizeText('badge.rarity.badge', ['rarity'], [rarityLabel]) : '';
    const ownersText = badgeRarityStat ? LocalizeText('badge.owner_count', ['count'], [badgeRarityStat.ownerCount.toString()]) : '';

    return (
        <Base
            innerRef={badgeRef}
            classNames={getClassNames}
            style={getStyle}
            onMouseEnter={tooltipsEnabled ? showTooltip : undefined}
            onMouseLeave={tooltipsEnabled ? hideTooltip : undefined}
            {...rest}
        >
            {tooltipsEnabled &&
                tooltipPosition &&
                createPortal(
                    <div
                        className="fixed z-[9999] pointer-events-none select-none w-[210px] rounded-[.25rem] bg-[#fff] text-black py-1 px-2 small"
                        style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
                    >
                        <div className="font-bold mb-1">{isGroup ? customTitle : LocalizeBadgeName(badgeCode)}</div>
                        {showRarityInfo && badgeRarityStat && (
                            <div className="flex flex-col gap-1 mb-1">
                                <div
                                    className="inline-flex items-center self-start rounded-full px-2 py-[2px] text-[10px] font-bold uppercase tracking-[0.04em]"
                                    style={{
                                        background: rarityColors.pillBackground,
                                        border: `1px solid ${rarityColors.pillBorder}`,
                                        color: rarityColors.pillText
                                    }}
                                >
                                    {rarityText}
                                </div>
                                <div className="text-[10px] text-[#5f5f5f]">{ownersText}</div>
                            </div>
                        )}
                        <div>{isGroup ? LocalizeText('group.badgepopup.body') : LocalizeBadgeDescription(badgeCode)}</div>
                    </div>,
                    document.body
                )}
            {children}
        </Base>
    );
};
