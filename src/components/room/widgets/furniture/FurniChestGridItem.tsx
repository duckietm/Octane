import { FurnitureType } from '@octane/renderer';
import { FC, useState } from 'react';
import { ProductImageUtility } from '../../../../api';
import { LayoutLimitedEditionStyledNumberView, LayoutRarityLevelView } from '../../../../common';
import { ChestFurniGroup } from './chestFurniGrouping';

const BORDER_IDLE = '#cbcbcb';
const BORDER_HOVER = '#d69586';

export const FurniChestGridItem: FC<{
    group: ChestFurniGroup;
    selected: boolean;
    onSelect: () => void;
    title?: string;
}> = ({ group, selected, onSelect, title }) => {
    const [hovered, setHovered] = useState(false);
    const sample = group.sample;
    const stuff = sample.stuffData;
    const isLtd = (stuff?.uniqueNumber ?? 0) > 0;
    const isRarity = group.specialType === 19;

    return (
        <div
            className="octane-chest__grid-cell"
            title={title}
            onClick={onSelect}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {selected && <div className="octane-chest__grid-cell-focus" aria-hidden />}
            <div
                className={`octane-chest__grid-cell-inner${isLtd ? ' unique-item' : ''}`}
                style={{ borderColor: hovered && !selected ? BORDER_HOVER : BORDER_IDLE, position: 'relative' }}
            >
                {isLtd && (
                    <>
                        <div className="unique-bg-override octane-chest__grid-ltd-bg" />
                        <div className="absolute bottom-0 unique-item-counter octane-chest__grid-ltd-counter">
                            <LayoutLimitedEditionStyledNumberView value={stuff?.uniqueNumber ?? 0} />
                        </div>
                    </>
                )}
                {/* Same gamedata icon (and sizing) as the deposit panel, so both grids look identical. */}
                <div className="octane-chest__grid-icon">
                    <img
                        src={ProductImageUtility.getProductImageUrl(
                            group.wallItem ? FurnitureType.WALL : FurnitureType.FLOOR,
                            group.baseItemId,
                            group.legacyPosterId,
                        )}
                        alt=""
                        draggable={false}
                        style={{ maxWidth: 38, maxHeight: 38, objectFit: 'contain', imageRendering: 'pixelated' }}
                    />
                </div>
                {isRarity && (
                    <LayoutRarityLevelView
                        className="octane-chest__grid-rarity"
                        level={stuff?.rarityLevel ?? 0}
                        position="absolute"
                    />
                )}
                {group.quantity > 1 && (
                    <div className="octane-chest__qty-badge">
                        <span>{group.quantity}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
