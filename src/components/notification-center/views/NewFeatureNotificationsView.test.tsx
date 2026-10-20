import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NewFeatureNotificationsView } from './NewFeatureNotificationsView';

const mocks = vi.hoisted(() => ({ open: vi.fn(), dismiss: vi.fn(), notifications: [] as unknown[] }));

vi.mock('../../../hooks/notification/useNewFeatureNotifications', () => ({
    useNewFeatureNotifications: () => ({ notifications: mocks.notifications, open: mocks.open, dismiss: mocks.dismiss })
}));

vi.mock('../../../api', async () => {
    const rules = await import('../../../api/notification/NewFeatureNotification');

    return { ...rules, localizeWithFallback: (_key: string, fallback: string) => fallback };
});

const entry = (type: string, color = '#686661', cancelVisible = true) => ({
    config: {
        key: 'rewardtrack_intro',
        type,
        expiry: '',
        countDownTo: '',
        image: 'reward_track_small_icon',
        color,
        internalLink: 'reward_track/open/introduction',
        externalLink: ''
    },
    expiryPending: false,
    countdownPending: false,
    countdownSeconds: 90,
    countdownReceivedAt: Date.now(),
    cancelVisible
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('NewFeatureNotificationsView', () => {
    it('draws the normal layout: picture, text, View and the Cancel link', () => {
        mocks.notifications = [entry('normal')];
        const { container } = render(<NewFeatureNotificationsView />);

        expect(container.querySelector('.octane-new-feature-notification[data-type="normal"]')).toBeTruthy();
        expect(container.querySelector('.octane-new-feature-notification__image img')).toBeTruthy();
        expect(screen.getByText('Start your Habbo Adventure!')).toBeTruthy();
        expect(container.querySelector('.octane-new-feature-notification__border').getAttribute('data-tinted')).toBe('false');

        fireEvent.click(screen.getByText('View'));
        expect(mocks.open).toHaveBeenCalledWith('rewardtrack_intro');
        fireEvent.click(screen.getByText('Cancel'));
        expect(mocks.dismiss).toHaveBeenCalledWith('rewardtrack_intro');
    });

    it('draws the promo layout as one clickable region, the close cross only once opened', () => {
        mocks.notifications = [entry('promo', '#1e7295', false)];
        const { container, rerender } = render(<NewFeatureNotificationsView />);

        expect(container.querySelector('.octane-new-feature-notification__cancel-region')).toBeNull();
        expect(container.querySelector('.octane-new-feature-notification__border').getAttribute('data-tinted')).toBe('true');
        fireEvent.click(container.querySelector('.octane-new-feature-notification__main-region'));
        expect(mocks.open).toHaveBeenCalledWith('rewardtrack_intro');

        mocks.notifications = [entry('promo', '#1e7295', true)];
        rerender(<NewFeatureNotificationsView />);
        fireEvent.click(container.querySelector('.octane-new-feature-notification__cancel-region'));
        expect(mocks.dismiss).toHaveBeenCalledWith('rewardtrack_intro');
        expect(mocks.open).toHaveBeenCalledTimes(1);
    });

    it('draws the countdown clock', () => {
        mocks.notifications = [entry('countdown')];
        const { container } = render(<NewFeatureNotificationsView />);

        const values = [...container.querySelectorAll('.octane-new-feature-notification__counter-value')].map((node) => node.textContent);

        expect(values).toEqual(['00', '01', '30']);
    });
});
