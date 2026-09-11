import { FC } from 'react';
import { CreateLinkEvent, LocalizeText } from '../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../common';
import { ROOM_QUEUE_TARGET_VISITOR, useRoomQueue } from '../../hooks';

/**
 * AIR 13 `room_queue` window (`RoomQueueWidget.as`): shown while waiting to
 * enter a full room. The info text is the position line of the active queue
 * (visitor / spectator, with the `.hc` variant inside the club queue), the club
 * container only shows for habbos without HC, the change button swaps between
 * the visitor and the spectator queue and the close / cancel button leaves it.
 */
export const RoomQueueView: FC<{}> = (props) => {
    const { queue = null, hasHabboClub = false, exitQueue = null, changeQueue = null } = useRoomQueue();

    if (!queue) return null;

    const isVisitorQueue = queue.target === ROOM_QUEUE_TARGET_VISITOR;
    const positionKeyBase = isVisitorQueue ? 'room.queue.position' : 'room.queue.spectator.position';
    const positionKey = queue.isClubQueue ? `${positionKeyBase}.hc` : positionKeyBase;

    return (
        <OctaneCardView className="octane-room-queue w-[min(320px,calc(100vw-16px))]" theme="primary-slim">
            <OctaneCardHeaderView headerText={LocalizeText('room.queue.title')} onCloseClick={exitQueue} />
            <OctaneCardContentView className="text-black gap-2">
                <Text data-testid="room-queue-position">{LocalizeText(positionKey, ['position'], [queue.position.toString()])}</Text>
                {!isVisitorQueue && <Text small>{LocalizeText('room.queue.spectator.info')}</Text>}
                {!hasHabboClub && (
                    <button type="button" className="octane-room-queue__club-link text-left underline" onClick={() => CreateLinkEvent('habboUI/open/hccenter')}>
                        <Text small>{LocalizeText('room.queue.link')}</Text>
                    </button>
                )}
                <div className="flex gap-1">
                    <Button variant="primary" onClick={changeQueue}>
                        {LocalizeText(isVisitorQueue ? 'room.queue.spectatormode' : 'room.queue.back')}
                    </Button>
                    <Button variant="danger" onClick={exitQueue}>
                        {LocalizeText('room.queue.button.exit')}
                    </Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
