import { FC, useState } from 'react';
import { FaDoorOpen, FaExchangeAlt, FaLock, FaShieldAlt, FaTrash, FaUserSlash, FaVolumeMute } from 'react-icons/fa';
import { IHousekeepingRoom, LocalizeText } from '../../../../api';
import { useHousekeeping, useHousekeepingConfirm, useHousekeepingDangerConfirm } from '../../../../hooks';
import { HousekeepingButton, HousekeepingNumberField, HousekeepingSection } from '../common/HousekeepingParts';

const DEFAULT_MUTE_MINUTES = 10;

/** Open or close, mute, empty, transfer and delete the selected room. */
export const HousekeepingRoomModerationView: FC<{ room: IHousekeepingRoom }> = ({ room }) => {
    const { isActionPending, openRoom, closeRoom, muteRoom, kickAllFromRoom, transferRoomOwnership, deleteRoom } = useHousekeeping();
    const confirm = useHousekeepingConfirm();
    const confirmDanger = useHousekeepingDangerConfirm();
    const [muteMinutes, setMuteMinutes] = useState<number>(DEFAULT_MUTE_MINUTES);
    const [newOwnerId, setNewOwnerId] = useState<number>(0);

    return (
        <div className="flex flex-col gap-2">
            <HousekeepingSection icon={<FaShieldAlt className="text-sky-600" size={9} />} title={LocalizeText('housekeeping.room.section.actions')}>
                <div className="grid grid-cols-2 gap-1.5">
                    {room.isLocked ? (
                        <HousekeepingButton disabled={isActionPending} gap={1} variant="success" onClick={() => openRoom(room.id)}>
                            <FaDoorOpen size={10} />
                            <span>{LocalizeText('housekeeping.room.open')}</span>
                        </HousekeepingButton>
                    ) : (
                        <HousekeepingButton disabled={isActionPending} gap={1} variant="danger" onClick={() => closeRoom(room.id)}>
                            <FaLock size={10} />
                            <span>{LocalizeText('housekeeping.room.close')}</span>
                        </HousekeepingButton>
                    )}
                    <HousekeepingButton
                        disabled={isActionPending}
                        gap={1}
                        variant="warning"
                        onClick={() => confirm(LocalizeText('housekeeping.room.kick_all.confirm'), () => kickAllFromRoom(room.id))}
                    >
                        <FaUserSlash size={10} />
                        <span>{LocalizeText('housekeeping.room.kick_all')}</span>
                    </HousekeepingButton>
                    <div className="col-span-2 flex items-center gap-1.5">
                        <FaVolumeMute className="text-amber-600" size={11} />
                        <HousekeepingNumberField unit={LocalizeText('housekeeping.unit.minutes')} value={muteMinutes} onChange={setMuteMinutes} />
                        <HousekeepingButton
                            classNames={['grow']}
                            disabled={isActionPending}
                            gap={1}
                            variant="warning"
                            onClick={() => muteRoom(room.id, muteMinutes)}
                        >
                            <span>{LocalizeText('housekeeping.room.mute_min', ['m'], [String(muteMinutes)])}</span>
                        </HousekeepingButton>
                    </div>
                </div>
            </HousekeepingSection>

            <HousekeepingSection
                icon={<FaExchangeAlt className="text-violet-500" size={8} />}
                title={LocalizeText('housekeeping.room.transfer.label')}
                tone="accent"
            >
                <div className="flex items-center gap-1.5">
                    <HousekeepingNumberField
                        label={LocalizeText('housekeeping.room.transfer.new_owner')}
                        value={newOwnerId}
                        widthClass="w-20"
                        onChange={setNewOwnerId}
                    />
                    <HousekeepingButton
                        classNames={['grow']}
                        disabled={isActionPending || !newOwnerId}
                        gap={1}
                        variant="primary"
                        onClick={() =>
                            confirmDanger(
                                LocalizeText('housekeeping.room.transfer.confirm', ['id'], [String(newOwnerId)]),
                                String(newOwnerId),
                                () => transferRoomOwnership(room.id, newOwnerId),
                                LocalizeText('housekeeping.room.transfer')
                            )
                        }
                    >
                        <FaExchangeAlt size={10} />
                        <span>{LocalizeText('housekeeping.room.transfer')}</span>
                    </HousekeepingButton>
                </div>
            </HousekeepingSection>

            <HousekeepingSection icon={<FaTrash className="text-rose-500" size={9} />} title={LocalizeText('housekeeping.room.section.danger')} tone="danger">
                <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-rose-700">{LocalizeText('housekeeping.room.delete.hint')}</span>
                    <HousekeepingButton
                        classNames={['ml-auto', 'shrink-0']}
                        disabled={isActionPending}
                        gap={1}
                        variant="danger"
                        onClick={() =>
                            confirmDanger(
                                LocalizeText('housekeeping.room.delete.confirm'),
                                String(room.id),
                                () => deleteRoom(room.id),
                                LocalizeText('housekeeping.room.delete')
                            )
                        }
                    >
                        <FaTrash size={10} />
                        <span>{LocalizeText('housekeeping.room.delete')}</span>
                    </HousekeepingButton>
                </div>
            </HousekeepingSection>
        </div>
    );
};
