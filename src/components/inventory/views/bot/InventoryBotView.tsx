import { IRoomSession, RoomPreviewer } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { attemptBotPlacement, IBotItem, LocalizeText, UnseenItemCategory } from '../../../../api';
import { LayoutRoomPreviewerView } from '../../../../common';
import { useInventoryBots, useInventoryUnseenTracker } from '../../../../hooks';
import { InfiniteGrid, OctaneButton } from '../../../../layout';
import { InventoryCategoryEmptyView } from '../InventoryCategoryEmptyView';
import { InventoryBotItemView } from './InventoryBotItemView';

export const InventoryBotView: FC<{
    roomSession: IRoomSession;
    roomPreviewer: RoomPreviewer;
}> = (props) => {
    const { roomSession = null, roomPreviewer = null } = props;
    const [isVisible, setIsVisible] = useState(false);
    const { botItems = [], selectedBot = null, activate = null, deactivate = null } = useInventoryBots();
    const { isUnseen = null, removeUnseen = null } = useInventoryUnseenTracker();

    useEffect(() => {
        if (!selectedBot || !roomPreviewer) return;

        const botData = selectedBot.botData;
        roomPreviewer.reset(false);
        roomPreviewer.updateRoomWallsAndFloorVisibility(true, true);
        roomPreviewer.updateObjectRoom('111', '217', '1.1');
        roomPreviewer.addAvatarIntoRoom(botData.figure, 0);
    }, [roomPreviewer, selectedBot]);

    useEffect(() => {
        if (!selectedBot || !isUnseen(UnseenItemCategory.BOT, selectedBot.botData.id)) return;

        removeUnseen(UnseenItemCategory.BOT, selectedBot.botData.id);
    }, [selectedBot, isUnseen, removeUnseen]);

    useEffect(() => {
        if (!isVisible) return;

        const id = activate();

        return () => deactivate(id);
    }, [isVisible, activate, deactivate]);

    useEffect(() => {
        setIsVisible(true);

        return () => setIsVisible(false);
    }, []);

    if (!botItems || !botItems.length)
        return <InventoryCategoryEmptyView desc={LocalizeText('inventory.empty.bots.desc')} title={LocalizeText('inventory.empty.bots.title')} />;

    return (
        <div className="grid h-full grid-cols-12 gap-2">
            <div className="flex flex-col col-span-7 gap-1 overflow-hidden">
                <InfiniteGrid<IBotItem>
                    columnCount={4}
                    estimateSize={110}
                    itemRender={(item) => <InventoryBotItemView botItem={item} />}
                    items={botItems}
                    rowGap={4}
                />
            </div>
            <div className="flex flex-col col-span-5">
                <div className="relative flex flex-col">
                    <LayoutRoomPreviewerView height={140} roomPreviewer={roomPreviewer} />
                </div>
                {selectedBot && (
                    <div className="flex flex-col justify-between gap-2 grow">
                        <span className="truncate grow">{selectedBot.botData.name}</span>
                        {!!roomSession && (
                            <OctaneButton className="octane-inventory-btn-place" onClick={(event) => attemptBotPlacement(selectedBot)}>
                                {LocalizeText('inventory.furni.placetoroom')}
                            </OctaneButton>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
