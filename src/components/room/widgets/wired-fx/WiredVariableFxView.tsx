import { FC } from 'react';
import { useRoom, useWiredVariableFxEvents, useWiredVariableFxRoomDrawing } from '../../../../hooks';

/**
 * The room's wired variable fx (health points, progress, levels, status and boss bars, numbers).
 * Nothing is drawn here: the room renderer stacks them as sprites over the avatars and furni
 * holding the variables, as AIR does; this feeds it from the four fx packets.
 */
export const WiredVariableFxView: FC<{}> = () => {
    const { roomSession = null } = useRoom();

    useWiredVariableFxEvents();
    useWiredVariableFxRoomDrawing(roomSession ? roomSession.roomId : null);

    return null;
};
