import { ConnectionStatePhase, IConnectionStateSnapshot } from '@octane/renderer';

type ReconnectSnapshot = Pick<IConnectionStateSnapshot, 'phase' | 'reconnectAttempt' | 'maxReconnectAttempts'>;

export type ConnectionFailureAction = 'none' | 'login' | 'expired';

export const getReconnectPresentation = (snapshot: ReconnectSnapshot) => ({
    isReconnecting: snapshot.phase === 'reconnecting' || snapshot.phase === 'reauthenticating',
    hasFailed: snapshot.phase === 'failed',
    attempt: snapshot.reconnectAttempt,
    maxAttempts: snapshot.maxReconnectAttempts
});

export const getConnectionFailureAction = (
    previousPhase: ConnectionStatePhase,
    currentPhase: ConnectionStatePhase,
    isReady: boolean
): ConnectionFailureAction => {
    const enteredDisconnected = currentPhase === 'disconnected' && previousPhase !== 'disconnected';
    const failed = currentPhase === 'failed' && previousPhase !== 'failed';

    if (!enteredDisconnected && !failed) return 'none';

    return isReady ? 'expired' : 'login';
};
