import { MouseEventType } from '@octane/renderer';
import { FC, MouseEvent, PropsWithChildren, useState } from 'react';
import { attemptBotPlacement, IBotItem, UnseenItemCategory } from '../../../../api';
import { LayoutAvatarImageView } from '../../../../common';
import { useInventoryBots, useInventoryUnseenTracker } from '../../../../hooks';
import { InfiniteGrid } from '../../../../layout';

export const InventoryBotItemView: FC<
    PropsWithChildren<{
        botItem: IBotItem;
    }>
> = (props) => {
    const { botItem = null, children = null, ...rest } = props;
    const [isMouseDown, setMouseDown] = useState(false);
    const { selectedBot = null, setSelectedBot = null } = useInventoryBots();
    const { isUnseen = null } = useInventoryUnseenTracker();
    const unseen = isUnseen(UnseenItemCategory.BOT, botItem.botData.id);

    const onMouseEvent = (event: MouseEvent) => {
        switch (event.type) {
            case MouseEventType.MOUSE_DOWN:
                setSelectedBot(botItem);
                setMouseDown(true);
                return;
            case MouseEventType.MOUSE_UP:
                setMouseDown(false);
                return;
            case MouseEventType.ROLL_OUT:
                if (!isMouseDown || selectedBot !== botItem) return;

                attemptBotPlacement(botItem);
                return;
            case 'dblclick':
                attemptBotPlacement(botItem);
                return;
        }
    };

    return (
        <InfiniteGrid.Item
            itemActive={selectedBot === botItem}
            itemUnseen={unseen}
            onDoubleClick={onMouseEvent}
            onMouseDown={onMouseEvent}
            onMouseOut={onMouseEvent}
            onMouseUp={onMouseEvent}
            {...rest}
            className="aspect-[2/3]"
        >
            <LayoutAvatarImageView direction={2} figure={botItem.botData.figure} fit />
            {children}
        </InfiniteGrid.Item>
    );
};
