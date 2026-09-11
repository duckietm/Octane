import {
    CreateLinkEvent,
    PetRespectComposer,
    PetSupplementComposer,
    PetType,
    RoomObjectCategory,
    RoomObjectType,
    RoomObjectVariable,
    RoomUnitGiveHandItemPetComposer
} from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import {
    AvatarInfoPet,
    GetConfigurationValue,
    GetOwnRoomObject,
    LocalizeText,
    localizeWithFallback,
    PetSupplementEnum,
    SendMessageComposer
} from '../../../../../api';
import { usePetBreedingWidget, useRoom, useSessionInfo } from '../../../../../hooks';
import { ContextMenuHeaderView } from '../../context-menu/ContextMenuHeaderView';
import { ContextMenuListItemView } from '../../context-menu/ContextMenuListItemView';
import { ContextMenuView } from '../../context-menu/ContextMenuView';

interface AvatarInfoWidgetOwnPetViewProps {
    avatarInfo: AvatarInfoPet;
    onClose: () => void;
}

const MODE_NORMAL: number = 0;
const MODE_SADDLED_UP: number = 1;
const MODE_RIDING: number = 2;
const MODE_MONSTER_PLANT: number = 3;

export const AvatarInfoWidgetOwnPetView: FC<AvatarInfoWidgetOwnPetViewProps> = (props) => {
    const { avatarInfo = null, onClose = null } = props;
    const [mode, setMode] = useState(MODE_NORMAL);
    const { roomSession = null, isHandItemBlocked = false } = useRoom();
    const { petRespectRemaining = 0, respectPet = null } = useSessionInfo();
    const { pendingPlantId = null, beginMonsterplantBreeding = null, cancelMonsterplantBreeding = null, breedMonsterplantWith = null } = usePetBreedingWidget();

    /** The second plant of a pair being chosen, as the official BreedPetView bubble asks for it. */
    const isBreedingTarget = pendingPlantId !== null && pendingPlantId !== avatarInfo?.id;

    const canGiveHandItem = useMemo(() => {
        if (isHandItemBlocked) return false;

        let flag = false;

        const roomObject = GetOwnRoomObject();

        if (roomObject) {
            const carryId = roomObject.model.getValue<number>(RoomObjectVariable.FIGURE_CARRY_OBJECT);

            if (carryId > 0 && carryId < 999999) flag = true;
        }

        return flag;
    }, [isHandItemBlocked]);

    const processAction = (name: string) => {
        let hideMenu = true;

        if (name) {
            switch (name) {
                case 'respect':
                    respectPet(avatarInfo.id);

                    if (petRespectRemaining - 1 >= 1) hideMenu = false;
                    break;
                case 'treat':
                    SendMessageComposer(new PetRespectComposer(avatarInfo.id));
                    break;
                // Official `InfoStandWidgetHandler` RWUAM_GIVE_WATER_TO_PET / RWUAM_GIVE_LIGHT_TO_PET:
                // `PetSupplementComposer(petId, supplement)` with the two monsterplant supplements.
                case 'give_water':
                    SendMessageComposer(new PetSupplementComposer(avatarInfo.id, PetSupplementEnum.WATER));
                    break;
                case 'give_light':
                    SendMessageComposer(new PetSupplementComposer(avatarInfo.id, PetSupplementEnum.LIGHT));
                    break;
                case 'pass_handitem':
                    SendMessageComposer(new RoomUnitGiveHandItemPetComposer(avatarInfo.id));
                    break;
                case 'train':
                    roomSession.requestPetCommands(avatarInfo.id);
                    break;
                case 'pick_up':
                    roomSession.pickupPet(avatarInfo.id);
                    break;
                case 'mount':
                    roomSession.mountPet(avatarInfo.id);
                    break;
                case 'toggle_riding_permission':
                    roomSession.togglePetRiding(avatarInfo.id);
                    break;
                case 'toggle_breeding_permission':
                    roomSession.togglePetBreeding(avatarInfo.id);
                    break;
                case 'dismount':
                    roomSession.dismountPet(avatarInfo.id);
                    break;
                case 'saddle_off':
                    roomSession.removePetSaddle(avatarInfo.id);
                    break;
                case 'breed':
                    if (mode === MODE_MONSTER_PLANT) {
                        // The plant that asks first; the second one is chosen by clicking it.
                        beginMonsterplantBreeding(avatarInfo.id);
                    }
                    break;
                case 'breed_with':
                    breedMonsterplantWith(avatarInfo.id);
                    break;
                case 'breed_cancel':
                    cancelMonsterplantBreeding();
                    break;
                case 'harvest':
                    roomSession.harvestPet(avatarInfo.id);
                    break;
                case 'revive':
                    //
                    break;
                case 'compost':
                    roomSession.compostPlant(avatarInfo.id);
                    break;
                case 'buy_saddle':
                    CreateLinkEvent('catalog/open/' + GetConfigurationValue('catalog.links')['pets.buy_saddle']);
                    break;
            }
        }

        if (hideMenu) onClose();
    };

    useEffect(() => {
        setMode((prevValue) => {
            if (avatarInfo.petType === PetType.MONSTERPLANT) return MODE_MONSTER_PLANT;
            else if (avatarInfo.saddle && !avatarInfo.rider) return MODE_SADDLED_UP;
            else if (avatarInfo.rider) return MODE_RIDING;

            return MODE_NORMAL;
        });
    }, [avatarInfo]);

    return (
        <ContextMenuView category={RoomObjectCategory.UNIT} collapsable={true} objectId={avatarInfo.roomIndex} userType={RoomObjectType.PET} onClose={onClose}>
            <ContextMenuHeaderView>{avatarInfo.name}</ContextMenuHeaderView>
            {mode === MODE_NORMAL && (
                <>
                    {petRespectRemaining > 0 && (
                        <ContextMenuListItemView onClick={(event) => processAction('respect')}>
                            {LocalizeText('infostand.button.petrespect', ['count'], [petRespectRemaining.toString()])}
                        </ContextMenuListItemView>
                    )}
                    <ContextMenuListItemView onClick={(event) => processAction('train')}>{LocalizeText('infostand.button.train')}</ContextMenuListItemView>
                    <ContextMenuListItemView onClick={(event) => processAction('pick_up')}>{LocalizeText('infostand.button.pickup')}</ContextMenuListItemView>
                    {avatarInfo.petType === PetType.HORSE && (
                        <ContextMenuListItemView onClick={(event) => processAction('buy_saddle')}>
                            {LocalizeText('infostand.button.buy_saddle')}
                        </ContextMenuListItemView>
                    )}
                    {[PetType.BEAR, PetType.TERRIER, PetType.CAT, PetType.DOG, PetType.PIG].indexOf(avatarInfo.petType) > -1 && (
                        <ContextMenuListItemView onClick={(event) => processAction('breed')}>{LocalizeText('infostand.button.breed')}</ContextMenuListItemView>
                    )}
                </>
            )}
            {mode === MODE_SADDLED_UP && (
                <>
                    <ContextMenuListItemView onClick={(event) => processAction('mount')}>{LocalizeText('infostand.button.mount')}</ContextMenuListItemView>
                    <ContextMenuListItemView gap={1} onClick={(event) => processAction('toggle_riding_permission')}>
                        <input checked={!!avatarInfo.publiclyRideable} readOnly={true} type="checkbox" />
                        {LocalizeText('infostand.button.toggle_riding_permission')}
                    </ContextMenuListItemView>
                    {petRespectRemaining > 0 && (
                        <ContextMenuListItemView onClick={(event) => processAction('respect')}>
                            {LocalizeText('infostand.button.petrespect', ['count'], [petRespectRemaining.toString()])}
                        </ContextMenuListItemView>
                    )}
                    <ContextMenuListItemView onClick={(event) => processAction('train')}>{LocalizeText('infostand.button.train')}</ContextMenuListItemView>
                    <ContextMenuListItemView onClick={(event) => processAction('pick_up')}>{LocalizeText('infostand.button.pickup')}</ContextMenuListItemView>
                    <ContextMenuListItemView onClick={(event) => processAction('saddle_off')}>
                        {LocalizeText('infostand.button.saddleoff')}
                    </ContextMenuListItemView>
                </>
            )}
            {mode === MODE_RIDING && (
                <>
                    <ContextMenuListItemView onClick={(event) => processAction('dismount')}>
                        {LocalizeText('infostand.button.dismount')}
                    </ContextMenuListItemView>
                    {petRespectRemaining > 0 && (
                        <ContextMenuListItemView onClick={(event) => processAction('respect')}>
                            {LocalizeText('infostand.button.petrespect', ['count'], [petRespectRemaining.toString()])}
                        </ContextMenuListItemView>
                    )}
                </>
            )}
            {mode === MODE_MONSTER_PLANT && (
                <>
                    <ContextMenuListItemView onClick={(event) => processAction('pick_up')}>{LocalizeText('infostand.button.pickup')}</ContextMenuListItemView>
                    {avatarInfo.dead && (
                        <ContextMenuListItemView onClick={(event) => processAction('revive')}>
                            {LocalizeText('infostand.button.revive')}
                        </ContextMenuListItemView>
                    )}
                    {roomSession.isRoomOwner && (
                        <ContextMenuListItemView onClick={(event) => processAction('compost')}>
                            {LocalizeText('infostand.button.compost')}
                        </ContextMenuListItemView>
                    )}
                    {!avatarInfo.dead && avatarInfo.energy / avatarInfo.maximumEnergy < 0.98 && (
                        <ContextMenuListItemView onClick={(event) => processAction('treat')}>
                            {LocalizeText('infostand.button.pettreat')}
                        </ContextMenuListItemView>
                    )}
                    {!avatarInfo.dead && (
                        <>
                            <ContextMenuListItemView onClick={(event) => processAction('give_water')}>
                                {localizeWithFallback('infostand.button.givewater', 'Give water')}
                            </ContextMenuListItemView>
                            <ContextMenuListItemView onClick={(event) => processAction('give_light')}>
                                {localizeWithFallback('infostand.button.givelight', 'Give light')}
                            </ContextMenuListItemView>
                        </>
                    )}
                    {!avatarInfo.dead && avatarInfo.level === avatarInfo.maximumLevel && avatarInfo.breedable && (
                        <>
                            <ContextMenuListItemView gap={1} onClick={(event) => processAction('toggle_breeding_permission')}>
                                <input checked={avatarInfo.publiclyBreedable} readOnly={true} type="checkbox" />
                                {LocalizeText('infostand.button.toggle_breeding_permission')}
                            </ContextMenuListItemView>
                            {!isBreedingTarget && (
                                <ContextMenuListItemView onClick={(event) => processAction('breed')}>
                                    {LocalizeText('infostand.button.breed')}
                                </ContextMenuListItemView>
                            )}
                            {isBreedingTarget && (
                                <>
                                    <ContextMenuListItemView onClick={(event) => processAction('breed_with')}>
                                        {localizeWithFallback('infostand.button.breed_with', 'Breed with the chosen plant')}
                                    </ContextMenuListItemView>
                                    <ContextMenuListItemView onClick={(event) => processAction('breed_cancel')}>
                                        {localizeWithFallback('infostand.button.breed_cancel', 'Choose another plant')}
                                    </ContextMenuListItemView>
                                </>
                            )}
                        </>
                    )}
                </>
            )}
            {canGiveHandItem && (
                <ContextMenuListItemView onClick={(event) => processAction('pass_hand_item')}>
                    {LocalizeText('infostand.button.pass_hand_item')}
                </ContextMenuListItemView>
            )}
        </ContextMenuView>
    );
};
