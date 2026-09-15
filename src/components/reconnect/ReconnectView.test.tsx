import { cleanup, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

let snapshot = { phase: 'connected', reconnectAttempt: 0, maxReconnectAttempts: 5 };

vi.mock('../../api', () => ({
    localizeWithFallback: (key: string, fallback: string) => fallback
}));

vi.mock('../../common', () => ({
    Button: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => (
        <button type="button" onClick={onClick}>
            {children}
        </button>
    )
}));

vi.mock('../../hooks', () => ({
    useConnectionState: () => snapshot,
    getReconnectPresentation: (state: typeof snapshot) => ({
        isReconnecting: state.phase === 'reconnecting' || state.phase === 'reauthenticating',
        hasFailed: state.phase === 'failed',
        attempt: state.reconnectAttempt,
        maxAttempts: state.maxReconnectAttempts
    })
}));

import { ReconnectView } from './ReconnectView';

describe('ReconnectView', () => {
    afterEach(cleanup);

    it('renders nothing while the connection is healthy', () => {
        snapshot = { phase: 'connected', reconnectAttempt: 0, maxReconnectAttempts: 5 };

        const { container } = render(<ReconnectView />);

        expect(container.firstChild).toBeNull();
    });

    it('shows the reconnect alert as an official frame-3 window with the attempt counter', () => {
        snapshot = { phase: 'reconnecting', reconnectAttempt: 2, maxReconnectAttempts: 5 };

        render(<ReconnectView />);

        const alert = screen.getByTestId('reconnect-alert');
        expect(alert.classList.contains('octane-card-frame-3')).toBe(true);
        expect(alert.style.width).toBe('278px');
        expect(alert.style.minHeight).toBe('141px');
        expect(screen.getByRole('alertdialog')).toHaveAccessibleName('Connection lost');
        expect(screen.getByText('Reconnecting to the hotel... (attempt 2/5)')).toBeInTheDocument();
        expect(screen.getByText('Please wait, your session will be restored automatically.')).toBeInTheDocument();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('offers the way back to the hotel once reconnecting has given up', () => {
        snapshot = { phase: 'failed', reconnectAttempt: 5, maxReconnectAttempts: 5 };

        render(<ReconnectView />);

        expect(screen.getByRole('alertdialog')).toHaveAccessibleName('Session expired');
        expect(screen.getByText('You have been disconnected. Please try again.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Back to Hotel' })).toBeInTheDocument();
    });
});
