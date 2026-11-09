import { FC, RefObject, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LocalizeText } from '../../api';
import { formatBadgeOwnerCount, getBadgeRarityLabelKey, getBadgeRarityTagColor, shouldShowBadgeOwnerCount } from '../../api/badges/badgeRarity';
import colorlessBorderXml from '../../assets/mod-tools/skins/skin-border_colorless.xml?raw';
import blueAtlas from '../../assets/mod-tools/skins/habbo-blue-skin.png';
import { parseNativeSkin } from '../../components/mod-tools/native/NativeSkin';
import { NativeSkinView } from '../../components/mod-tools/native/NativeSkinView';
import { NativeText } from '../native-text/NativeText';
import '../../css/layout/BadgeDetailsTooltip.css';

interface BadgeDetailsTooltipProps {
    anchor: RefObject<HTMLDivElement>;
    name: string;
    description: string;
    /** The badge's rarity tier, or null for no rarity tag. */
    rarityTier?: number | null;
    ownerCount?: number;
    uncommonEnabled?: boolean;
}

const TEXT_OVERRIDES = { antiAliasType: 'advanced' as const, sharpness: 0, thickness: 0, kerning: false };
const TAG_SKIN = parseNativeSkin(colorlessBorderXml);

/**
 * The official badge_details bubble (InfoStandUserView.populateBadgeDetails / showBadgeInfo): Volter text on the white
 * border, name, description, the tinted rarity tag sized to its label and the owner count, flush left of the badge and
 * vertically centred on it.
 */
export const BadgeDetailsTooltip: FC<BadgeDetailsTooltipProps> = ({ anchor, name, description, rarityTier = null, ownerCount = 0, uncommonEnabled = false }) => {
    const tooltipRef = useRef<HTMLDivElement>(null);
    const rarityLabelRef = useRef<HTMLSpanElement>(null);
    const [position, setPosition] = useState<{ left: number; top: number }>(null);
    // The label auto-sizes and hands its width change to rarity_tag: 92 - 81 = 11 pixels around it.
    const [tagWidth, setTagWidth] = useState(92);
    const hasRarity = rarityTier !== null && rarityTier !== undefined;
    const tagColor = hasRarity ? getBadgeRarityTagColor(rarityTier, uncommonEnabled) : 0x777777;

    useLayoutEffect(() => {
        const tooltip = tooltipRef.current;
        const badge = anchor.current;

        if (!tooltip || !badge) return;

        const place = () => {
            const rect = badge.getBoundingClientRect();
            const width = tooltip.offsetWidth;
            const height = tooltip.offsetHeight;
            // Flush left and vertically centred; kept inside the viewport at its edges.
            const left = rect.left >= width ? rect.left - width : rect.right;
            const next = {
                left: Math.trunc(Math.max(0, Math.min(left, window.innerWidth - width))),
                top: Math.trunc(Math.max(0, Math.min(rect.top + (rect.height - height) / 2, window.innerHeight - height)))
            };

            setPosition((previous) => (previous?.left === next.left && previous?.top === next.top ? previous : next));
        };
        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null;

        observer?.observe(tooltip);
        observer?.observe(badge);
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        place();

        return () => {
            observer?.disconnect();
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [anchor]);

    useLayoutEffect(() => {
        const label = rarityLabelRef.current;

        if (!label) return;

        const measure = () => {
            const width = label.offsetWidth;

            if (width > 0) setTagWidth(width + 11);
        };
        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;

        observer?.observe(label);
        measure();

        return () => observer?.disconnect();
    }, [rarityTier]);

    return createPortal(
        <div ref={tooltipRef} role="tooltip" className="octane-badge-details" style={{ ...position, visibility: position ? 'visible' : 'hidden' }}>
            <NativeText text={name} textStyle="bold" background={0xffffff} maxWidth={250} overrides={TEXT_OVERRIDES} nativeResolution />
            {description && <NativeText text={description} textStyle="regular" background={0xffffff} maxWidth={250} overrides={TEXT_OVERRIDES} nativeResolution />}
            {hasRarity && (
                <div className="octane-badge-details__rarity" data-rarity-tier={rarityTier}>
                    <NativeSkinView
                        skin={TAG_SKIN}
                        layout="border_colorless"
                        atlas={blueAtlas}
                        width={tagWidth}
                        height={17}
                        color={tagColor}
                        className="octane-badge-details__rarity-skin"
                    />
                    <span ref={rarityLabelRef} className="octane-badge-details__rarity-label">
                        <NativeText
                            text={LocalizeText('badge.rarity.badge', ['rarity'], [LocalizeText(getBadgeRarityLabelKey(rarityTier, uncommonEnabled))])}
                            textStyle="bold"
                            background={tagColor}
                            style={{ height: 13, whiteSpace: 'nowrap' }}
                            overrides={{ ...TEXT_OVERRIDES, color: 0xffffff }}
                            nativeResolution
                        />
                    </span>
                </div>
            )}
            {hasRarity && shouldShowBadgeOwnerCount(ownerCount) && (
                <NativeText
                    text={LocalizeText('badge.owner_count', ['count'], [formatBadgeOwnerCount(ownerCount)])}
                    textStyle="regular"
                    background={0xffffff}
                    maxWidth={250}
                    overrides={{ ...TEXT_OVERRIDES, color: 0x555555 }}
                    nativeResolution
                />
            )}
        </div>,
        document.body
    );
};
