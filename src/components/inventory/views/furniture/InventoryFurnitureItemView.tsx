import { MouseEventType } from '@octane/renderer';
import { FC, MouseEvent, useState } from 'react';
import { attemptItemPlacement, GroupItem } from '../../../../api';
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
        />
    );
};
