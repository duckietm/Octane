import { FC, useEffect, useState } from 'react';
import {
    isValidTeleportRoomId,
    localizeWithFallback,
    readTeleportToRoomParams,
    sanitizeTeleportRoomId,
    TELEPORT_TO_ROOM_ID_MAX_LENGTH,
    WiredFurniType
} from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const PICKED_SOURCE = 100;

/**
 * Habbo's "teleport to room": sends the users to the room a picked room linker, room link or
 * teleporter leads to, arriving on the linker's or teleporter's pair, or else to the typed room.
 */
export const WiredActionTeleportToRoomView: FC<{}> = () => {
    const { trigger = null, furniIds = [], setIntParams = null, setStringParam = null, setSourceTypes = null } = useWired();
    const [roomId, setRoomId] = useState('');
    const [userSource, setUserSource] = useState(0);
    const [furniSource, setFurniSource] = useState(PICKED_SOURCE);

    useEffect(() => {
        if (!trigger) return;

        // Official: no int params; the user and furni sources are the official source slots (a box
        // saved before still reads its [user source, furni source]). Our room id is the text.
        const params = readTeleportToRoomParams(trigger.intData);

        setRoomId(sanitizeTeleportRoomId(trigger.stringData ?? ''));
        setUserSource(trigger.userSourceTypes?.[0] ?? params.userSource);
        setFurniSource(trigger.furniSourceTypes?.[0] ?? params.furniSource);
    }, [trigger]);

    const hasFurni = furniSource !== PICKED_SOURCE || (furniIds?.length ?? 0) > 0;

    const save = () => {
        setStringParam(roomId);
        setIntParams([]);
        setSourceTypes({ furni: [furniSource], users: [userSource] });
    };

    return (
        <WiredActionBaseView
            footer={
                <WiredSourcesSelector
                    furniSource={furniSource}
                    showFurni={true}
                    showUsers={true}
                    userSource={userSource}
                    onChangeFurni={setFurniSource}
                    onChangeUsers={setUserSource}
                />
            }
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            validate={() => (roomId.length ? isValidTeleportRoomId(roomId) : hasFurni)}
        >
            <div className="flex flex-col gap-1">
                <Text small>
                    {localizeWithFallback(
                        'wiredfurni.params.teleport_to_room.furni',
                        'Pick a teleporter to arrive on its pair, or a room link to go to its room.'
                    )}
                </Text>
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.teleport_to_room.room_id', 'Room id')}</Text>
                <input
                    className="form-control form-control-sm"
                    inputMode="numeric"
                    maxLength={TELEPORT_TO_ROOM_ID_MAX_LENGTH}
                    type="text"
                    value={roomId}
                    onChange={(event) => setRoomId(sanitizeTeleportRoomId(event.target.value))}
                />
                <Text small>
                    {localizeWithFallback('wiredfurni.params.teleport_to_room.room_id.hint', 'Used when no picked furni leads anywhere. Leave empty to only use furni.')}
                </Text>
            </div>
        </WiredActionBaseView>
    );
};
