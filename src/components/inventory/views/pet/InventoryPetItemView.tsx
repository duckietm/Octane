import { MouseEventType } from '@octane/renderer';
import { FC, MouseEvent, PropsWithChildren, useState } from 'react';
import { attemptPetPlacement, IPetItem, UnseenItemCategory } from '../../../../api';
import { useInventoryPets, useInventoryUnseenTracker } from '../../../../hooks';
import { InventoryPetImageView } from './InventoryPetImageView';

export const InventoryPetItemView: FC<PropsWithChildren<{ petItem: IPetItem }>> = (props) => {
    const { petItem = null, children = null, ...rest } = props;
    const [isMouseDown, setMouseDown] = useState(false);
    const { selectedPet = null, setSelectedPet = null } = useInventoryPets();
    const { isUnseen } = useInventoryUnseenTracker();
    const unseen = isUnseen(UnseenItemCategory.PET, petItem.petData.id);

    const onMouseEvent = (event: MouseEvent) => {
        switch (event.type) {
            case MouseEventType.MOUSE_DOWN:
                setSelectedPet(petItem);
                setMouseDown(true);
                return;
            case MouseEventType.MOUSE_UP:
                setMouseDown(false);
                return;
            case 'mouseleave':
                if (!isMouseDown || !(petItem === selectedPet)) return;

                setMouseDown(false);
                attemptPetPlacement(petItem);
                return;
            case 'dblclick':
                attemptPetPlacement(petItem);
                return;
        }
    };

    return (
        <div
            className={`octane-inventory-thumb${petItem === selectedPet ? ' is-selected' : ''}${unseen ? ' is-unseen' : ''}`}
            onDoubleClick={onMouseEvent}
            onMouseDown={onMouseEvent}
            onMouseLeave={onMouseEvent}
            onMouseUp={onMouseEvent}
            {...rest}
        >
            <span className="octane-inventory-animal-thumb-image">
                <InventoryPetImageView pet={petItem.petData} />
            </span>
            {children}
        </div>
    );
};
