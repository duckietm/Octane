import { GetCommunication, IConnectionStateSnapshot, OctaneEventType } from '@octane/renderer';
import { useCallback, useState } from 'react';
import { useOctaneEvent } from './useOctaneEvent';

const readConnectionState = (): Readonly<IConnectionStateSnapshot> => GetCommunication().connection.connectionState;

export const useConnectionState = (): Readonly<IConnectionStateSnapshot> => {
    const [snapshot, setSnapshot] = useState(readConnectionState);
    const refresh = useCallback(() => setSnapshot(readConnectionState()), []);

    useOctaneEvent(OctaneEventType.CONNECTION_STATE_CHANGED, refresh);

    return snapshot;
};
