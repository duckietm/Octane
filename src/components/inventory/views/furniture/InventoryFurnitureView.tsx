import { InfiniteGrid } from '@layout/InfiniteGrid';
import { GetRoomEngine, GetSessionDataManager, IRoomSession, RoomPreviewer, Vector3d } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { FaTrashAlt } from 'react-icons/fa';
import {
    attemptItemPlacement,
    DispatchUiEvent,
    FurniCategory,
    getGroupItemKey,
    GroupItem,
    LocalizeText,
    localizeWithFallback,
    UnseenItemCategory
} from '../../../../api';
import { LayoutLimitedEditionCompactPlateView, LayoutRarityLevelView, LayoutRoomPreviewerView } from '../../../../common';
import { CatalogPostMarketplaceOfferEvent, DeleteItemConfirmEvent } from '../../../../events';
import { useInventoryFurni, useInventoryUnseenTracker } from '../../../../hooks';
import { OctaneButton } from '../../../../layout';
import { InventoryCategoryEmptyView } from '../InventoryCategoryEmptyView';
import { InventoryFurnitureItemView } from './InventoryFurnitureItemView';

const attemptPlaceMarketplaceOffer = (groupItem: GroupItem) => {
    const item = groupItem.getLastItem();
    if (!item || !item.sellable) return false;
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

    const [page, setPage] = useState(0);
    const pageCount = Math.floor(filteredGroupItems.length / 200) + 1;
    const currentPage = Math.min(page, pageCount - 1);

    useEffect(() => {
        setPage(0);
    }, [filteredGroupItems]);

    const tradeableCount = useMemo(() => {
        if (!selectedItem) return 0;
        return selectedItem.items.filter((item) => item.isTradable && !item.locked).length;
    }, [selectedItem]);

    const recyclableCount = useMemo(() => {
        if (!selectedItem) return 0;
        return selectedItem.items.filter((item) => item.recyclable && !item.locked).length;
    }, [selectedItem]);

    useEffect(() => {
        if (!selectedItem || !roomPreviewer) return;
        const furnitureItem = selectedItem.getLastItem();
        if (!furnitureItem) return;

        roomPreviewer.reset(false);

        const isRoomDecoration =
            furnitureItem.category === FurniCategory.WALL_PAPER ||
            furnitureItem.category === FurniCategory.FLOOR ||
            furnitureItem.category === FurniCategory.LANDSCAPE;

        const engine = GetRoomEngine();
        let floorType = engine.getRoomInstanceVariable<string>(engine.activeRoomId, 'room_floor_type') || '101';
        let wallType = engine.getRoomInstanceVariable<string>(engine.activeRoomId, 'room_wall_type') || '101';
        let landscapeType = engine.getRoomInstanceVariable<string>(engine.activeRoomId, 'room_landscape_type') || '1.1';

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
        roomPreviewer.updateRoomWallsAndFloorVisibility(selectedItem.isWallItem, true);
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

    if (!groupItems || !groupItems.length) {
        return <InventoryCategoryEmptyView desc={LocalizeText('inventory.empty.desc')} title={LocalizeText('inventory.empty.title')} />;
    }

    return (
        <div className="octane-inventory-furni">
            <div className="octane-inventory-furni-grid">
                <InfiniteGrid<GroupItem>
                    squareItems
                    classicScrollbar
                    columnCount={6}
                    columnGap={2}
                    rowGap={2}
                    itemKey={getGroupItemKey}
                    itemRender={(item) => <InventoryFurnitureItemView groupItem={item} isActive={item === selectedItem} onSelect={setSelectedItem} />}
                    items={filteredGroupItems.slice(currentPage * 200, (currentPage + 1) * 200)}
                />
                {pageCount > 1 && (
                    <div className="octane-inventory-pages">
                        {Array.from({ length: pageCount }, (_, index) => (
                            <button key={index} type="button" aria-current={index === currentPage ? 'page' : undefined} onClick={() => setPage(index)}>
                                {index}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="octane-inventory-furni-preview">
                <div
                    className="octane-inventory-furni-preview-stage"
                    onPointerDown={(event) => {
                        if (event.button !== 0 || !roomSession || !selectedItem) return;
                        if ([FurniCategory.FLOOR, FurniCategory.WALL_PAPER, FurniCategory.LANDSCAPE].includes(selectedItem.category)) return;
                        attemptItemPlacement(selectedItem);
                    }}
                >
                    <LayoutRoomPreviewerView
                        fitParent
                        roomPreviewer={roomPreviewer}
                        onPreviewClick={() => {
                            if (roomSession) attemptItemPlacement(selectedItem);
                        }}
                    />
                    {selectedItem && (
                        <div className="octane-inventory-furni-status">
                            <div
                                className={`octane-inventory-furni-status-icon ${tradeableCount > 0 ? 'is-trade' : 'is-no-trade'}`}
                                title={
                                    tradeableCount > 0
                                        ? LocalizeText('inventory.furni.trading.is_tradable', ['amount'], [String(tradeableCount)])
                                        : LocalizeText('inventory.furni.trading.is_not_tradable')
                                }
                            >
                                {tradeableCount > 0 && <span className="octane-inventory-furni-status-count is-trade-count">{tradeableCount}</span>}
                            </div>
                            <div
                                className={`octane-inventory-furni-status-icon ${recyclableCount > 0 ? 'is-recycle' : 'is-no-recycle'}`}
                                title={
                                    recyclableCount > 0
                                        ? LocalizeText('inventory.furni.recycling.is_recyclable', ['amount'], [String(recyclableCount)])
                                        : LocalizeText('inventory.furni.recycling.is_not_recyclable')
                                }
                            >
                                {recyclableCount > 0 && <span className="octane-inventory-furni-status-count is-recycle-count">{recyclableCount}</span>}
                            </div>
                        </div>
                    )}
                    {selectedItem && (
                        <button
                            type="button"
                            className="octane-inventory-preview-delete"
                            aria-label={LocalizeText('generic.delete')}
                            title={LocalizeText('generic.delete')}
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                                event.stopPropagation();
                                attemptDeleteItem(selectedItem);
                            }}
                        >
                            <FaTrashAlt aria-hidden="true" />
                        </button>
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
                    <div className="octane-inventory-furni-details">
                        <div className="octane-inventory-furni-name">{selectedItem.name}</div>
                        {selectedItem.description && <div className="octane-inventory-furni-desc">{selectedItem.description}</div>}
                        <div className="octane-inventory-furni-actions">
                            <OctaneButton
                                disabled={!roomSession || !selectedItem.getUnlockedCount()}
                                className="octane-inventory-btn-place"
                                onClick={() => attemptItemPlacement(selectedItem)}
                            >
                                {LocalizeText('inventory.furni.placetoroom')}
                            </OctaneButton>
                            <div className="octane-inventory-preview-controls">
                                <button type="button" onClick={() => roomPreviewer?.changeRoomObjectDirection()}>
                                    {localizeWithFallback('widget.furniture.button.rotate', 'Rotate')}
                                </button>
                                <button type="button" onClick={() => roomPreviewer?.changeRoomObjectState()}>
                                    {localizeWithFallback('widget.furniture.button.use', 'Use')}
                                </button>
                            </div>
                            {selectedItem.isSellable && (
                                <OctaneButton className="octane-inventory-btn-sell" onClick={() => attemptPlaceMarketplaceOffer(selectedItem)}>
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
