import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const openWebPage = vi.fn();

vi.mock('@octane/renderer', () => ({
    HabboWebTools: { openWebPage: (...args: unknown[]) => openWebPage(...args) }
}));

vi.mock('../../../api', () => ({
    GetConfigurationValue: (key: string, fallback: unknown) => (key === 'link.format.safetylock_unlock' ? 'https://hotel.test/unlock' : fallback),
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

import { useSafetyLockStore } from '../../../hooks/notification/safetyLockStore';
import { SafetyLockedNotificationView } from './SafetyLockedNotificationView';

afterEach(cleanup);

beforeEach(() => {
    openWebPage.mockClear();
    useSafetyLockStore.setState({ isLocked: false });
});

describe('SafetyLockedNotificationView', () => {
    it('stays away while the account is not locked', () => {
        render(<SafetyLockedNotificationView />);

        expect(screen.queryByTestId('safety-locked-notification')).toBeNull();
    });

    it('shows the notice with the Unlock link while the account is locked', () => {
        useSafetyLockStore.setState({ isLocked: true });

        render(<SafetyLockedNotificationView />);

        expect(screen.getByTestId('safety-locked-notification')).toBeTruthy();
        expect(screen.getByText('Notification!')).toBeTruthy();

        fireEvent.click(screen.getByText('Unlock'));

        expect(openWebPage).toHaveBeenCalledWith('https://hotel.test/unlock');
    });
});
