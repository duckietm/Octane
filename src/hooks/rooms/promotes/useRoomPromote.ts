import { RoomEventEvent, RoomEventMessageParser } from '@octane/renderer';
import { useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { useMessageEvent } from '../../events';

const useRoomPromoteState = () => {
    const [promoteInformation, setPromoteInformation] = useState<RoomEventMessageParser>(null);
    const [isExtended, setIsExtended] = useState<boolean>(false);

    useMessageEvent<RoomEventEvent>(RoomEventEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        setPromoteInformation(parser);
    });

    return { promoteInformation, isExtended, setPromoteInformation, setIsExtended };
};

export const useRoomPromote = () => useSharedHook(useRoomPromoteState);

registerSharedHook(useRoomPromoteState);
