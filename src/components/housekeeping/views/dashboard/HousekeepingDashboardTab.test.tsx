/* @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HousekeepingDashboardTab } from './HousekeepingDashboardTab';

const storeState: any = {
    dashboard: null,
    isDashboardLoading: false,
    refreshDashboard: vi.fn(),
    actionLog: [],
    recentLookups: [],
    lookupUserById: vi.fn(),
    lookupRoomById: vi.fn(),
    setActiveTab: vi.fn()
};

const notificationState: any = {
    simpleAlert: vi.fn()
};

// The charts fetch their own list; the dashboard tests cover the cards around them.
vi.mock('./HousekeepingStatsView', () => ({ HousekeepingStatsView: () => null }));

vi.mock('../../../../hooks', () => ({
    useHousekeepingStore: () => storeState,
    useNotification: () => notificationState
}));

vi.mock('../../../../api', () => {
    return {
        LocalizeText: (key: string) => key,
        formatCompactNumber: (value: number) => (Number.isFinite(value) ? String(value) : '-'),
        formatRelativePast: () => 'now',
        formatUptime: (value: number) => (Number.isFinite(value) ? `${value}s` : '-'),
        HousekeepingApi: {
            sendHotelAlert: vi.fn(() => Promise.resolve({ ok: true, actionId: null, message: '' }))
        },
        HousekeepingTabId: { DASHBOARD: 'dashboard', USERS: 'users', ROOMS: 'rooms', ECONOMY: 'economy', AUDIT: 'audit' },
        localizeHousekeepingAction: (action: string) => action,
        NotificationBubbleType: { INFO: 'INFO' },
        resolveHousekeepingTarget: (entry: { targetLabel: string }) => entry.targetLabel || '-'
    };
});

const resetStore = () => {
    storeState.dashboard = null;
    storeState.isDashboardLoading = false;
    storeState.refreshDashboard = vi.fn();
    storeState.actionLog = [];
    storeState.recentLookups = [];
    storeState.lookupUserById = vi.fn();
    storeState.lookupRoomById = vi.fn();
    storeState.setActiveTab = vi.fn();
};

describe('HousekeepingDashboardTab', () => {
    beforeEach(() => resetStore());

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('renders skeleton placeholders when loading with no data yet', () => {
        storeState.isDashboardLoading = true;

        const { container } = render(<HousekeepingDashboardTab />);

        expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(4);
    });

    it('renders the unavailable banner when not loading and no data', () => {
        render(<HousekeepingDashboardTab />);

        expect(screen.getByText('housekeeping.dashboard.unavailable')).toBeTruthy();
    });

    it('renders the hero + stat grid when dashboard data is present', () => {
        storeState.dashboard = {
            onlineUsers: 42,
            totalUsers: 1000,
            activeRooms: 7,
            totalRooms: 200,
            peakOnlineToday: 80,
            peakOnlineAllTime: 250,
            pendingTickets: 3,
            sanctionsLast24h: 5,
            serverUptimeSeconds: 3600,
            serverVersion: 'arcturus-x'
        };

        render(<HousekeepingDashboardTab />);

        expect(screen.getByText('42')).toBeTruthy();
        expect(screen.getByText('7')).toBeTruthy();
        expect(screen.getByText('80')).toBeTruthy();
        expect(screen.getByText('3')).toBeTruthy();
        expect(screen.getByText('arcturus-x')).toBeTruthy();
    });

    it('renders the recent-sanctions section when audit log has successful user actions', () => {
        storeState.dashboard = {
            onlineUsers: 1,
            totalUsers: 1,
            activeRooms: 1,
            totalRooms: 1,
            peakOnlineToday: 1,
            peakOnlineAllTime: 1,
            pendingTickets: 0,
            sanctionsLast24h: 0,
            serverUptimeSeconds: 0,
            serverVersion: 'x'
        };
        storeState.actionLog = [
            {
                id: 1,
                timestamp: 1,
                actorId: 1,
                actorName: 'admin',
                targetType: 'user',
                targetId: 2,
                targetLabel: 'alice',
                action: 'ban',
                detail: '',
                success: true
            },
            {
                id: 2,
                timestamp: 2,
                actorId: 1,
                actorName: 'admin',
                targetType: 'room',
                targetId: 3,
                targetLabel: 'room#3',
                action: 'close',
                detail: '',
                success: true
            },
            {
                id: 3,
                timestamp: 3,
                actorId: 1,
                actorName: 'admin',
                targetType: 'user',
                targetId: 4,
                targetLabel: 'bob',
                action: 'mute',
                detail: '',
                success: false
            }
        ];

        render(<HousekeepingDashboardTab />);

        expect(screen.getByText('housekeeping.dashboard.recent_sanctions')).toBeTruthy();
        expect(screen.getByText('alice')).toBeTruthy();
        expect(screen.getByText('ban')).toBeTruthy();
        expect(screen.queryByText('bob')).toBeNull();
        expect(screen.queryByText('room#3')).toBeNull();
    });

    it('renders the recent-lookups chips when there are entries', () => {
        storeState.recentLookups = [
            { kind: 'user', id: 1, label: 'alice', at: 1 },
            { kind: 'room', id: 2, label: 'lobby', at: 2 }
        ];

        render(<HousekeepingDashboardTab />);

        expect(screen.getByText('housekeeping.dashboard.recent_lookups')).toBeTruthy();
        expect(screen.getByText('alice')).toBeTruthy();
        expect(screen.getByText('lobby')).toBeTruthy();
    });
});
