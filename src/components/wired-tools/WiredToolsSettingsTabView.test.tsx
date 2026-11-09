/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { selectOption } from '../../test-utils/selectOption';

const mocks = vi.hoisted(() => ({
    config: {} as Record<string, unknown>,
    showConfirm: vi.fn(),
    showSingleBubble: vi.fn(),
    preferences: { playTestMode: false, showToolbarButton: false, showInspectButton: false, showSystemNotifications: false, wiredStyle: '' },
    saveRoomSettings: vi.fn(),
    saveRoomTimezone: vi.fn(),
    reloadRoomWired: vi.fn(),
    rollbackRoomWired: vi.fn(),
    updateAccountPreferences: vi.fn(),
    setPlayTestMode: vi.fn(),
    roomSettings: {
        roomId: 7,
        inspectMask: 1,
        modifyMask: 2,
        canInspect: true,
        canModify: true,
        canManageSettings: true,
        isLoaded: true,
        timezone: 'Europe/Amsterdam'
    }
}));

vi.mock('../../api', () => ({
    GetConfigurationValue: (key: string, fallback: unknown) => (key in mocks.config ? mocks.config[key] : fallback),
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string, fallback: string) => fallback,
    NotificationBubbleType: { INFO: 'info' },
    normalizeWiredStyle: (value: string) => value,
    WIRED_STYLE_DEFAULT: '',
    WIRED_STYLE_OPTIONS: ['illumina', 'volter'],
    wiredStyleTitle: (value: string) => value
}));

vi.mock('../../common', () => ({
    Button: ({ children, classNames: _classNames, ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { classNames?: string[] }>) => (
        <button type="button" {...props}>
            {children}
        </button>
    ),
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../../hooks', () => ({
    useRoom: () => ({ roomSession: { hotelTimeZone: 'UTC' } }),
    useNotification: () => ({ showConfirm: mocks.showConfirm, showSingleBubble: mocks.showSingleBubble }),
    useWiredTools: () => ({
        accountPreferences: mocks.preferences,
        roomSettings: mocks.roomSettings,
        saveRoomSettings: mocks.saveRoomSettings,
        saveRoomTimezone: mocks.saveRoomTimezone,
        reloadRoomWired: mocks.reloadRoomWired,
        rollbackRoomWired: mocks.rollbackRoomWired,
        setPlayTestMode: mocks.setPlayTestMode,
        updateAccountPreferences: mocks.updateAccountPreferences
    })
}));

import { buildTimezoneOptions, WiredToolsSettingsTabView } from './WiredToolsSettingsTabView';

describe('WiredToolsSettingsTabView', () => {
    beforeEach(() => {
        for (const key of Object.keys(mocks.config)) delete mocks.config[key];
        mocks.showConfirm.mockReset();
        mocks.saveRoomTimezone.mockReset();
        mocks.reloadRoomWired.mockReset();
        mocks.rollbackRoomWired.mockReset();
        mocks.showSingleBubble.mockReset();
        mocks.updateAccountPreferences.mockReset();
        mocks.setPlayTestMode.mockReset();
        mocks.preferences.playTestMode = false;
    });

    afterEach(cleanup);

    it('lists the room zone, the hotel zone and the configured zones once each', () => {
        expect(buildTimezoneOptions('Europe/Amsterdam', 'UTC', 'UTC, Europe/Amsterdam, America/New_York')).toEqual([
            'Europe/Amsterdam',
            'UTC',
            'America/New_York'
        ]);
        expect(buildTimezoneOptions('', 'UTC', '')).toContain('UTC');
    });

    it('saves a picked timezone through the permissions packet', () => {
        mocks.config['wired.timezones'] = 'UTC,Europe/Amsterdam,Europe/Berlin';
        render(<WiredToolsSettingsTabView />);

        const select = screen.getByRole('combobox', { name: 'Timezone' });
        expect(select).toHaveTextContent('Europe/Amsterdam');

        selectOption(select, 'Europe/Berlin');

        expect(mocks.saveRoomTimezone).toHaveBeenCalledWith('Europe/Berlin');
    });

    it('rollback asks first, reload goes at once (official WiredMenuSettingsTab)', () => {
        render(<WiredToolsSettingsTabView />);

        fireEvent.click(screen.getByRole('button', { name: 'Rollback' }));
        expect(mocks.rollbackRoomWired).not.toHaveBeenCalled();
        expect(mocks.showConfirm).toHaveBeenCalledTimes(1);
        // titled by the button, as the official confirm is
        expect(mocks.showConfirm.mock.calls[0][5]).toBe('Rollback');
        // and in AIR's red title bar (titleBarColor 13909337)
        expect(mocks.showConfirm.mock.calls[0][7]).toBe('#d43d59');

        (mocks.showConfirm.mock.calls[0][1] as () => void)();
        expect(mocks.rollbackRoomWired).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
        expect(mocks.showConfirm).toHaveBeenCalledTimes(1);
        expect(mocks.reloadRoomWired).toHaveBeenCalledTimes(1);
    });

    it('labels the permission levels with the official keys', () => {
        render(<WiredToolsSettingsTabView />);

        expect(screen.getAllByText('Users with rights')).toHaveLength(2);
        expect(screen.getByText('Everyone')).toBeInTheDocument();
    });

    it('hands the playtest switch to the store (official setPlayTestMode with notify)', () => {
        render(<WiredToolsSettingsTabView />);

        fireEvent.click(screen.getByRole('checkbox', { name: 'Enable playtesting mode' }));
        expect(mocks.setPlayTestMode).toHaveBeenCalledWith(true);
        expect(mocks.updateAccountPreferences).not.toHaveBeenCalled();
    });

    it('shows the sandbox donation tool only when the hotel enables it', () => {
        const onOpen = vi.fn();
        const { unmount } = render(<WiredToolsSettingsTabView onOpenSelfDonation={onOpen} />);

        expect(screen.queryByRole('button', { name: 'Sandbox donation tool' })).toBeNull();
        unmount();

        mocks.config['wired.selfdonation.enabled'] = true;
        render(<WiredToolsSettingsTabView onOpenSelfDonation={onOpen} />);

        fireEvent.click(screen.getByRole('button', { name: 'Sandbox donation tool' }));
        expect(onOpen).toHaveBeenCalledTimes(1);
    });
});
