import { FC, PropsWithChildren, useState } from 'react';
import { GetConfigurationValue, UnseenItemCategory } from '../../../../api';
import { LayoutBadgeImageView } from '../../../../common';
import { useInventoryBadges, useInventoryUnseenTracker } from '../../../../hooks';

export const InventoryBadgeItemView: FC<PropsWithChildren<{ badgeCode: string }>> = (props) => {
    const { badgeCode = null, children = null, ...rest } = props;
    const { selectedBadgeCode = null, setSelectedBadgeCode = null, toggleBadge = null, getBadgeId = null } = useInventoryBadges();
    const { isUnseen = null } = useInventoryUnseenTracker();
    const unseen = isUnseen(UnseenItemCategory.BADGE, getBadgeId(badgeCode));
    const [isDragging, setIsDragging] = useState(false);

    const onDragStart = (event: React.DragEvent<HTMLDivElement>) => {
        event.dataTransfer.setData('badgeCode', badgeCode);
        event.dataTransfer.setData('source', 'inventory');
        event.dataTransfer.effectAllowed = 'move';
        setIsDragging(true);

        const badgeUrl = GetConfigurationValue<string>('badge.asset.url').replace('%badgename%', badgeCode);
        const img = new Image();
        img.src = badgeUrl;
        event.dataTransfer.setDragImage(img, 20, 20);
    };

    const onDragEnd = () => setIsDragging(false);

    return (
        <div
            draggable
            className={`octane-inventory-thumb octane-inventory-badge-cell ${selectedBadgeCode === badgeCode ? 'is-selected' : ''} ${unseen ? 'is-unseen' : ''} ${isDragging ? 'is-dragging' : ''}`}
            onDoubleClick={() => toggleBadge(badgeCode)}
            onDragEnd={onDragEnd}
            onDragStart={onDragStart}
            onMouseDown={(event) => setSelectedBadgeCode(badgeCode)}
            {...rest}
        >
            <LayoutBadgeImageView badgeCode={badgeCode} />
            {children}
        </div>
    );
};
