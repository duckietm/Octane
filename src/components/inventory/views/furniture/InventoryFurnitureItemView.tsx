import { MouseEventType } from '@octane/renderer';
import { FC, MouseEvent, useState } from 'react';
import { attemptItemPlacement, FurniCategory, GetConfigurationValue, GroupItem } from '../../../../api';
import { classNames, InfiniteGrid } from '../../../../layout';
import { getInventoryRentState, RENT_WARNING_DURATION_DEFAULT_SECONDS } from './inventoryFurniPreview';

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
    const firstItem = groupItem.getItemByIndex(0) ?? null;
    // The official thumb (inventory_thumb XML) layers, in this order of precedence, the LTD
    // plate, the rarity plaque (rarity_item_overlay_grid) and the chest overlay
    // (`GroupItem.updateItemImageVisual`: categories 24 and 25 pick the brown and the gold chest).
    const isUnique = !!groupItem.stuffData && groupItem.stuffData.uniqueNumber > 0;
    const rarityLevel = !isUnique && groupItem.stuffData ? groupItem.stuffData.rarityLevel : -1;
    const chestColor =
        !isUnique && rarityLevel < 0
            ? groupItem.category === FurniCategory.COINS_CHEST
                ? 'gold'
                : groupItem.category === FurniCategory.FURNI_CHEST
                  ? 'brown'
                  : null
            : null;
    const chestContentsCount = chestColor ? (groupItem.stuffData?.contentsCount ?? 0) : 0;
    const chestName = chestColor ? (groupItem.stuffData?.chestName ?? '') : '';
    const rentState = getInventoryRentState(
        firstItem,
        GetConfigurationValue<number>('purchase.rent.warning_duration_seconds', RENT_WARNING_DURATION_DEFAULT_SECONDS)
    );

    return (
        <InfiniteGrid.Item
            className={classNames(!count && 'opacity-50')}
            itemActive={isActive}
            itemCount={count}
            itemImage={groupItem.iconUrl}
            itemUniqueNumber={groupItem.stuffData.uniqueNumber}
            itemUnseen={groupItem.hasUnseenItems}
            onDoubleClick={onMouseEvent}
            onMouseDown={onMouseEvent}
            onMouseOut={onMouseEvent}
            onMouseUp={onMouseEvent}
        >
            {rarityLevel >= 0 && (
                <div className="octane-inventory-thumb-rarity" data-testid="inventory-thumb-rarity">
                    {rarityLevel}
                </div>
            )}
            {chestColor && (
                <div
                    className={`octane-inventory-thumb-chest is-${chestColor}`}
                    data-testid="inventory-thumb-chest"
                    title={chestName || undefined}
                >
                    {chestContentsCount}
                </div>
            )}
            {rentState && <div className={`octane-inventory-thumb-rent is-${rentState}`} data-testid="inventory-thumb-rent" />}
        </InfiniteGrid.Item>
    );
};
