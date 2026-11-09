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
import { getBadgeRarityFromPacket, getBadgeRarityGlowColor, getBadgeRarityTier, isBadgeRarityStandaloneTier } from '../../api/badges/badgeRarity';
import { Base, BaseProps } from '../Base';
import { BadgeDetailsTooltip } from './BadgeDetailsTooltip';
import { PIXEL_ART_RENDERING } from './PixelArtRendering';

export interface LayoutBadgeImageViewProps extends BaseProps<HTMLDivElement> {
    badgeCode: string;
    isGroup?: boolean;
    /** A group badge being edited: always drawn by the client, never asked from the badge imager. */
    isPreview?: boolean;
    showInfo?: boolean;
    customTitle?: string;
    isGrayscale?: boolean;
    scale?: number;
    showRarityInfo?: boolean;
    highlightRarity?: boolean;
}

/* Glow on the badge itself (highlightRarity), after the official BadgeImageWidget.playGlow:
   nothing is drawn at rest; when the badge is set and again on mouse-over a 500ms run
   raises the glow strength from 0 to 1 with an ease-in-out cubic and then clears it. The
   filters are an outer glow, an inner glow and a tint towards the tier colour. Only
   standalone tiers glow - rare and above, plus uncommon when `badge_rarity.uncommon` is on. */
const BADGE_GLOW_DURATION_MS = 500;

const glowCss = (color: number): string => {
    const red = (color >> 16) & 0xff;
    const green = (color >> 8) & 0xff;
    const blue = color & 0xff;

    return `rgb(${red}, ${green}, ${blue})`;
};

export const LayoutBadgeImageView: FC<LayoutBadgeImageViewProps> = (props) => {
    const {
        badgeCode = null,
        isGroup = false,
        isPreview = false,
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
    const [glowRun, setGlowRun] = useState(0);
    const [glowBreathing, setGlowBreathing] = useState(false);

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

                if (!(scale % 1)) newStyle.imageRendering = PIXEL_ART_RENDERING;

                newStyle.width = imageElement.width * scale;
                newStyle.height = imageElement.height * scale;
            }
        }

        if (highlightRarity && rarityTier !== null && isBadgeRarityStandaloneTier(rarityTier, uncommonRarityEnabled)) {
            (newStyle as Record<string, string>)['--badge-glow'] = glowCss(getBadgeRarityGlowColor(rarityTier, uncommonRarityEnabled));
        }

        if (Object.keys(style).length) newStyle = { ...newStyle, ...style };

        return newStyle;
    }, [badgeCode, rarityTier, highlightRarity, isGroup, imageElement, scale, style, uncommonRarityEnabled]);

    useEffect(() => {
        if (!badgeCode || !badgeCode.length) return;

        let didSetBadge = false;
        let cancelled = false;
        // Only the newest image counts: the loading icon read back from the GPU can finish after the real badge.
        let latestRequest = 0;
        const allowServerImage = !isPreview;

        const showImage = (element: HTMLImageElement, request: number) => {
            const apply = () => {
                if (!cancelled && request === latestRequest) setImageElement(element);
            };

            if (element.complete && element.naturalWidth) apply();
            else element.onload = apply;
        };

        // A group badge has one image URL, made once by the renderer and shared by every view. Only a renderer
        // without it (or a badge it could not draw on a canvas) still reads the texture back from the GPU.
        const showGroupBadge = async (texture: BadgeImageReadyEvent['image']) => {
            const request = ++latestRequest;
            const url = GetSessionDataManager().getGroupBadgeImageUrl?.(badgeCode, allowServerImage);

            if (url) {
                const element = new Image();

                element.src = url;
                showImage(element, request);

                return;
            }

            if (!texture) return;

            const sprite = new OctaneSprite(texture);
            const element = await TextureUtils.generateImage({ target: sprite, resolution: 1 });

            // Drop the wrapper only; the badge texture stays with the session data manager.
            sprite.destroy();

            if (element) showImage(element, request);
        };

        const onBadgeImageReadyEvent = async (event: BadgeImageReadyEvent) => {
            if (event.badgeId !== badgeCode) return;

            if (isGroup) {
                await showGroupBadge(event.image);
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

        const texture = isGroup ? GetSessionDataManager().getGroupBadgeImage(badgeCode, allowServerImage) : GetSessionDataManager().getBadgeImage(badgeCode);

        if (texture && !didSetBadge) {
            if (isGroup) {
                void showGroupBadge(texture);
            } else {
                const badgeUrl = GetConfigurationValue<string>('badge.asset.url').replace('%badgename%', badgeCode.toString());
                const img = new Image();

                img.onload = () => setImageElement(img);
                img.src = badgeUrl;
            }
        }

        return () => {
            cancelled = true;
            GetEventDispatcher().removeEventListener(BadgeImageReadyEvent.IMAGE_READY, onBadgeImageReadyEvent);
        };
    }, [badgeCode, isGroup, isPreview]);

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

    const canGlow = highlightRarity && rarityTier !== null && isBadgeRarityStandaloneTier(rarityTier, uncommonRarityEnabled);

    // Official ExtendedProfileWindowCtrl.setSelectedBadge / showBadgeInfo: play the glow once
    // the badge is set, and again on every mouse-over.
    useEffect(() => {
        if (canGlow && imageElement) setGlowRun((run) => run + 1);
    }, [canGlow, imageElement]);

    // While the pointer rests on the badge the run keeps breathing: the same curve, played
    // back and forth, instead of the official single run.
    const startBreathing = () => {
        if (canGlow) setGlowBreathing(true);
    };

    const stopBreathing = () => setGlowBreathing(false);

    const [isTooltipVisible, setIsTooltipVisible] = useState(false);
    const glowAnimation: CSSProperties = glowBreathing
        ? { animationDuration: `${BADGE_GLOW_DURATION_MS * 2}ms`, animationIterationCount: 'infinite', animationDirection: 'alternate' }
        : { animationDuration: `${BADGE_GLOW_DURATION_MS}ms` };

    return (
        <Base
            innerRef={badgeRef}
            classNames={getClassNames}
            style={getStyle}
            {...rest}
            onMouseEnter={() => {
                if (tooltipsEnabled) setIsTooltipVisible(true);
                startBreathing();
            }}
            onMouseLeave={() => {
                setIsTooltipVisible(false);
                stopBreathing();
            }}
        >
            {canGlow && (glowRun > 0 || glowBreathing) && (
                <span key={glowBreathing ? 'breathing' : glowRun} className="badge-glow" aria-hidden="true">
                    {/* Breathing touches only the outline: the badge pixels stay as they are. */}
                    <span
                        className={`badge-glow-run${glowBreathing ? ' badge-glow-run--outline' : ''}`}
                        style={{ ...glowAnimation, backgroundImage: getStyle.backgroundImage as string }}
                    />
                    {!glowBreathing && (
                        <span
                            className="badge-glow-tint"
                            style={{
                                ...glowAnimation,
                                maskImage: getStyle.backgroundImage as string,
                                WebkitMaskImage: getStyle.backgroundImage as string
                            }}
                        />
                    )}
                </span>
            )}
            {tooltipsEnabled && isTooltipVisible && (
                <BadgeDetailsTooltip
                    key={badgeCode}
                    anchor={badgeRef}
                    name={isGroup ? (customTitle ?? '') : LocalizeBadgeName(badgeCode)}
                    description={isGroup ? LocalizeText('group.badgepopup.body') : LocalizeBadgeDescription(badgeCode)}
                    rarityTier={showRarityInfo ? rarityTier : null}
                    ownerCount={ownerCount}
                    uncommonEnabled={uncommonRarityEnabled}
                />
            )}
            {children}
        </Base>
    );
};
