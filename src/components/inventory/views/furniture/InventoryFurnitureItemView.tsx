import { MouseEventType } from '@octane/renderer';
import { FC, MouseEvent, useState } from 'react';
import { attemptItemPlacement, getWiredChestOverlayColor, GroupItem } from '../../../../api';
import { LayoutLimitedEditionStyledNumberView } from '../../../../common';
import { classNames, InfiniteGrid } from '../../../../layout';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useRecyclerSessionStore } from '../../../../state/recyclerSessionStore';

export const InventoryFurnitureItemView: FC<{
    groupItem: GroupItem;
    isActive: boolean;
    onSelect: (groupItem: GroupItem) => void;
}> = (props) => {
    const { groupItem = null, isActive = false, onSelect = null } = props;
    const [isMouseDown, setMouseDown] = useState(false);
    const recyclerPlace = useRecyclerSessionStore((state) => state.place);

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
                // AIR FurniModel.requestCurrentActionOnSelection: with the Furni-Matic open the furni goes to it.
                if (recyclerPlace) recyclerPlace(groupItem);
                else attemptItemPlacement(groupItem);
                return;
        }
    };

    const count = groupItem.getUnlockedCount();
    // AIR GroupItem.updateRecycleStatusVisual: while the Furni-Matic is open, a stack with a furni that can still go
    // in it carries the recycle marker.
    const showRecyclable = !!recyclerPlace && groupItem.items.some((item) => item.recyclable && !item.locked);
    // AIR GroupItem.updateItemImageVisual: a chest tile shows its contents count on a gold (coins) or brown (furni) plaque.
    // AIR GroupItem.updateItemImageVisual: a unique number wins, then a rarity plaque, then the chest plaque.
    const rarityLevel = groupItem.stuffData.uniqueNumber > 0 ? -1 : (groupItem.stuffData.rarityLevel ?? -1);
    const chestColor = rarityLevel >= 0 ? null : getWiredChestOverlayColor(groupItem.category, groupItem.stuffData);

    return (
        <NativeTextTree>
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
                {showRecyclable && <div aria-hidden className="octane-inventory-thumb-recyclable" />}
                {chestColor && <div aria-hidden className={`octane-inventory-thumb-chest-background is-${ chestColor }`} />}
                {groupItem.stuffData.uniqueNumber <= 0 && (
                    <div className="octane-inventory-thumb-image">
                        {groupItem.iconUrl && <img src={groupItem.iconUrl} alt="" draggable={false} />}
                    </div>
                )}
                {rarityLevel >= 0 && (
                    <div aria-hidden className="octane-inventory-thumb-rarity">
                        <div className="octane-inventory-thumb-rarity-count">
                            <LayoutLimitedEditionStyledNumberView value={rarityLevel} />
                        </div>
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
        </NativeTextTree>
    );
};
