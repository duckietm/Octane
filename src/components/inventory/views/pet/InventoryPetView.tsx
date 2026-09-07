import { DeletePetMessageComposer, IRoomSession, RoomPreviewer } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { FaTrashAlt } from 'react-icons/fa';
import { attemptPetPlacement, IPetItem, LocalizeText, SendMessageComposer, UnseenItemCategory } from '../../../../api';
import { LayoutRoomPreviewerView } from '../../../../common';
import { useInventoryPets, useInventoryUnseenTracker, useNotification } from '../../../../hooks';
import { InfiniteGrid, OctaneButton } from '../../../../layout';
import { InventoryCategoryEmptyView } from '../InventoryCategoryEmptyView';
import { InventoryPetItemView } from './InventoryPetItemView';

export const InventoryPetView: FC<{
    roomSession: IRoomSession;
    roomPreviewer: RoomPreviewer;
}> = (props) => {
    const { roomSession = null, roomPreviewer = null } = props;
    const [isVisible, setIsVisible] = useState(false);
    const { petItems = null, selectedPet = null, activate = null, deactivate = null } = useInventoryPets();
    const { isUnseen = null, removeUnseen = null } = useInventoryUnseenTracker();
    const { showConfirm = null } = useNotification();

    const attemptDeletePet = () => {
        if (!selectedPet?.petData) return;

        showConfirm(
            LocalizeText('inventory.delete.confirm_delete.info', ['furniname', 'amount'], [selectedPet.petData.name, '1']),
            () => SendMessageComposer(new DeletePetMessageComposer(selectedPet.petData.id)),
            null,
            null,
            null,
            LocalizeText('inventory.delete.confirm_delete.title')
        );
    };

    useEffect(() => {
        if (!selectedPet || !roomPreviewer) return;

        const petData = selectedPet.petData;

        roomPreviewer.reset(false);
        roomPreviewer.updateRoomWallsAndFloorVisibility(true, true);
        roomPreviewer.updateObjectRoom('111', '217', '1.1');
        roomPreviewer.addPetIntoRoom(petData.figureString);
    }, [roomPreviewer, selectedPet]);

    useEffect(() => {
        if (!selectedPet || !isUnseen(UnseenItemCategory.PET, selectedPet.petData.id)) return;

        removeUnseen(UnseenItemCategory.PET, selectedPet.petData.id);
    }, [selectedPet, isUnseen, removeUnseen]);

    useEffect(() => {
        if (!isVisible) return;

        const id = activate();

        return () => deactivate(id);
    }, [isVisible, activate, deactivate]);

    useEffect(() => {
        setIsVisible(true);

        return () => setIsVisible(false);
    }, []);

    if (!petItems || !petItems.length)
        return <InventoryCategoryEmptyView desc={LocalizeText('inventory.empty.pets.desc')} title={LocalizeText('inventory.empty.pets.title')} />;

    return (
        <div className="grid h-full grid-cols-12 gap-2">
            <div className="flex flex-col col-span-7 gap-1 overflow-hidden">
                <InfiniteGrid<IPetItem>
                    columnCount={6}
                    estimateSize={46}
                    itemMinWidth={46}
                    itemRender={(item) => <InventoryPetItemView petItem={item} />}
                    items={petItems}
                />
            </div>
            <div className="flex flex-col col-span-5">
                <div className="relative flex flex-col">
                    <LayoutRoomPreviewerView height={140} roomPreviewer={roomPreviewer} />
                    {selectedPet && (
                        <OctaneButton className="bg-danger! hover:bg-danger/80! absolute bottom-2 inset-e-2 p-1" onClick={attemptDeletePet}>
                            <FaTrashAlt className="fa-icon" />
                        </OctaneButton>
                    )}
                </div>
                {selectedPet && selectedPet.petData && (
                    <div className="flex flex-col justify-between gap-2 grow">
                        <span className="text-sm truncate grow">{selectedPet.petData.name}</span>
                        {!!roomSession && (
                            <OctaneButton className="octane-inventory-btn-place" onClick={(event) => attemptPetPlacement(selectedPet)}>
                                {LocalizeText('inventory.furni.placetoroom')}
                            </OctaneButton>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
