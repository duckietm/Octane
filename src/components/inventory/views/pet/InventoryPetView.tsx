import { InventoryFilterSelect } from '../InventoryFilterSelect';
import { DeletePetMessageComposer, IRoomSession, RoomPreviewer } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { FaTrashAlt } from 'react-icons/fa';
import { attemptPetPlacement, LocalizeText, localizeWithFallback, SendMessageComposer, UnseenItemCategory } from '../../../../api';
import { ClassicScrollAreaView } from '../../../../common/scroll-area/ClassicScrollAreaView';
import { useInventoryPets, useInventoryUnseenTracker, useNotification } from '../../../../hooks';
import { OctaneButton } from '../../../../layout';
import { InventoryCategoryEmptyView } from '../InventoryCategoryEmptyView';
import { InventoryPetImageView } from './InventoryPetImageView';
import { InventoryPetItemView } from './InventoryPetItemView';

export const InventoryPetView: FC<{
    roomSession: IRoomSession;
    roomPreviewer: RoomPreviewer;
}> = (props) => {
    const { roomSession = null } = props;
    const [isVisible, setIsVisible] = useState(false);
    const { petItems = null, selectedPet = null, setSelectedPet, activate = null, deactivate = null } = useInventoryPets();
    const { isUnseen = null, removeUnseen = null } = useInventoryUnseenTracker();
    const { showConfirm = null } = useNotification();

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState(-1);
    const availableTypes = useMemo(() => [...new Set((petItems ?? []).map(({ petData }) => petData.typeId))].sort((a, b) => a - b), [petItems]);
    const activeType = availableTypes.includes(typeFilter) ? typeFilter : -1;
    const visiblePets = useMemo(
        () =>
            (petItems ?? []).filter(
                ({ petData }) =>
                    (activeType === -1 || petData.typeId === activeType) &&
                    (!search || petData.name.toLowerCase().includes(search) || LocalizeText(`pet.type.${petData.typeId}`).toLowerCase().includes(search))
            ),
        [petItems, activeType, search]
    );

    useEffect(() => {
        if (!visiblePets.includes(selectedPet)) setSelectedPet(visiblePets[0] ?? null);
    }, [visiblePets, selectedPet, setSelectedPet]);

    const attemptDeletePet = () => {
        if (!selectedPet?.petData) return;

        showConfirm(
            localizeWithFallback(
                'inventory.delete.confirm_delete.info',
                `Delete ${selectedPet.petData.name}?`,
                ['furniname', 'amount'],
                [selectedPet.petData.name, '1']
            ),
            () => SendMessageComposer(new DeletePetMessageComposer(selectedPet.petData.id)),
            null,
            null,
            null,
            localizeWithFallback('inventory.delete.confirm_delete.title', 'Delete pet')
        );
    };

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

    if (!petItems || !petItems.length) {
        return <InventoryCategoryEmptyView desc={LocalizeText('inventory.empty.pets.desc')} title={LocalizeText('inventory.empty.pets.title')} />;
    }

    return (
        <div className="octane-inventory-animals is-pets">
            <div className="octane-inventory-filter-bar">
                <div className="octane-inventory-filter-search">
                    <input
                        className="octane-inventory-filter-input"
                        aria-label={LocalizeText('generic.search')}
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') setSearch(searchInput.toLowerCase());
                            if (event.key === 'Escape') {
                                setSearchInput('');
                                setSearch('');
                            }
                        }}
                    />
                    {searchInput && (
                        <button
                            type="button"
                            className="octane-inventory-filter-clear"
                            aria-label={LocalizeText('generic.clear')}
                            onClick={() => {
                                setSearchInput('');
                                setSearch('');
                            }}
                        />
                    )}
                </div>
                <InventoryFilterSelect
                    aria-label="Pet type"
                    value={activeType}
                    onChange={(value) => {
                        setTypeFilter(Number(value));
                        setSearch(searchInput.toLowerCase());
                    }}
                >
                    <option value={-1}>
                        {LocalizeText('inventory.pets.filter.type.all') === 'inventory.pets.filter.type.all'
                            ? 'All types'
                            : LocalizeText('inventory.pets.filter.type.all')}
                    </option>
                    {availableTypes.map((type) => (
                        <option key={type} value={type}>
                            {LocalizeText(`pet.type.${type}`)}
                        </option>
                    ))}
                </InventoryFilterSelect>
                <InventoryFilterSelect aria-label="Pet rarity" disabled>
                    <option>
                        {LocalizeText('inventory.pets.filter.rarity.all') === 'inventory.pets.filter.rarity.all'
                            ? 'All rarities'
                            : LocalizeText('inventory.pets.filter.rarity.all')}
                    </option>
                </InventoryFilterSelect>
            </div>
            <div className="octane-inventory-animal-grid">
                <ClassicScrollAreaView className="size-full">
                    <div className="octane-inventory-animal-cells">
                        {visiblePets.map((item) => (
                            <InventoryPetItemView key={item.petData.id} petItem={item} />
                        ))}
                    </div>
                </ClassicScrollAreaView>
            </div>
            <div className="octane-inventory-animal-preview">
                <div className="octane-inventory-animal-name">{selectedPet?.petData.name}</div>
                <div className="octane-inventory-animal-image">{selectedPet && <InventoryPetImageView pet={selectedPet.petData} preview />}</div>
                <div className="octane-inventory-animal-description">{selectedPet && LocalizeText(`pet.type.${selectedPet.petData.typeId}`)}</div>
                <div className="octane-inventory-animal-actions">
                    <OctaneButton
                        className="octane-inventory-animal-place"
                        disabled={!selectedPet || !(roomSession?.isRoomOwner || roomSession?.allowPets)}
                        onClick={() => attemptPetPlacement(selectedPet)}
                    >
                        {LocalizeText('inventory.pets.placetoroom')}
                    </OctaneButton>
                    <OctaneButton className="octane-inventory-btn-delete" disabled={!selectedPet} onClick={attemptDeletePet}>
                        <FaTrashAlt className="fa-icon" />
                        <span>{LocalizeText('generic.delete')}</span>
                    </OctaneButton>
                </div>
            </div>
        </div>
    );
};
