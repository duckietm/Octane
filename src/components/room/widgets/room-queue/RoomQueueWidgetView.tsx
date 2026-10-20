import { FC } from 'react';
import { GetConfigurationValue, localizeWithFallback } from '../../../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { ROOM_QUEUE_TARGET_SPECTATOR, useRoomQueueWidget } from '../../../../hooks';

const positionKey = (target: number, isClubQueue: boolean): string => {
    const base = target === ROOM_QUEUE_TARGET_SPECTATOR ? 'room.queue.spectator.position' : 'room.queue.position';

    return isClubQueue ? `${base}.hc` : base;
};

const positionFallback = (target: number, position: number): string =>
    target === ROOM_QUEUE_TARGET_SPECTATOR ? `Your place in the spectator queue: ${position}` : `Your place in the queue: ${position}`;

/**
 * Official `RoomQueueWidget` (`room_queue` layout, 229 px): the "Queue" frame with the bold, centred
 * position line and the "Leave the queue" button; the close button leaves the queue too. The layout
 * keeps the spectator switch (`change_button`, `room.queue.spectatormode`) hidden, so it only shows
 * when `room.queue.spectator.enabled` is set.
 */
export const RoomQueueWidgetView: FC = () => {
    const { status, leaveQueue, changeQueue } = useRoomQueueWidget();

    if (!status) return null;

    const showSpectatorSwitch = GetConfigurationValue<boolean>('room.queue.spectator.enabled', false);
    const position = status.position.toString();
    const infoText = localizeWithFallback(positionKey(status.target, status.isClubQueue), positionFallback(status.target, status.position), ['position'], [position]);

    return (
        <OctaneCardView className="octane-room-queue-widget" theme="primary-slim" uniqueKey="room-queue">
            <OctaneCardHeaderView headerText={localizeWithFallback('room.queue.title', 'Queue')} onCloseClick={leaveQueue} />
            <OctaneCardContentView alignItems="center" gap={2}>
                <Text bold center className="octane-room-queue-info">
                    {infoText}
                </Text>
                <Button className="octane-room-queue-button" onClick={leaveQueue}>
                    {localizeWithFallback('room.queue.button.exit', 'Leave the queue')}
                </Button>
                {showSpectatorSwitch && (
                    <>
                        <Text center small>
                            {localizeWithFallback('room.queue.spectator.info', 'Spectate the room without going in.')}
                        </Text>
                        <Button className="octane-room-queue-button" onClick={changeQueue}>
                            {status.target === ROOM_QUEUE_TARGET_SPECTATOR
                                ? localizeWithFallback('room.queue.back', 'Back to the queue')
                                : localizeWithFallback('room.queue.spectatormode', 'Spectate')}
                        </Button>
                    </>
                )}
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
