import { InfiniteGrid } from '@layout/InfiniteGrid';
import { CreateLinkEvent, GetSessionDataManager, IFurnitureData, IRoomSession, RoomPreviewer, Vector3d } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { FaExchangeAlt, FaPowerOff, FaRecycle, FaSyncAlt, FaTrashAlt } from 'react-icons/fa';
import {
    attemptItemPlacement,
    DispatchUiEvent,
    FriendlyTime,
    FurniCategory,
    getGroupItemKey,
    GroupItem,
    LocalizeText,
    localizeWithFallback,
    UnseenItemCategory
} from '../../../../api';
import { LayoutLimitedEditionCompactPlateView, LayoutRarityLevelView, LayoutRoomPreviewerView } from '../../../../common';
import { CatalogPostMarketplaceOfferEvent, DeleteItemConfirmEvent } from '../../../../events';
import { useInventoryFurni, useInventoryUnseenTracker, useRentConfirmation } from '../../../../hooks';
import { OctaneButton } from '../../../../layout';
import { InventoryCategoryEmptyView } from '../InventoryCategoryEmptyView';
import { InventoryFurnitureItemView } from './InventoryFurnitureItemView';
import { getInventoryPreviewButtons, getInventoryRentTextKey } from './inventoryFurniPreview';

const getFurnitureData = (groupItem: GroupItem): IFurnitureData => {
    if (!groupItem) return null;

    const manager = GetSessionDataManager();

    if (!manager) return null;

    return groupItem.isWallItem ? manager.getWallItemData(groupItem.type) : manager.getFloorItemData(groupItem.type);
};

// FurniView.as:298-339: the preview pane counts what is still tradeable / recyclable and swaps
// the icon for its greyed "no" variant when nothing is; the number gets a white glow.
const PreviewCounter: FC<{ count: number; icon: 'trade' | 'recycle' }> = (props) => {
    const { count = 0, icon = 'trade' } = props;
    const isTrade = icon === 'trade';
    const title = isTrade
        ? LocalizeText(count > 0 ? 'inventory.furni.preview.tradeable_amount' : 'inventory.furni.preview.not_tradeable')
        : LocalizeText(count > 0 ? 'inventory.furni.preview.recyclable_amount' : 'inventory.furni.preview.not_recyclable');

    return (
        <div className={`octane-inventory-preview-counter ${count > 0 ? 'is-available' : 'is-unavailable'}`} data-testid={`inventory-preview-${icon}`} title={title}>
            {isTrade ? <FaExchangeAlt className="fa-icon" /> : <FaRecycle className="fa-icon" />}
            {count > 0 && <span className="octane-inventory-preview-counter__number">{count}</span>}
        </div>
    );
};

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
    const { openRentConfirmation = null } = useRentConfirmation();
    // Rent countdown, refreshed locally once a second like FurniModel.onImageUpdateTimerEvent
    // calls FurniView.updateRentedItem between two server updates.
    const [rentTick, setRentTick] = useState(0);

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

        // Rented furni are merged into this tab but tracked under their own unseen category.
        resetItems(
            selectedItem.isRented ? UnseenItemCategory.RENTABLE : UnseenItemCategory.FURNI,
            selectedItem.items.map((item) => item.id)
        );

        selectedItem.hasUnseenItems = false;
    }, [selectedItem, resetItems]);

    useEffect(() => {
        if (!selectedItem || !selectedItem.isRented) return;

        const handle = window.setInterval(() => setRentTick((previous) => previous + 1), 1000);

        return () => window.clearInterval(handle);
    }, [selectedItem]);

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

    const selectedFurniture = selectedItem ? selectedItem.getLastItem() : null;
    const selectedFurniData = selectedItem ? getFurnitureData(selectedItem) : null;
    const previewButtons = selectedFurniture
        ? getInventoryPreviewButtons({
              isRented: selectedFurniture.isRented,
              flatId: selectedFurniture.flatId,
              category: selectedFurniture.category,
              sellable: selectedItem.isSellable,
              isTrading: false,
              inPrivateRoom: !!roomSession,
              rentCouldBeUsedForBuyout: !!selectedFurniData?.rentCouldBeUsedForBuyout,
              purchaseCouldBeUsedForBuyout: !!selectedFurniData?.purchaseCouldBeUsedForBuyout
          })
        : null;
    // FurniView.updateActionView fills `furni_extra` with the rarity level or the chest name and
    // FurniView.updateRentedItem overrides it with the rent countdown for rented furni.
    const rentTextKey = getInventoryRentTextKey(selectedFurniture);
    const rentTime = rentTextKey ? FriendlyTime.format(Math.max(0, Math.floor(selectedFurniture.secondsToExpiration))) : '';
    const furniExtraText = rentTextKey
        ? LocalizeText(rentTextKey, ['time', 'TIME'], [rentTime, rentTime])
        : selectedFurniture && selectedFurniture.stuffData && selectedFurniture.stuffData.rarityLevel >= 0
          ? LocalizeText('inventory.rarity', ['rarity'], [String(selectedFurniture.stuffData.rarityLevel)])
          : '';

    const openRent = (buyout: boolean) => {
        if (!selectedFurniture || !selectedFurniData) return;

        openRentConfirmation?.(selectedFurniData, buyout, -1, selectedFurniture.id);
    };

    const gotoRoom = () => {
        if (!selectedFurniture || selectedFurniture.flatId <= -1) return;

        CreateLinkEvent(`navigator/goto/${selectedFurniture.flatId}`);
    };

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
                        <div className="flex items-start gap-2">
                            <div className="flex flex-col min-w-0 grow">
                                <span className="text-sm truncate">{selectedItem.name}</span>
                                {selectedItem.description && <span className="text-xs truncate">{selectedItem.description}</span>}
                                {furniExtraText && (
                                    <span className="octane-inventory-preview-extra text-xs" data-rent-tick={rentTick} data-testid="inventory-preview-extra">
                                        {furniExtraText}
                                    </span>
                                )}
                            </div>
                            <div className="octane-inventory-preview-counters flex flex-col gap-[2px] shrink-0">
                                <PreviewCounter count={selectedItem.getTradeableCount()} icon="trade" />
                                <PreviewCounter count={selectedItem.getRecyclableCount()} icon="recycle" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            {!!roomSession && previewButtons?.place && (
                                <OctaneButton className="octane-inventory-btn-place" onClick={(event) => attemptItemPlacement(selectedItem)}>
                                    {LocalizeText('inventory.furni.placetoroom')}
                                </OctaneButton>
                            )}
                            {previewButtons?.gotoRoom && (
                                <OctaneButton className="octane-inventory-btn-goto" data-testid="inventory-goto-room" onClick={gotoRoom}>
                                    {localizeWithFallback('inventory.furni.gotoroom', 'Go to room')}
                                </OctaneButton>
                            )}
                            {previewButtons?.sell && (
                                <OctaneButton className="octane-inventory-btn-sell" onClick={(event) => attemptPlaceMarketplaceOffer(selectedItem)}>
                                    {LocalizeText('inventory.marketplace.sell')}
                                </OctaneButton>
                            )}
                            {previewButtons?.extend && (
                                <OctaneButton className="octane-inventory-btn-rent" data-testid="inventory-extend-rent" onClick={() => openRent(false)}>
                                    {localizeWithFallback('inventory.furni.extendrent', 'Extend rent')}
                                </OctaneButton>
                            )}
                            {previewButtons?.buyout && (
                                <OctaneButton className="octane-inventory-btn-rent" data-testid="inventory-buy-rented" onClick={() => openRent(true)}>
                                    {localizeWithFallback('inventory.furni.buyrenteditem', 'Buy permanently')}
                                </OctaneButton>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
