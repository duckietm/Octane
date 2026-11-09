import { describe, expect, it } from 'vitest';
import { getConnectionFailureAction, getDisconnectReasonKey, getReconnectPresentation, shouldClearLoginAfterDisconnect } from './connectionStateUi.helpers';

describe('connection state UI decisions', () => {
    it('shows reconnect progress through transport and reauthentication phases', () => {
        expect(getReconnectPresentation({ phase: 'reconnecting', reconnectAttempt: 2, maxReconnectAttempts: 7 })).toEqual({
            isReconnecting: true,
            hasFailed: false,
            attempt: 2,
            maxAttempts: 7
        });
        expect(getReconnectPresentation({ phase: 'reauthenticating', reconnectAttempt: 0, maxReconnectAttempts: 7 }).isReconnecting).toBe(true);
    });

    it('shows terminal failure only for the failed phase', () => {
        expect(getReconnectPresentation({ phase: 'failed', reconnectAttempt: 7, maxReconnectAttempts: 7 }).hasFailed).toBe(true);
        expect(getReconnectPresentation({ phase: 'connected', reconnectAttempt: 0, maxReconnectAttempts: 7 }).hasFailed).toBe(false);
    });

    it('ignores initial disconnected state and active reconnects', () => {
        expect(getConnectionFailureAction('disconnected', 'disconnected', false)).toBe('none');
        expect(getConnectionFailureAction('failed', 'failed', false)).toBe('none');
        expect(getConnectionFailureAction('connected', 'reconnecting', true)).toBe('none');
    });

    it('routes real failures according to whether the hotel was ready', () => {
        expect(getConnectionFailureAction('authenticating', 'disconnected', false)).toBe('login');
        expect(getConnectionFailureAction('connected', 'failed', true)).toBe('expired');
        expect(getConnectionFailureAction('authenticating', 'failed', false)).toBe('login');
    });

    it('keeps the hotel up under the message when the server said why it closed', () => {
        expect(getConnectionFailureAction('connected', 'disconnected', true, 2)).toBe('kicked');
        expect(getConnectionFailureAction('connected', 'disconnected', true, 0)).toBe('kicked');
        expect(getConnectionFailureAction('authenticating', 'disconnected', false, 1)).toBe('login');
        expect(getConnectionFailureAction('connected', 'disconnected', true)).toBe('expired');
    });

    it('maps reasons to the hotel texts like the official client', () => {
        expect(getDisconnectReasonKey(1)).toBe('just_banned');
        expect(getDisconnectReasonKey(10)).toBe('still_banned');
        expect(getDisconnectReasonKey(2)).toBe('concurrent_login');
        expect(getDisconnectReasonKey(13)).toBe('concurrent_login');
        expect(getDisconnectReasonKey(19)).toBe('hotel_closed');
        expect(getDisconnectReasonKey(0)).toBe('logged_out');
        expect(getDisconnectReasonKey(999)).toBe('generic');
    });

    it('forgets the stored login only after a ban', () => {
        expect(shouldClearLoginAfterDisconnect(1)).toBe(true);
        expect(shouldClearLoginAfterDisconnect(10)).toBe(true);
        expect(shouldClearLoginAfterDisconnect(0)).toBe(false);
        expect(shouldClearLoginAfterDisconnect(2)).toBe(false);
        expect(shouldClearLoginAfterDisconnect(19)).toBe(false);
    });
});
