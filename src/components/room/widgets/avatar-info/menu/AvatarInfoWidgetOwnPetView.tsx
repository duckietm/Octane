import {
    CreateLinkEvent,
    PetRespectComposer,
    PetType,
    RoomObjectCategory,
    RoomObjectType,
    RoomObjectVariable,
    RoomUnitGiveHandItemPetComposer
} from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { FaBoxOpen, FaCookieBite, FaGraduationCap, FaHandHolding, FaHeart, FaHorse, FaPaw, FaRecycle, FaSearch, FaSeedling, FaShoppingCart, FaTimesCircle, FaWalking } from 'react-icons/fa';
import { AvatarInfoPet, confirmCompostPlant, GetConfigurationValue, GetConfigurationRecord, GetOwnRoomObject, LocalizeText, localizeWithFallback, SendMessageComposer } from '../../../../../api';
import { useNotification, useRoom, useSessionInfo, useWiredTools } from '../../../../../hooks';
import { ContextMenuHeaderView } from '../../context-menu/ContextMenuHeaderView';
import { ContextMenuListItemView } from '../../context-menu/ContextMenuListItemView';
import { ContextMenuView } from '../../context-menu/ContextMenuView';
import { monsterPlantMenu } from './monsterPlantMenu';
import { Checkbox } from '../../../../../common/Checkbox';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';

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
    const { roomSession = null } = useRoom();
    const { openInspectionForUser, showInspectButton } = useWiredTools();
    const { showConfirm = null } = useNotification();
    const { petRespectRemaining = 0, respectPet = null, chatStyleId = 0 } = useSessionInfo();

    // AIR PetMenuView / OwnPetMenuView: only handitem.give.pet.enabled, not the room's hand-item flag.
    const canGiveHandItem = useMemo(() => {
        if (!GetConfigurationValue('handitem.give.pet.enabled', true)) return false;

        let flag = false;

        const roomObject = GetOwnRoomObject();

        if (roomObject) {
            const carryId = roomObject.model.getValue<number>(RoomObjectVariable.FIGURE_CARRY_OBJECT);

            if (carryId > 0 && carryId < 999999) flag = true;
        }

        return flag;
    }, []);

    const processAction = (name: string) => {
        let hideMenu = true;

        if (name) {
            switch (name) {
                case 'inspect':
                    openInspectionForUser(avatarInfo.roomIndex);
                    break;
                case 'respect':
                    respectPet(avatarInfo.id);

                    if (petRespectRemaining - 1 >= 1) hideMenu = false;
                    break;
                case 'treat':
                    SendMessageComposer(new PetRespectComposer(avatarInfo.id));
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
                    if (mode === MODE_NORMAL) {
                        // Like Habbo: the breed command (46) sends the pet to a free breeding nest.
                        roomSession.sendChatMessage(`${avatarInfo.name} ${LocalizeText('pet.command.46')}`, chatStyleId);
                    } else if (mode === MODE_MONSTER_PLANT) {
                        // Official REQUEST_BREED_PET: mark the plants this one can breed with.
                        CreateLinkEvent(`monsterplant-breeding/request/${avatarInfo.roomIndex}`);
                    }
                    break;
                case 'harvest':
                    roomSession.harvestPet(avatarInfo.id);
                    break;
                case 'revive':
                    //
                    break;
                case 'compost':
                    confirmCompostPlant(showConfirm, () => roomSession.compostPlant(avatarInfo.id));
                    break;
                case 'buy_saddle':
                    CreateLinkEvent('catalog/open/' + GetConfigurationRecord('catalog.links')['pets.buy_saddle']);
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

    // Composting follows the hotel's setting like AIR; a hotel without the key keeps it on.
    const plantMenu = monsterPlantMenu(avatarInfo, !!roomSession?.isRoomOwner, GetConfigurationValue<boolean>('monsterplants.composting.enabled', true) !== false);

    return (
        <NativeTextTree>
            <ContextMenuView
                category={RoomObjectCategory.UNIT}
                classNames={['octane-avatar-action-menu', 'octane-avatar-action-menu--own']}
                collapsable={true}
                freezePositionOnHover={true}
                objectId={avatarInfo.roomIndex}
                showCaretIcon={false}
                userType={RoomObjectType.PET}
                onClose={onClose}
            >
                <ContextMenuHeaderView>{avatarInfo.name}</ContextMenuHeaderView>
                <div className="air-avatar-menu-buttons">
                    {mode === MODE_NORMAL && (
                        <>
                            {petRespectRemaining > 0 && (
                                <ContextMenuListItemView icon={<FaPaw />} onClick={(event) => processAction('respect')}>
                                    {LocalizeText('infostand.button.petrespect', ['count'], [petRespectRemaining.toString()])}
                                </ContextMenuListItemView>
                            )}
                            <ContextMenuListItemView icon={<FaGraduationCap />} onClick={(event) => processAction('train')}>{LocalizeText('infostand.button.train')}</ContextMenuListItemView>
                            <ContextMenuListItemView icon={<FaBoxOpen />} tone="danger" onClick={(event) => processAction('pick_up')}>{LocalizeText('infostand.button.pickup')}</ContextMenuListItemView>
                            {avatarInfo.petType === PetType.HORSE && (
                                <ContextMenuListItemView icon={<FaShoppingCart />} onClick={(event) => processAction('buy_saddle')}>
                                    {LocalizeText('infostand.button.buy_saddle')}
                                </ContextMenuListItemView>
                            )}
                            {[PetType.BEAR, PetType.TERRIER, PetType.CAT, PetType.DOG, PetType.PIG].indexOf(avatarInfo.petType) > -1 && (
                                <ContextMenuListItemView icon={<FaHeart />} onClick={(event) => processAction('breed')}>{LocalizeText('infostand.button.breed')}</ContextMenuListItemView>
                            )}
                        </>
                    )}
                    {mode === MODE_SADDLED_UP && (
                        <>
                            <ContextMenuListItemView icon={<FaHorse />} onClick={(event) => processAction('mount')}>{LocalizeText('infostand.button.mount')}</ContextMenuListItemView>
                            <ContextMenuListItemView gap={1} onClick={(event) => processAction('toggle_riding_permission')}>
                                <Checkbox checked={!!avatarInfo.publiclyRideable} readOnly={true} />
                                {LocalizeText('infostand.button.toggle_riding_permission')}
                            </ContextMenuListItemView>
                            {petRespectRemaining > 0 && (
                                <ContextMenuListItemView icon={<FaPaw />} onClick={(event) => processAction('respect')}>
                                    {LocalizeText('infostand.button.petrespect', ['count'], [petRespectRemaining.toString()])}
                                </ContextMenuListItemView>
                            )}
                            <ContextMenuListItemView icon={<FaGraduationCap />} onClick={(event) => processAction('train')}>{LocalizeText('infostand.button.train')}</ContextMenuListItemView>
                            <ContextMenuListItemView icon={<FaBoxOpen />} tone="danger" onClick={(event) => processAction('pick_up')}>{LocalizeText('infostand.button.pickup')}</ContextMenuListItemView>
                            <ContextMenuListItemView icon={<FaTimesCircle />} onClick={(event) => processAction('saddle_off')}>
                                {LocalizeText('infostand.button.saddleoff')}
                            </ContextMenuListItemView>
                        </>
                    )}
                    {mode === MODE_RIDING && (
                        <>
                            <ContextMenuListItemView icon={<FaWalking />} onClick={(event) => processAction('dismount')}>
                                {LocalizeText('infostand.button.dismount')}
                            </ContextMenuListItemView>
                            {petRespectRemaining > 0 && (
                                <ContextMenuListItemView icon={<FaPaw />} onClick={(event) => processAction('respect')}>
                                    {LocalizeText('infostand.button.petrespect', ['count'], [petRespectRemaining.toString()])}
                                </ContextMenuListItemView>
                            )}
                        </>
                    )}
                    {mode === MODE_MONSTER_PLANT && (
                        <>
                            <ContextMenuListItemView icon={<FaBoxOpen />} tone="danger" onClick={(event) => processAction('pick_up')}>{LocalizeText('infostand.button.pickup')}</ContextMenuListItemView>
                            {plantMenu.revive && (
                                <ContextMenuListItemView icon={<FaSeedling />} onClick={(event) => processAction('revive')}>
                                    {LocalizeText('infostand.button.revive')}
                                </ContextMenuListItemView>
                            )}
                            {plantMenu.compost && (
                                <ContextMenuListItemView icon={<FaRecycle />} tone="danger" onClick={(event) => processAction('compost')}>
                                    {LocalizeText('infostand.button.compost')}
                                </ContextMenuListItemView>
                            )}
                            {plantMenu.treat && (
                                <ContextMenuListItemView disabled={!plantMenu.treatEnabled} icon={<FaCookieBite />} onClick={(event) => processAction('treat')}>
                                    {LocalizeText('infostand.button.pettreat')}
                                </ContextMenuListItemView>
                            )}
                            {plantMenu.breeding && (
                                <>
                                    <ContextMenuListItemView gap={1} onClick={(event) => processAction('toggle_breeding_permission')}>
                                        <Checkbox checked={avatarInfo.publiclyBreedable} readOnly={true} />
                                        {LocalizeText('infostand.button.toggle_breeding_permission')}
                                    </ContextMenuListItemView>
                                    <ContextMenuListItemView icon={<FaHeart />} onClick={(event) => processAction('breed')}>
                                        {LocalizeText('infostand.button.breed')}
                                    </ContextMenuListItemView>
                                </>
                            )}
                        </>
                    )}
                    {canGiveHandItem && (
                        <ContextMenuListItemView icon={<FaHandHolding />} onClick={(event) => processAction('pass_hand_item')}>
                            {LocalizeText('infostand.button.pass_hand_item')}
                        </ContextMenuListItemView>
                    )}
                    {/* Official wired_inspect: the creator tools' inspection, for whoever may open it. */}
                    {showInspectButton && (
                        <ContextMenuListItemView icon={<FaSearch />} onClick={(event) => processAction('inspect')}>
                            {localizeWithFallback('octane.room.inspect', 'Inspect')}
                        </ContextMenuListItemView>
                    )}
                </div>
            </ContextMenuView>
        </NativeTextTree>
    );
};
