/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setWiredWhisperDisabled = vi.fn();
const setFriendOnlinePreference = vi.fn();
let wiredWhisperDisabled = false;
let friendOnlinePreference = 0;

vi.mock('../../api', () => ({
    localizeWithFallback: (key: string, fallback: string) => fallback
}));

vi.mock('../../hooks', () => ({
    FRIEND_ONLINE_NOTIFY_EVERYONE: 0,
    FRIEND_ONLINE_NOTIFY_RELATIONSHIPS: 1,
    FRIEND_ONLINE_NOTIFY_NOBODY: 2,
    useFriendOnlineNotificationPreference: () => [friendOnlinePreference, setFriendOnlinePreference],
    useWiredWhisperDisabled: () => [wiredWhisperDisabled, setWiredWhisperDisabled]
}));

import { UserOtherPreferencesView } from './UserOtherPreferencesView';

describe('UserOtherPreferencesView', () => {
    beforeEach(() => {
        setWiredWhisperDisabled.mockClear();
        setFriendOnlinePreference.mockClear();
        wiredWhisperDisabled = false;
        friendOnlinePreference = 0;
    });

    afterEach(cleanup);

    it('toggles the wired whisper preference from the checkbox', () => {
        render(<UserOtherPreferencesView />);

        const checkbox = screen.getByRole('checkbox', { name: 'Disable wired whispers' });

        expect(checkbox).not.toBeChecked();

        fireEvent.click(checkbox);

        expect(setWiredWhisperDisabled).toHaveBeenCalledWith(true);
    });

    it('offers everyone, relationships and nobody for the friend-online bubble and saves the choice as a number', () => {
        friendOnlinePreference = 1;

        render(<UserOtherPreferencesView />);

        const select = screen.getByRole('combobox', { name: 'Notify me when a friend comes online' });

        expect(select).toHaveValue('1');
        expect(screen.getByRole('option', { name: 'Everyone' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Users in my relationship status' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Nobody' })).toBeInTheDocument();

        fireEvent.change(select, { target: { value: '2' } });

        expect(setFriendOnlinePreference).toHaveBeenCalledWith(2);
    });
});
