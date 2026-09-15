import { MouseEventType } from '@octane/renderer';
import { FC, MouseEvent, PropsWithChildren, useState } from 'react';
import { attemptBotPlacement, IBotItem, UnseenItemCategory } from '../../../../api';
import { useInventoryBots, useInventoryUnseenTracker } from '../../../../hooks';
import { InventoryBotImageView } from './InventoryBotImageView';

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
            case 'mouseleave':
                if (!isMouseDown || selectedBot !== botItem) return;

                setMouseDown(false);
                attemptBotPlacement(botItem);
                return;
            case 'dblclick':
                attemptBotPlacement(botItem);
                return;
        }
    };

    return (
        <div
            onDoubleClick={onMouseEvent}
            onMouseDown={onMouseEvent}
            onMouseLeave={onMouseEvent}
            onMouseUp={onMouseEvent}
            {...rest}
            className={`octane-inventory-thumb${botItem === selectedBot ? ' is-selected' : ''}${unseen ? ' is-unseen' : ''}`}
        >
            <span className="octane-inventory-animal-thumb-image">
                <InventoryBotImageView figure={botItem.botData.figure} gender={botItem.botData.gender} />
            </span>
            {children}
        </div>
    );
};
