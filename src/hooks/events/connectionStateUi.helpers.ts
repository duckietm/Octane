import { ConnectionStatePhase, IConnectionStateSnapshot } from '@octane/renderer';

type ReconnectSnapshot = Pick<IConnectionStateSnapshot, 'phase' | 'reconnectAttempt' | 'maxReconnectAttempts'>;

export type ConnectionFailureAction = 'none' | 'login' | 'expired' | 'kicked';

export const getReconnectPresentation = (snapshot: ReconnectSnapshot) => ({
    isReconnecting: snapshot.phase === 'reconnecting' || snapshot.phase === 'reauthenticating',
    hasFailed: snapshot.phase === 'failed',
    attempt: snapshot.reconnectAttempt,
    maxAttempts: snapshot.maxReconnectAttempts
});

export const getConnectionFailureAction = (
    previousPhase: ConnectionStatePhase,
    currentPhase: ConnectionStatePhase,
    isReady: boolean,
    disconnectReason?: number
): ConnectionFailureAction => {
    const enteredDisconnected = currentPhase === 'disconnected' && previousPhase !== 'disconnected';
    const failed = currentPhase === 'failed' && previousPhase !== 'failed';

    if (!enteredDisconnected && !failed) return 'none';

    // The server said why it closed the session: the hotel stays on screen under its message.
    if (isReady && (disconnectReason !== undefined) && (disconnectReason !== null)) return 'kicked';

    return isReady ? 'expired' : 'login';
};

/** The hotel text (ExternalTexts `disconnected.*`) for a DisconnectReason code, like the official client. */
export const getDisconnectReasonKey = (reason: number): string => {
    switch (reason) {
        case -2:
            return 'maintenance';
        case 0:
            return 'logged_out';
        case 1:
            return 'just_banned';
        case 10:
            return 'still_banned';
        case 2:
        case 11:
        case 13:
        case 18:
            return 'concurrent_login';
        case 12:
        case 19:
            return 'hotel_closed';
        case 20:
            return 'incorrect_password';
        case 112:
            return 'idle';
        case 122:
            return 'incompatible_client_version';
        default:
            return 'generic';
    }
};

/** Only a ban ends the stored login; after a login elsewhere or a staff kick it is still good. */
export const shouldClearLoginAfterDisconnect = (reason: number): boolean => {
    const key = getDisconnectReasonKey(reason);

    return (key === 'just_banned') || (key === 'still_banned');
};
