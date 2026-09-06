import { InfiniteGrid } from '@layout/InfiniteGrid';
import { GetSessionDataManager, IRoomSession, RoomPreviewer, Vector3d } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { FaPowerOff, FaSyncAlt, FaTrashAlt } from 'react-icons/fa';
import { attemptItemPlacement, DispatchUiEvent, FurniCategory, getGroupItemKey, GroupItem, LocalizeText, UnseenItemCategory } from '../../../../api';
import { LayoutLimitedEditionCompactPlateView, LayoutRarityLevelView, LayoutRoomPreviewerView } from '../../../../common';
import { CatalogPostMarketplaceOfferEvent, DeleteItemConfirmEvent } from '../../../../events';
import { useInventoryFurni, useInventoryUnseenTracker } from '../../../../hooks';
import { OctaneButton } from '../../../../layout';
import { InventoryCategoryEmptyView } from '../InventoryCategoryEmptyView';
import { InventoryFurnitureItemView } from './InventoryFurnitureItemView';

const attemptPlaceMarketplaceOffer = (groupItem: GroupItem) => {
    const item = groupItem.getLastItem();

    if (!item) return false;

    if (!item.sellable) return false;

    DispatchUiEvent(new CatalogPostMarketplaceOfferEvent(item));
};

const attemptDeleteItem = (groupItem: GroupItem) => {
    const item = groupItem.getLastItem();

    if (!item) return;

    DispatchUiEvent(new DeleteItemConfirmEvent(item, groupItem.getTotalCount()));
};

export const InventoryFurnitureView: FC<{
    roomSession: IRoomSession;
    roomPreviewer: RoomPreviewer;
    filteredGroupItems: GroupItem[];
}> = (props) => {
    const { roomSession = null, roomPreviewer = null, filteredGroupItems = [] } = props;
    const [isVisible, setIsVisible] = useState(false);
    const { groupItems = [], selectedItem = null, setSelectedItem = null, activate = null, deactivate = null } = useInventoryFurni();
    const { resetItems = null } = useInventoryUnseenTracker();

    useEffect(() => {
        if (!selectedItem || !roomPreviewer) return;

        const furnitureItem = selectedItem.getLastItem();

        if (!furnitureItem) return;

        roomPreviewer.reset(false);

        const isRoomDecoration =
            furnitureItem.category === FurniCategory.WALL_PAPER ||
            furnitureItem.category === FurniCategory.FLOOR ||
            furnitureItem.category === FurniCategory.LANDSCAPE;

        let floorType = '111';
        let wallType = '217';
        let landscapeType = '1.1';

        if (isRoomDecoration) {
            floorType = furnitureItem.category === FurniCategory.FLOOR ? selectedItem.stuffData.getLegacyString() : floorType;
            wallType = furnitureItem.category === FurniCategory.WALL_PAPER ? selectedItem.stuffData.getLegacyString() : wallType;
            landscapeType = furnitureItem.category === FurniCategory.LANDSCAPE ? selectedItem.stuffData.getLegacyString() : landscapeType;

            roomPreviewer.updateRoomWallsAndFloorVisibility(true, true);
            roomPreviewer.updateObjectRoom(floorType, wallType, landscapeType);

            if (furnitureItem.category === FurniCategory.LANDSCAPE) {
                const data = GetSessionDataManager().getWallItemDataByName('window_double_default');

                if (data) roomPreviewer.addWallItemIntoRoom(data.id, new Vector3d(90, 0, 0), data.customParams);
            }

            return;
        }

        roomPreviewer.updateObjectRoom(floorType, wallType, landscapeType);
        roomPreviewer.updateRoomWallsAndFloorVisibility(true, true);

        if (selectedItem.isWallItem) {
            roomPreviewer.addWallItemIntoRoom(selectedItem.type, new Vector3d(90), furnitureItem.stuffData.getLegacyString());
        } else {
            roomPreviewer.addFurnitureIntoRoom(selectedItem.type, new Vector3d(90), selectedItem.stuffData, furnitureItem.extra.toString());
        }
    }, [roomPreviewer, selectedItem]);

    useEffect(() => {
        if (!selectedItem || !selectedItem.hasUnseenItems) return;

        resetItems(
            UnseenItemCategory.FURNI,
            selectedItem.items.map((item) => item.id)
        );

        selectedItem.hasUnseenItems = false;
    }, [selectedItem, resetItems]);

    useEffect(() => {
        if (!isVisible) return;

        const id = activate();

        return () => deactivate(id);
    }, [isVisible, activate, deactivate]);

    useEffect(() => {
        setIsVisible(true);

        return () => setIsVisible(false);
    }, []);

    if (!groupItems || !groupItems.length)
        return <InventoryCategoryEmptyView desc={LocalizeText('inventory.empty.desc')} title={LocalizeText('inventory.empty.title')} />;

    return (
        <div className="grid h-full grid-cols-12 gap-2">
            <div className="flex flex-col col-span-7 gap-1 overflow-hidden">
                <InfiniteGrid<GroupItem>
                    columnCount={6}
                    itemKey={getGroupItemKey}
                    itemRender={(item) => <InventoryFurnitureItemView groupItem={item} isActive={item === selectedItem} onSelect={setSelectedItem} />}
                    items={filteredGroupItems}
                />
            </div>
            <div className="flex flex-col col-span-5">
                <div className="relative flex flex-col">
                    <LayoutRoomPreviewerView height={140} roomPreviewer={roomPreviewer} />
                    {selectedItem && (
                        <>
                            <button
                                className="octane-inventory-preview-btn octane-inventory-preview-rotate"
                                onClick={() => roomPreviewer?.changeRoomObjectDirection()}
                            >
                                <FaSyncAlt /> Rotate
                            </button>
                            <button
                                className="octane-inventory-preview-btn octane-inventory-preview-state"
                                onClick={() => roomPreviewer?.changeRoomObjectState()}
                            >
                                <FaPowerOff /> Toggle State
                            </button>
                        </>
                    )}
                    {selectedItem && (
                        <OctaneButton className="bg-danger! hover:bg-danger/80! absolute bottom-2 inset-e-2 p-1" onClick={() => attemptDeleteItem(selectedItem)}>
                            <FaTrashAlt className="fa-icon" />
                        </OctaneButton>
                    )}
                    {selectedItem && selectedItem.stuffData.isUnique && (
                        <LayoutLimitedEditionCompactPlateView
                            className="top-2 inset-e-2"
                            position="absolute"
                            uniqueNumber={selectedItem.stuffData.uniqueNumber}
                            uniqueSeries={selectedItem.stuffData.uniqueSeries}
                        />
                    )}
                    {selectedItem && selectedItem.stuffData.rarityLevel > -1 && (
                        <LayoutRarityLevelView className="top-2 inset-e-2" level={selectedItem.stuffData.rarityLevel} position="absolute" />
                    )}
                </div>
                {selectedItem && (
                    <div className="flex flex-col justify-between gap-2 grow">
                        <span className="text-sm truncate grow">{selectedItem.name}</span>
                        {selectedItem.description && <span className="text-xs truncate">{selectedItem.description}</span>}
                        <div className="flex flex-col gap-1">
                            {!!roomSession && (
                                <OctaneButton className="octane-inventory-btn-place" onClick={(event) => attemptItemPlacement(selectedItem)}>
                                    {LocalizeText('inventory.furni.placetoroom')}
                                </OctaneButton>
                            )}
                            {selectedItem.isSellable && (
                                <OctaneButton className="octane-inventory-btn-sell" onClick={(event) => attemptPlaceMarketplaceOffer(selectedItem)}>
                                    {LocalizeText('inventory.marketplace.sell')}
                                </OctaneButton>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
