import { GetSessionDataManager, RoomControllerLevel } from '@octane/renderer';
import { FC } from 'react';
import { Text } from '../../../../../common';
import { useHasPermission, useRoom } from '../../../../../hooks';

interface InfoStandUnitIdViewProps {
    id: number;
    ownerId?: number;
}

/**
 * The pet or bot id, shown like the furni id to its owner and to whoever manages the room. The room
 * sends a bot as -botId, so the sign is dropped.
 */
export const InfoStandUnitIdView: FC<InfoStandUnitIdViewProps> = ({ id: webId, ownerId = -1 }) => {
    const id = Math.abs(webId);
    const { roomSession = null } = useRoom();
    const canManageAnyRoom = useHasPermission('acc_anyroomowner');
    const canSee =
        !!roomSession &&
        (roomSession.isRoomOwner ||
            roomSession.controllerLevel >= RoomControllerLevel.GUEST ||
            canManageAnyRoom ||
            (ownerId > 0 && ownerId === GetSessionDataManager().userId));

    if (!canSee || !id) return null;

    return (
        <>
            <div className="octane-infostand__rule" />
            <div className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-[#7ec8e3]">
                    <path
                        fillRule="evenodd"
                        d="M4.93 1.31a41.401 41.401 0 0 1 10.14 0C16.194 1.45 17 2.414 17 3.517V18.25a.75.75 0 0 1-1.075.676l-2.8-1.344-2.8 1.344a.75.75 0 0 1-.65 0l-2.8-1.344-2.8 1.344A.75.75 0 0 1 3 18.25V3.517c0-1.103.806-2.068 1.93-2.207Z"
                        clipRule="evenodd"
                    />
                </svg>
                <Text small wrap variant="white">
                    ID: {id}
                </Text>
            </div>
        </>
    );
};
