import { MouseEventType } from '@octane/renderer';
import { FC, MouseEvent, useState } from 'react';
import { attemptItemPlacement, getWiredChestOverlayColor, GroupItem } from '../../../../api';
import { LayoutLimitedEditionStyledNumberView } from '../../../../common';
import { classNames, InfiniteGrid } from '../../../../layout';

export const InventoryFurnitureItemView: FC<{
    groupItem: GroupItem;
    isActive: boolean;
    onSelect: (groupItem: GroupItem) => void;
}> = (props) => {
    const { groupItem = null, isActive = false, onSelect = null } = props;
    const [isMouseDown, setMouseDown] = useState(false);

    const onMouseEvent = (event: MouseEvent) => {
        switch (event.type) {
            case MouseEventType.MOUSE_DOWN:
                onSelect?.(groupItem);
                setMouseDown(true);
                return;
            case MouseEventType.MOUSE_UP:
                setMouseDown(false);
                return;
            case MouseEventType.ROLL_OUT:
                if (!isMouseDown || !isActive) return;

                attemptItemPlacement(groupItem);
                return;
            case 'dblclick':
                attemptItemPlacement(groupItem);
                return;
        }
    };

    const count = groupItem.getUnlockedCount();
    // AIR GroupItem.updateItemImageVisual: a chest tile shows its contents count on a gold (coins) or brown (furni) plaque.
    const chestColor = getWiredChestOverlayColor(groupItem.category, groupItem.stuffData);

    return (
        <InfiniteGrid.Item
            className={classNames('octane-inventory-thumb', isActive && 'is-selected', groupItem.hasUnseenItems && 'is-unseen', !count && 'opacity-50')}
            itemActive={isActive}
            itemCount={count}
            itemImage={groupItem.stuffData.uniqueNumber > 0 ? groupItem.iconUrl : undefined}
            itemUniqueNumber={groupItem.stuffData.uniqueNumber}
            itemUnseen={groupItem.hasUnseenItems}
            onDoubleClick={onMouseEvent}
            onMouseDown={onMouseEvent}
            onMouseOut={onMouseEvent}
            onMouseUp={onMouseEvent}
        >
            {chestColor && <div aria-hidden className={`octane-inventory-thumb-chest-background is-${ chestColor }`} />}
            {groupItem.stuffData.uniqueNumber <= 0 && (
                <div className="octane-inventory-thumb-image">
                    {groupItem.iconUrl && <img src={groupItem.iconUrl} alt="" draggable={false} />}
                </div>
            )}
            {chestColor && (
                <div aria-hidden className={`octane-inventory-thumb-chest is-${ chestColor }`}>
                    <div className="octane-inventory-thumb-chest-count">
                        <LayoutLimitedEditionStyledNumberView value={Math.max(0, groupItem.stuffData.contentsCount ?? 0)} />
                    </div>
                </div>
            )}
        </InfiniteGrid.Item>
    );
};
