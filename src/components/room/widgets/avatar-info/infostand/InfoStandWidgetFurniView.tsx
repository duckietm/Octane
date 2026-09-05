import {
    CrackableDataType,
    CreateLinkEvent,
    FurnitureFloorUpdateEvent,
    GetRoomEngine,
    GetSoundManager,
    GroupInformationComposer,
    GroupInformationEvent,
    NowPlayingEvent,
    RoomControllerLevel,
    RoomObjectCategory,
    RoomObjectOperationType,
    RoomObjectVariable,
    RoomWidgetEnumItemExtradataParameter,
    RoomWidgetFurniInfoUsagePolicyEnum,
    SetObjectDataMessageComposer,
    SongInfoReceivedEvent,
    StringDataType,
    UpdateFurniturePositionComposer
} from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { FaCrosshairs, FaTimes } from 'react-icons/fa';
import { GrFormNextLink, GrRotateLeft, GrRotateRight } from 'react-icons/gr';
import { AvatarInfoFurni, GetConfigurationValue, GetGroupInformation, IPhotoData, isSafeExternalUrl, LocalizeText, SendMessageComposer } from '../../../../../api';
import {
    Button,
    Column,
    Flex,
    LayoutBadgeImageView,
    LayoutCurrencyIcon,
    LayoutLimitedEditionCompactPlateView,
    LayoutRarityLevelView,
    LayoutRoomObjectImageView,
    Text,
    UserProfileIconView
} from '../../../../../common';
import { useHasPermission, useMessageEvent, useOctaneEvent, useRareValues, useRoom, useWiredTools } from '../../../../../hooks';
import { OctaneInput } from '../../../../../layout';
import { ImagePositionEditorView } from './ImagePositionEditorView';

interface InfoStandWidgetFurniViewProps {
    avatarInfo: AvatarInfoFurni;
    onClose: () => void;
}

const PICKUP_MODE_NONE: number = 0;
const PICKUP_MODE_EJECT: number = 1;
const PICKUP_MODE_FULL: number = 2;

function formatPlantDuration(totalSeconds: number): string {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;

    return `${secs}s`;
}

function getValidRoomObjectDirection(roomObject: any, isPositive: boolean) {
    if (!roomObject || !roomObject.model) return 0;

    let allowedDirections: number[] = [];

    if (roomObject.type === 'monster_plant') {
        allowedDirections = roomObject.model.getValue('pet_allowed_directions');
    } else {
        allowedDirections = roomObject.model.getValue('furniture_allowed_directions');
    }

    let direction = roomObject.getDirection().x;

    if (allowedDirections && allowedDirections.length) {
        let index = allowedDirections.indexOf(direction);

        if (index < 0) {
            index = 0;

            for (let i = 0; i < allowedDirections.length; i++) {
                if (direction <= allowedDirections[i]) break;

                index++;
            }

            index = index % allowedDirections.length;
        }

        if (isPositive) {
            index = (index + 1) % allowedDirections.length;
        } else {
            index = (index - 1 + allowedDirections.length) % allowedDirections.length;
        }

        direction = allowedDirections[index];
    }

    return direction;
}

export const InfoStandWidgetFurniView: FC<InfoStandWidgetFurniViewProps> = (props) => {
    const { avatarInfo = null, onClose = null } = props;
    const { roomSession = null } = useRoom();
    const { openInspectionForFurni, showInspectButton } = useWiredTools();
    const isModerator = useHasPermission('acc_anyroomowner');
    const { getValue: getRareValue } = useRareValues();
    const rareValue = useMemo(() => (avatarInfo ? getRareValue(avatarInfo.spriteId) : null), [avatarInfo, getRareValue]);

    const externalImagePhotoUrl = useMemo(() => {
        if (!avatarInfo || !roomSession) return null;

        const roomObject = GetRoomEngine().getRoomObject(roomSession.roomId, avatarInfo.id, avatarInfo.category);

        if (!roomObject || roomObject.type.indexOf('external_image') !== 0) return null;

        try {
            const photoData = JSON.parse(roomObject.model.getValue<string>(RoomObjectVariable.FURNITURE_DATA)) as IPhotoData;
            const photoUrl = photoData?.w ?? null;

            return photoUrl && isSafeExternalUrl(photoUrl) ? photoUrl : null;
        } catch {
            return null;
        }
    }, [avatarInfo, roomSession]);
    const descriptionsEnabled = GetConfigurationValue<boolean>('furni.descriptions.enabled', true);
    const itemLocationEnabled = GetConfigurationValue<boolean>('furni.location.enabled', true);
    const itemLocationRequireAccess = GetConfigurationValue<boolean>('furni.location.require.access', true);
    const [pickupMode, setPickupMode] = useState(0);
    const [canMove, setCanMove] = useState(false);
    const [canRotate, setCanRotate] = useState(false);
    const [canUse, setCanUse] = useState(false);
    const [furniKeys, setFurniKeys] = useState<string[]>([]);
    const [furniValues, setFurniValues] = useState<string[]>([]);
    const [customKeys, setCustomKeys] = useState<string[]>([]);
    const [customValues, setCustomValues] = useState<string[]>([]);
    const [isCrackable, setIsCrackable] = useState(false);
    const [crackableHits, setCrackableHits] = useState(0);
    const [crackableTarget, setCrackableTarget] = useState(0);
    const [isPlant, setIsPlant] = useState(false);
    const [plantWaterSeconds, setPlantWaterSeconds] = useState(0);
    const [plantDeathSeconds, setPlantDeathSeconds] = useState(0);
    const [plantDead, setPlantDead] = useState(false);
    const plantClassnames = GetConfigurationValue<string[]>('furni.plant.classnames', []) ?? [];
    const [godMode, setGodMode] = useState(false);
    const [canSeeFurniId, setCanSeeFurniId] = useState(false);
    const [groupName, setGroupName] = useState<string>(null);
    const [isJukeBox, setIsJukeBox] = useState<boolean>(false);
    const [isSongDisk, setIsSongDisk] = useState<boolean>(false);
    const [isBranded, setIsBranded] = useState<boolean>(false);
    const [showPositionEditor, setShowPositionEditor] = useState<boolean>(false);
    const [songId, setSongId] = useState<number>(-1);
    const [songName, setSongName] = useState<string>('');
    const [songCreator, setSongCreator] = useState<string>('');
    const [itemLocation, setItemLocation] = useState<{ x: number; y: number; z: number }>({ x: -1, y: -1, z: -1 });
    const [dropdownOpen, setDropdownOpen] = useState(sessionStorage.getItem('dropdownOpen') === 'true');
    const [furniLocationZ, setFurniLocationZ] = useState<number>(null);
    const showOwnerProfileIcon = useMemo(() => {
        const ownerName = (avatarInfo?.ownerName || '').trim().toLowerCase();

        return !!avatarInfo && avatarInfo.ownerId > 0 && ownerName !== 'builders club';
    }, [avatarInfo]);

    const sendUpdate = useCallback(
        (deltaX: number, deltaY: number, newZ: number = 0, deltaDirection: number = 0) => {
            if (!avatarInfo) return;

            const roomId = GetRoomEngine().activeRoomId;
            const roomObject = GetRoomEngine().getRoomObject(roomId, avatarInfo.id, avatarInfo.category);

            if (!roomObject) return;

            const newX = roomObject.getLocation().x + deltaX;
            const newY = roomObject.getLocation().y + deltaY;
            const currentDirection = roomObject.getDirection().x;

            const newDirection = deltaDirection !== 0 ? getValidRoomObjectDirection(roomObject, deltaDirection > 0) / 45 : currentDirection / 45;

            SendMessageComposer(new UpdateFurniturePositionComposer(avatarInfo.id, newX, newY, Math.round(newZ * 10000), newDirection));
        },
        [avatarInfo]
    );

    const handleHeightChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            let newZ = parseFloat(event.target.value);

            if (isNaN(newZ) || newZ < 0) newZ = 0;
            else if (newZ > 40) newZ = 40;

            setFurniLocationZ(newZ);
            sendUpdate(0, 0, newZ, 0);
        },
        [sendUpdate]
    );

    const handleHeightBlur = useCallback(
        (event: React.FocusEvent<HTMLInputElement>) => {
            let newZ = parseFloat(event.target.value);

            if (isNaN(newZ) || newZ < 0) newZ = 0;
            else if (newZ > 40) newZ = 40;

            newZ = parseFloat(newZ.toFixed(4));
            setFurniLocationZ(newZ);
            sendUpdate(0, 0, newZ, 0);
        },
        [sendUpdate]
    );

    const adjustHeight = useCallback(
        (amount: number) => {
            let newZ = (furniLocationZ ?? 0) + amount;

            if (newZ < 0) newZ = 0;
            else if (newZ > 40) newZ = 40;

            newZ = parseFloat(newZ.toFixed(4));
            setFurniLocationZ(newZ);
            sendUpdate(0, 0, newZ, 0);
        },
        [furniLocationZ, sendUpdate]
    );

    useOctaneEvent<NowPlayingEvent>(
        NowPlayingEvent.NPE_SONG_CHANGED,
        (event) => {
            setSongId(event.id);
        },
        isJukeBox || isSongDisk
    );

    useOctaneEvent<NowPlayingEvent>(
        SongInfoReceivedEvent.SIR_TRAX_SONG_INFO_RECEIVED,
        (event) => {
            if (event.id !== songId) return;

            const songInfo = GetSoundManager().musicController.getSongInfo(event.id);

            if (!songInfo) return;

            setSongName(songInfo.name);
            setSongCreator(songInfo.creator);
        },
        isJukeBox || isSongDisk
    );

    useEffect(() => {
        let pickupMode = PICKUP_MODE_NONE;
        let canMove = false;
        let canRotate = false;
        let canUse = false;
        let furniKeyss: string[] = [];
        let furniValuess: string[] = [];
        let customKeyss: string[] = [];
        let customValuess: string[] = [];
        let isCrackable = false;
        let crackableHits = 0;
        let crackableTarget = 0;
        let isPlant = false;
        let plantWaterSeconds = 0;
        let plantDeathSeconds = 0;
        let plantDead = false;
        let godMode = false;
        let canSeeFurniId = false;
        let furniIsJukebox = false;
        let furniIsSongDisk = false;
        let furniSongId = -1;

        const roomObjForLocation = GetRoomEngine().getRoomObject(
            roomSession.roomId,
            avatarInfo.id,
            avatarInfo.isWallItem ? RoomObjectCategory.WALL : RoomObjectCategory.FLOOR
        );
        const location = roomObjForLocation?.getLocation();

        if (location) {
            setItemLocation({ x: location.x, y: location.y, z: location.z });
            setFurniLocationZ(location.z);
        }

        const isValidController = avatarInfo.roomControllerLevel >= RoomControllerLevel.GUEST;

        if (isValidController || avatarInfo.isOwner || avatarInfo.isRoomOwner || avatarInfo.isAnyRoomController) {
            canMove = true;
            canRotate = !avatarInfo.isWallItem;
            if (avatarInfo.roomControllerLevel >= RoomControllerLevel.MODERATOR) godMode = true;
        }

        if (avatarInfo.isAnyRoomController) {
            canSeeFurniId = true;
        }

        if (
            avatarInfo.usagePolicy === RoomWidgetFurniInfoUsagePolicyEnum.EVERYBODY ||
            (avatarInfo.usagePolicy === RoomWidgetFurniInfoUsagePolicyEnum.CONTROLLER && isValidController) ||
            (avatarInfo.extraParam === RoomWidgetEnumItemExtradataParameter.JUKEBOX && isValidController) ||
            (avatarInfo.extraParam === RoomWidgetEnumItemExtradataParameter.USABLE_PRODUCT && isValidController)
        )
            canUse = true;

        if (avatarInfo.extraParam) {
            if (avatarInfo.extraParam === RoomWidgetEnumItemExtradataParameter.CRACKABLE_FURNI) {
                const stuffData = avatarInfo.stuffData as CrackableDataType;

                canUse = true;

                if (roomObjForLocation && plantClassnames.indexOf(roomObjForLocation.type) >= 0) {
                    isPlant = true;
                    const rawDeath = stuffData?.target ?? 0;
                    plantDead = rawDeath < 0;
                    plantWaterSeconds = Math.max(0, stuffData?.hits ?? 0);
                    plantDeathSeconds = plantDead ? 0 : rawDeath;
                } else {
                    isCrackable = true;
                    crackableHits = stuffData?.hits ?? 0;
                    crackableTarget = stuffData?.target ?? 0;
                }
            } else if (avatarInfo.extraParam === RoomWidgetEnumItemExtradataParameter.JUKEBOX) {
                const playlist = GetSoundManager().musicController.getRoomItemPlaylist();

                if (playlist) {
                    furniSongId = playlist.currentSongId;
                }

                furniIsJukebox = true;
            } else if (avatarInfo.extraParam.indexOf(RoomWidgetEnumItemExtradataParameter.SONGDISK) === 0) {
                furniSongId = parseInt(avatarInfo.extraParam.substr(RoomWidgetEnumItemExtradataParameter.SONGDISK.length));

                furniIsSongDisk = true;
            }

            if (godMode) {
                const extraParam = avatarInfo.extraParam.substr(RoomWidgetEnumItemExtradataParameter.BRANDING_OPTIONS.length);

                if (extraParam) {
                    const parts = extraParam.split('\t');

                    for (const part of parts) {
                        const value = part.split('=');

                        if (value && value.length === 2) {
                            furniKeyss.push(value[0]);
                            furniValuess.push(value[1]);
                        }
                    }
                }
            }
        }

        if (godMode) {
            const roomObject = GetRoomEngine().getRoomObject(
                roomSession.roomId,
                avatarInfo.id,
                avatarInfo.isWallItem ? RoomObjectCategory.WALL : RoomObjectCategory.FLOOR
            );

            if (roomObject) {
                const customVariables = roomObject.model.getValue<string[]>(RoomObjectVariable.FURNITURE_CUSTOM_VARIABLES);
                const furnitureData = roomObject.model.getValue<{ [index: string]: string }>(RoomObjectVariable.FURNITURE_DATA);

                if (customVariables && customVariables.length) {
                    for (const customVariable of customVariables) {
                        customKeyss.push(customVariable);
                        customValuess.push(furnitureData[customVariable] || '');
                    }
                }
            }
        }

        if (avatarInfo.isOwner || avatarInfo.isAnyRoomController) pickupMode = PICKUP_MODE_FULL;
        else if (avatarInfo.isRoomOwner || avatarInfo.roomControllerLevel >= RoomControllerLevel.GUILD_ADMIN) pickupMode = PICKUP_MODE_EJECT;

        if (avatarInfo.isStickie) pickupMode = PICKUP_MODE_NONE;

        setPickupMode(pickupMode);
        setCanMove(canMove);
        setCanRotate(canRotate);
        setCanUse(canUse);
        setFurniKeys(furniKeyss);
        setFurniValues(furniValuess);
        setCustomKeys(customKeyss);
        setCustomValues(customValuess);
        setIsCrackable(isCrackable);
        setCrackableHits(crackableHits);
        setCrackableTarget(crackableTarget);
        setIsPlant(isPlant);
        setPlantWaterSeconds(plantWaterSeconds);
        setPlantDeathSeconds(plantDeathSeconds);
        setPlantDead(plantDead);
        setGodMode(godMode);
        setCanSeeFurniId(canSeeFurniId);
        setGroupName(null);
        setIsJukeBox(furniIsJukebox);
        setIsSongDisk(furniIsSongDisk);
        setSongId(furniSongId);
        setIsBranded(!!avatarInfo.extraParam && avatarInfo.extraParam.indexOf(RoomWidgetEnumItemExtradataParameter.BRANDING_OPTIONS) === 0);

        if (avatarInfo.groupId) SendMessageComposer(new GroupInformationComposer(avatarInfo.groupId, false));
    }, [roomSession, avatarInfo]);

    useMessageEvent<GroupInformationEvent>(GroupInformationEvent, (event) => {
        const parser = event.getParser();

        if (!avatarInfo || avatarInfo.groupId !== parser.id || parser.flag) return;

        if (groupName) setGroupName(null);

        setGroupName(parser.title);
    });

    useMessageEvent<FurnitureFloorUpdateEvent>(FurnitureFloorUpdateEvent, (event) => {
        const parser = event.getParser();
        const item = parser.item;

        if (!avatarInfo || item.itemId !== avatarInfo.id) return;

        setItemLocation({ x: item.x, y: item.y, z: item.z });
        setFurniLocationZ(item.z);

        if (isPlant) {
            const data = item.data as CrackableDataType;

            if (data) {
                const rawDeath = data.target ?? 0;
                const dead = rawDeath < 0;

                setPlantDead(dead);
                setPlantWaterSeconds(Math.max(0, data.hits ?? 0));
                setPlantDeathSeconds(dead ? 0 : rawDeath);
            }
        }
    });

    useEffect(() => {
        const songInfo = GetSoundManager().musicController.getSongInfo(songId);

        setSongName(songInfo?.name ?? '');
        setSongCreator(songInfo?.creator ?? '');
    }, [songId]);

    useEffect(() => {
        if (!isPlant || plantDead) return;

        const handle = setInterval(() => {
            setPlantWaterSeconds((seconds) => (seconds > 0 ? seconds - 1 : 0));
            setPlantDeathSeconds((seconds) => (seconds > 0 ? seconds - 1 : 0));
        }, 1000);

        return () => clearInterval(handle);
    }, [isPlant, plantDead]);

    const onFurniSettingChange = useCallback(
        (index: number, value: string) => {
            const clone = Array.from(furniValues);

            clone[index] = value;

            setFurniValues(clone);
        },
        [furniValues]
    );

    const onCustomVariableChange = useCallback(
        (index: number, value: string) => {
            const clone = Array.from(customValues);

            clone[index] = value;

            setCustomValues(clone);
        },
        [customValues]
    );

    const getFurniSettingsAsString = useCallback(() => {
        if (furniKeys.length === 0 || furniValues.length === 0) return '';

        let data = '';

        let i = 0;

        while (i < furniKeys.length) {
            const key = furniKeys[i];
            const value = furniValues[i];

            data = data + (key + '=' + value + '\t');

            i++;
        }

        return data;
    }, [furniKeys, furniValues]);

    const getBrandingOffset = useCallback(
        (key: string): number => {
            const index = furniKeys.indexOf(key);
            if (index < 0) return 0;
            const value = parseInt(furniValues[index]);
            return isNaN(value) ? 0 : value;
        },
        [furniKeys, furniValues]
    );

    const hasBrandingOffsets = isBranded && furniKeys.indexOf('offsetX') >= 0;

    const savePositionEditor = useCallback(
        (x: number, y: number, z: number, scale: number, alpha: number) => {
            const map = new Map<string, string>();
            const clone = Array.from(furniValues);
            let hasScale = false;
            let hasAlpha = false;

            for (let i = 0; i < furniKeys.length; i++) {
                const key = furniKeys[i];
                let value = furniValues[i];

                if (key === 'offsetX') value = String(x);
                else if (key === 'offsetY') value = String(y);
                else if (key === 'offsetZ') value = String(z);
                else if (key === 'scale') {
                    value = String(scale);
                    hasScale = true;
                } else if (key === 'alpha') {
                    value = String(alpha);
                    hasAlpha = true;
                }

                clone[i] = value;
                map.set(key, value);
            }

            if (!hasScale) map.set('scale', String(scale));
            if (!hasAlpha) map.set('alpha', String(alpha));

            GetRoomEngine().modifyRoomObjectDataWithMap(avatarInfo.id, avatarInfo.category, RoomObjectOperationType.OBJECT_SAVE_STUFF_DATA, map);
            setFurniValues(clone);
        },
        [avatarInfo, furniKeys, furniValues]
    );

    const processButtonAction = useCallback(
        (action: string) => {
            if (!action || action === '') return;

            let objectData: string = null;

            switch (action) {
                case 'buy_one':
                    CreateLinkEvent(`catalog/open/offerId/${avatarInfo.purchaseOfferId}`);
                    return;
                case 'move':
                    GetRoomEngine().processRoomObjectOperation(avatarInfo.id, avatarInfo.category, RoomObjectOperationType.OBJECT_MOVE);
                    break;
                case 'rotate':
                    GetRoomEngine().processRoomObjectOperation(avatarInfo.id, avatarInfo.category, RoomObjectOperationType.OBJECT_ROTATE_POSITIVE);
                    break;
                case 'pickup':
                    if (pickupMode === PICKUP_MODE_FULL) {
                        GetRoomEngine().processRoomObjectOperation(avatarInfo.id, avatarInfo.category, RoomObjectOperationType.OBJECT_PICKUP);
                    } else {
                        GetRoomEngine().processRoomObjectOperation(avatarInfo.id, avatarInfo.category, RoomObjectOperationType.OBJECT_EJECT);
                    }
                    break;
                case 'use':
                    GetRoomEngine().useRoomObject(avatarInfo.id, avatarInfo.category);
                    break;
                case 'save_branding_configuration': {
                    const mapData = new Map<string, string>();
                    const dataParts = getFurniSettingsAsString().split('\t');

                    if (dataParts) {
                        for (const part of dataParts) {
                            const [key, value] = part.split('=', 2);

                            mapData.set(key, value);
                        }
                    }

                    GetRoomEngine().modifyRoomObjectDataWithMap(avatarInfo.id, avatarInfo.category, RoomObjectOperationType.OBJECT_SAVE_STUFF_DATA, mapData);
                    break;
                }
                case 'save_custom_variables': {
                    const map = new Map();

                    for (let i = 0; i < customKeys.length; i++) {
                        const key = customKeys[i];
                        const value = customValues[i];

                        if (key && key.length && value && value.length) map.set(key, value);
                    }

                    SendMessageComposer(new SetObjectDataMessageComposer(avatarInfo.id, map));
                    break;
                }
            }
        },
        [avatarInfo, pickupMode, customKeys, customValues, getFurniSettingsAsString]
    );

    const getGroupBadgeCode = useCallback(() => {
        const stringDataType = avatarInfo.stuffData as StringDataType;

        if (!stringDataType || !(stringDataType instanceof StringDataType)) return null;

        return stringDataType.getValue(2);
    }, [avatarInfo]);

    if (!avatarInfo) return null;

    return (
        <Column alignItems="end" gap={1}>
            <Column className="relative min-w-[190px] max-w-[190px] z-30 pointer-events-auto bg-[rgba(28,28,32,.95)] [box-shadow:inset_0_5px_#22222799,inset_0_-4px_#12121599] rounded">
                <Column className="h-full p-[8px] overflow-auto" gap={1} overflow="visible">
                    <div className="flex flex-col gap-1">
                        <Flex alignItems="center" gap={1} justifyContent="between">
                            <Text small wrap variant="white">
                                {avatarInfo.name}
                            </Text>
                            <FaTimes className="cursor-pointer fa-icon" onClick={onClose} />
                        </Flex>
                        <hr className="m-0 bg-[#0003] border-0 opacity-[.5] h-px" />
                    </div>
                    {!isBranded && (
                        <div className="flex flex-col gap-1">
                            <Flex gap={1} position="relative">
                                {avatarInfo.stuffData.isUnique && (
                                    <div className="absolute inset-e-0">
                                        <LayoutLimitedEditionCompactPlateView
                                            uniqueNumber={avatarInfo.stuffData.uniqueNumber}
                                            uniqueSeries={avatarInfo.stuffData.uniqueSeries}
                                        />
                                    </div>
                                )}
                                {avatarInfo.stuffData.rarityLevel > -1 && (
                                    <div className="absolute inset-e-0">
                                        <LayoutRarityLevelView level={avatarInfo.stuffData.rarityLevel} />
                                    </div>
                                )}
                                <Flex center fullWidth className="min-h-[74px] max-h-[86px] overflow-hidden">
                                    {externalImagePhotoUrl ? (
                                        <div className="bg-white p-[3px] pb-[9px] rounded-[2px] border border-[#00000080] shadow-[1px_2px_3px_rgba(0,0,0,0.5)]">
                                            <img
                                                alt=""
                                                draggable={false}
                                                src={externalImagePhotoUrl}
                                                style={{ width: 64, height: 64, objectFit: 'contain', imageRendering: 'pixelated' }}
                                            />
                                        </div>
                                    ) : (
                                        <LayoutRoomObjectImageView
                                            category={avatarInfo.category}
                                            objectId={avatarInfo.id}
                                            roomId={roomSession.roomId}
                                            style={{
                                                maxWidth: 120,
                                                maxHeight: 82,
                                                backgroundSize: 'contain',
                                                backgroundPosition: 'center',
                                                backgroundRepeat: 'no-repeat'
                                            }}
                                        />
                                    )}
                                </Flex>
                            </Flex>
                            <hr className="m-0 bg-[#0003] border-0 opacity-[.5] h-px" />
                        </div>
                    )}
                    {avatarInfo.description && descriptionsEnabled && (
                        <Column gap={1}>
                            <Text fullWidth wrap textBreak variant="white" small>
                                {avatarInfo.description}
                            </Text>
                            <hr className="m-0 bg-[#0003] border-0 opacity-[.5] h-px" />
                        </Column>
                    )}
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                            {showOwnerProfileIcon && <UserProfileIconView userId={avatarInfo.ownerId} />}
                            <Text small wrap variant="white">
                                {LocalizeText('furni.owner', ['name'], [avatarInfo.ownerName])}
                            </Text>
                        </div>
                        {avatarInfo.purchaseOfferId > 0 && (
                            <Flex>
                                <Text pointer small underline variant="white" onClick={(event) => processButtonAction('buy_one')}>
                                    {LocalizeText('infostand.button.buy')}
                                </Text>
                            </Flex>
                        )}
                    </div>
                    {(isJukeBox || isSongDisk) && (
                        <div className="flex flex-col gap-1">
                            <hr className="m-0 bg-[#0003] border-0 opacity-[.5] h-px" />
                            {songId === -1 && (
                                <Text small wrap variant="white">
                                    {LocalizeText('infostand.jukebox.text.not.playing')}
                                </Text>
                            )}
                            {!!songName.length && (
                                <div className="flex items-center gap-1">
                                    <div className="icon disk-icon" />
                                    <Text small wrap variant="white">
                                        {songName}
                                    </Text>
                                </div>
                            )}
                            {!!songCreator.length && (
                                <div className="flex items-center gap-1">
                                    <div className="icon disk-creator" />
                                    <Text small wrap variant="white">
                                        {songCreator}
                                    </Text>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="flex flex-col gap-1">
                        {isCrackable && (
                            <>
                                <hr className="m-0 bg-[#0003] border-0 opacity-[.5] h-px" />
                                <Text small wrap variant="white">
                                    {LocalizeText(
                                        'infostand.crackable_furni.hits_remaining',
                                        ['hits', 'target'],
                                        [(crackableHits ?? 0).toString(), (crackableTarget ?? 0).toString()]
                                    )}
                                </Text>
                            </>
                        )}
                        {isPlant && (
                            <>
                                <hr className="m-0 bg-[#0003] border-0 opacity-[.5] h-px" />
                                {plantDead ? (
                                    <Text small wrap variant="danger">
                                        {LocalizeText('infostand.plant.dead')}
                                    </Text>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        <Flex alignItems="center" gap={1} justifyContent="between">
                                            <Text small wrap variant="white">
                                                {LocalizeText('infostand.plant.rewater')}
                                            </Text>
                                            <Text small wrap variant={plantWaterSeconds > 0 ? 'white' : 'success'}>
                                                {plantWaterSeconds > 0
                                                    ? formatPlantDuration(plantWaterSeconds)
                                                    : LocalizeText('infostand.plant.ready')}
                                            </Text>
                                        </Flex>
                                        <Flex alignItems="center" gap={1} justifyContent="between">
                                            <Text small wrap variant="white">
                                                {LocalizeText('infostand.plant.dies')}
                                            </Text>
                                            <Text small wrap variant={plantDeathSeconds > 0 ? 'white' : 'danger'}>
                                                {plantDeathSeconds > 0
                                                    ? formatPlantDuration(plantDeathSeconds)
                                                    : LocalizeText('infostand.plant.needswater')}
                                            </Text>
                                        </Flex>
                                    </div>
                                )}
                            </>
                        )}
                        {avatarInfo.groupId > 0 && (
                            <>
                                <hr className="m-0 bg-[#0003] border-0 opacity-[.5] h-px" />
                                <Flex pointer alignItems="center" gap={2} onClick={() => GetGroupInformation(avatarInfo.groupId)}>
                                    <LayoutBadgeImageView badgeCode={getGroupBadgeCode()} isGroup={true} />
                                    <Text underline variant="white">
                                        {groupName}
                                    </Text>
                                </Flex>
                            </>
                        )}
                        {itemLocation.x > -1 && itemLocationEnabled && (!itemLocationRequireAccess || canMove) && (
                            <>
                                <hr className="m-0 bg-[#0003] border-0 opacity-[.5] h-px" />
                                <div className="flex items-center gap-1 min-w-0">
                                    <FaCrosshairs className="fa-icon shrink-0" />
                                    <Text small textBreak variant="white">
                                        X: {itemLocation.x} · Y: {itemLocation.y} · H: {itemLocation.z < 0.01 ? 0 : itemLocation.z}
                                    </Text>
                                </div>
                            </>
                        )}
                        {rareValue && rareValue.points > 0 && (
                            <>
                                <hr className="m-0 bg-[#0003] border-0 opacity-[.5] h-px" />
                                <Flex alignItems="center" gap={2}>
                                    <Text small variant="white">
                                        {LocalizeText('rarevalues.infostand.label')}
                                    </Text>
                                    <Flex alignItems="center" gap={1}>
                                        <Text small variant="white">
                                            {rareValue.points}
                                        </Text>
                                        <LayoutCurrencyIcon type={rareValue.pointsType} />
                                    </Flex>
                                </Flex>
                            </>
                        )}
                        {godMode && (
                            <>
                                <hr className="m-0 bg-[#0003] border-0 opacity-[.5] h-px" />
                                {canSeeFurniId && (
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-[#7ec8e3]">
                                                <path
                                                    fillRule="evenodd"
                                                    d="M4.93 1.31a41.401 41.401 0 0 1 10.14 0C16.194 1.45 17 2.414 17 3.517V18.25a.75.75 0 0 1-1.075.676l-2.8-1.344-2.8 1.344a.75.75 0 0 1-.65 0l-2.8-1.344-2.8 1.344A.75.75 0 0 1 3 18.25V3.517c0-1.103.806-2.068 1.93-2.207Z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                            <Text small wrap variant="white">
                                                ID: {avatarInfo.id}
                                            </Text>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-[#7ec8e3]">
                                                <path d="M5.127 3.502 5.25 3.5h9.5c.041 0 .082 0 .123.002A2.251 2.251 0 0 0 12.75 2h-5.5a2.25 2.25 0 0 0-2.123 1.502ZM1 10.25A2.25 2.25 0 0 1 3.25 8h13.5A2.25 2.25 0 0 1 19 10.25v5.5A2.25 2.25 0 0 1 16.75 18H3.25A2.25 2.25 0 0 1 1 15.75v-5.5ZM3.25 6.5c-.04 0-.082 0-.123.002A2.25 2.25 0 0 1 5.25 5h9.5c.98 0 1.814.627 2.123 1.502a3.819 3.819 0 0 0-.123-.002H3.25Z" />
                                            </svg>
                                            <Text small wrap variant="white">
                                                Sprite: {(() => {
                                                    const ro = GetRoomEngine().getRoomObject(
                                                        roomSession.roomId,
                                                        avatarInfo.id,
                                                        avatarInfo.isWallItem ? RoomObjectCategory.WALL : RoomObjectCategory.FLOOR
                                                    );
                                                    return ro?.model?.getValue(RoomObjectVariable.FURNITURE_TYPE_ID) ?? '?';
                                                })()}
                                            </Text>
                                        </div>
                                    </div>
                                )}
                                {isModerator && (
                                    <button
                                        className="w-full text-white text-xs bg-[#418db0] hover:bg-[#3789a8] border border-[#ffffff33] rounded px-2 py-1 cursor-pointer transition-colors"
                                        onClick={() => {
                                            const roomObject = GetRoomEngine().getRoomObject(
                                                roomSession.roomId,
                                                avatarInfo.id,
                                                avatarInfo.isWallItem ? RoomObjectCategory.WALL : RoomObjectCategory.FLOOR
                                            );
                                            const typeId = roomObject?.model?.getValue(RoomObjectVariable.FURNITURE_TYPE_ID);

                                            CreateLinkEvent('furni-editor/show');

                                            if (typeId) window.dispatchEvent(new CustomEvent('furni-editor:open', { detail: { spriteId: typeId } }));
                                        }}
                                    >
                                        Edit Furni
                                    </button>
                                )}
                                {!avatarInfo.isWallItem && canMove && (
                                    <>
                                        <button
                                            className="w-full text-white text-xs bg-[#2a2a3a] hover:bg-[#3a3a4a] border border-[#ffffff33] rounded px-2 py-1 cursor-pointer transition-colors"
                                            onClick={() => setDropdownOpen(!dropdownOpen)}
                                        >
                                            {dropdownOpen
                                                ? `${LocalizeText('widget.furni.present.close')} Buildtools`
                                                : `${LocalizeText('navigator.roomsettings.doormode.open')} Buildtools`}
                                        </button>
                                        {dropdownOpen && (
                                            <div className="flex gap-[4px] w-full">
                                                {/* Left panel: position + rotation */}
                                                <div className="flex-1 bg-[#3D5D63] rounded-[6px] border border-white p-[2px] flex flex-col gap-1">
                                                    <Text small variant="white">
                                                        {LocalizeText('group.edit.badge.position')}
                                                    </Text>
                                                    <div className="flex flex-col items-center gap-[2px]">
                                                        <div className="flex gap-[0.6em]">
                                                            <div
                                                                className="bg-[#E55959] text-white w-[25px] h-[25px] border border-white cursor-pointer rounded-[3px] flex justify-center items-center transition-[filter] duration-300 hover:brightness-150 rotate-[225deg]"
                                                                onClick={() => sendUpdate(-1, 0, furniLocationZ ?? 0, 0)}
                                                            >
                                                                <GrFormNextLink size="1.7em" />
                                                            </div>
                                                            <div
                                                                className="bg-[#E55959] text-white w-[25px] h-[25px] border border-white cursor-pointer rounded-[3px] flex justify-center items-center transition-[filter] duration-300 hover:brightness-150 rotate-[315deg]"
                                                                onClick={() => sendUpdate(0, -1, furniLocationZ ?? 0, 0)}
                                                            >
                                                                <GrFormNextLink size="1.7em" />
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-[0.6em]">
                                                            <div
                                                                className="bg-[#E55959] text-white w-[25px] h-[25px] border border-white cursor-pointer rounded-[3px] flex justify-center items-center transition-[filter] duration-300 hover:brightness-150 rotate-[135deg]"
                                                                onClick={() => sendUpdate(0, 1, furniLocationZ ?? 0, 0)}
                                                            >
                                                                <GrFormNextLink size="1.7em" />
                                                            </div>
                                                            <div
                                                                className="bg-[#E55959] text-white w-[25px] h-[25px] border border-white cursor-pointer rounded-[3px] flex justify-center items-center transition-[filter] duration-300 hover:brightness-150 rotate-[45deg]"
                                                                onClick={() => sendUpdate(1, 0, furniLocationZ ?? 0, 0)}
                                                            >
                                                                <GrFormNextLink size="1.7em" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Text small variant="white">
                                                        {LocalizeText('infostand.button.rotate')}
                                                    </Text>
                                                    <div className="flex justify-center gap-[0.6em]">
                                                        <div
                                                            className="bg-[#D1A245] text-black w-[28px] h-[28px] border-2 border-[#eee] cursor-pointer rounded-full flex justify-center items-center transition-[filter] duration-300 hover:brightness-150"
                                                            onClick={() => sendUpdate(0, 0, furniLocationZ ?? 0, -1)}
                                                        >
                                                            <GrRotateLeft size="1.4em" />
                                                        </div>
                                                        <div
                                                            className="bg-[#D1A245] text-black w-[28px] h-[28px] border-2 border-[#eee] cursor-pointer rounded-full flex justify-center items-center transition-[filter] duration-300 hover:brightness-150"
                                                            onClick={() => sendUpdate(0, 0, furniLocationZ ?? 0, 1)}
                                                        >
                                                            <GrRotateRight size="1.4em" />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Right panel: height */}
                                                <div className="flex-1 bg-[#3D5D63] rounded-[6px] border border-white p-[2px] flex flex-col gap-1">
                                                    <Text small variant="white">
                                                        {LocalizeText('stack.magic.tile.height.label')}
                                                    </Text>
                                                    <input
                                                        spellCheck={false}
                                                        type="number"
                                                        className="w-full text-xs bg-[#1a1a2a] text-white border border-[#ffffff44] rounded px-1 py-0.5"
                                                        value={furniLocationZ !== null ? furniLocationZ.toString() : ''}
                                                        onChange={handleHeightChange}
                                                        onBlur={handleHeightBlur}
                                                        min={0}
                                                        max={40}
                                                        step={0.1}
                                                    />
                                                    <div className="flex justify-center gap-1">
                                                        <div className="flex flex-col items-center gap-[2px]">
                                                            <div
                                                                className="bg-[#247FD1] text-white w-[24px] h-[24px] border border-white cursor-pointer rounded-[3px] leading-none flex justify-center items-center transition-[filter] duration-300 hover:brightness-150"
                                                                onClick={() => adjustHeight(1)}
                                                            >
                                                                ↑
                                                            </div>
                                                            <Text small variant="white" align="center">
                                                                █
                                                            </Text>
                                                            <div
                                                                className="bg-[#44A750] text-white w-[24px] h-[24px] border border-white cursor-pointer rounded-[3px] leading-none flex justify-center items-center transition-[filter] duration-300 hover:brightness-150"
                                                                onClick={() => adjustHeight(-1)}
                                                            >
                                                                ↓
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-center gap-[2px]">
                                                            <div
                                                                className="bg-[#247FD1] text-white w-[24px] h-[24px] border border-white cursor-pointer rounded-[3px] leading-none flex justify-center items-center transition-[filter] duration-300 hover:brightness-150"
                                                                onClick={() => adjustHeight(0.1)}
                                                            >
                                                                ↑
                                                            </div>
                                                            <Text small variant="white" align="center">
                                                                ▄
                                                            </Text>
                                                            <div
                                                                className="bg-[#44A750] text-white w-[24px] h-[24px] border border-white cursor-pointer rounded-[3px] leading-none flex justify-center items-center transition-[filter] duration-300 hover:brightness-150"
                                                                onClick={() => adjustHeight(-0.1)}
                                                            >
                                                                ↓
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-center gap-[2px]">
                                                            <div
                                                                className="bg-[#247FD1] text-white w-[24px] h-[24px] border border-white cursor-pointer rounded-[3px] leading-none flex justify-center items-center transition-[filter] duration-300 hover:brightness-150"
                                                                onClick={() => adjustHeight(0.01)}
                                                            >
                                                                ↑
                                                            </div>
                                                            <Text small variant="white" align="center">
                                                                _
                                                            </Text>
                                                            <div
                                                                className="bg-[#44A750] text-white w-[24px] h-[24px] border border-white cursor-pointer rounded-[3px] leading-none flex justify-center items-center transition-[filter] duration-300 hover:brightness-150"
                                                                onClick={() => adjustHeight(-0.01)}
                                                            >
                                                                ↓
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                                {furniKeys.length > 0 && (
                                    <>
                                        <hr className="m-0 bg-[#0003] border-0 opacity-[.5] h-px" />
                                        <div className="flex flex-col gap-1">
                                            {furniKeys.map((key, index) => {
                                                return (
                                                    <Flex key={index} alignItems="center" gap={1}>
                                                        <Text small wrap align="end" className="col-span-4" variant="white">
                                                            {key}
                                                        </Text>
                                                        <OctaneInput
                                                            type="text"
                                                            className="text-black"
                                                            style={{ color: '#000' }}
                                                            value={furniValues[index]}
                                                            onChange={(event) => onFurniSettingChange(index, event.target.value)}
                                                        />
                                                    </Flex>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                        {customKeys.length > 0 && (
                            <>
                                <hr className="m-0 bg-[#0003] border-0 opacity-[.5] h-px" />
                                <div className="flex flex-col gap-1">
                                    {customKeys.map((key, index) => {
                                        return (
                                            <Flex key={index} alignItems="center" gap={1}>
                                                <Text small wrap align="end" className="col-span-4" variant="white">
                                                    {key}
                                                </Text>
                                                <OctaneInput
                                                    type="text"
                                                    className="text-black"
                                                    style={{ color: '#000' }}
                                                    value={customValues[index]}
                                                    onChange={(event) => onCustomVariableChange(index, event.target.value)}
                                                />
                                            </Flex>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </Column>
            </Column>
            <Flex gap={1} justifyContent="end">
                {showInspectButton && (
                    <Button variant="dark" onClick={() => openInspectionForFurni(avatarInfo.id, avatarInfo.category)}>
                        Inspect
                    </Button>
                )}
                {canMove && (
                    <Button variant="dark" onClick={(event) => processButtonAction('move')}>
                        {LocalizeText('infostand.button.move')}
                    </Button>
                )}
                {canRotate && (
                    <Button variant="dark" onClick={(event) => processButtonAction('rotate')}>
                        {LocalizeText('infostand.button.rotate')}
                    </Button>
                )}
                {pickupMode !== PICKUP_MODE_NONE && (
                    <Button variant="dark" onClick={(event) => processButtonAction('pickup')}>
                        {isPlant && plantDead
                            ? LocalizeText('generic.delete')
                            : LocalizeText(pickupMode === PICKUP_MODE_EJECT ? 'infostand.button.eject' : 'infostand.button.pickup')}
                    </Button>
                )}
                {canUse && (
                    <Button variant="dark" onClick={(event) => processButtonAction('use')}>
                        {LocalizeText('infostand.button.use')}
                    </Button>
                )}
                {hasBrandingOffsets && (
                    <Button variant="dark" onClick={() => setShowPositionEditor(true)}>
                        {LocalizeText('image.position.editor.button')}
                    </Button>
                )}
                {furniKeys.length > 0 && furniValues.length > 0 && furniKeys.length === furniValues.length && (
                    <Button variant="dark" onClick={() => processButtonAction('save_branding_configuration')}>
                        {LocalizeText('save')}
                    </Button>
                )}
                {customKeys.length > 0 && customValues.length > 0 && customKeys.length === customValues.length && (
                    <Button variant="dark" onClick={() => processButtonAction('save_custom_variables')}>
                        {LocalizeText('save')}
                    </Button>
                )}
            </Flex>
            {showPositionEditor && (
                <ImagePositionEditorView
                    roomId={roomSession.roomId}
                    objectId={avatarInfo.id}
                    isWallItem={avatarInfo.isWallItem}
                    initialX={getBrandingOffset('offsetX')}
                    initialY={getBrandingOffset('offsetY')}
                    initialZ={getBrandingOffset('offsetZ')}
                    initialScale={getBrandingOffset('scale') || 100}
                    initialAlpha={furniKeys.indexOf('alpha') >= 0 ? getBrandingOffset('alpha') : 100}
                    onClose={() => setShowPositionEditor(false)}
                    onSave={savePositionEditor}
                />
            )}
        </Column>
    );
};
