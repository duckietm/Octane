/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMessageComposer = vi.fn();

// The renderer composer (header 1226) keeps the official field order with the reserved int.
vi.mock('@octane/renderer', () => ({
    WiredMenuSettingsComposer: class WiredMenuSettingsComposer {
        private readonly _data: unknown[];

        constructor(
            menuButton: boolean,
            inspectButton: boolean,
            playTestMode: boolean,
            wiredWhisperDisabled: boolean,
            showAllNotifications: boolean,
            uiStyle: string
        ) {
            this._data = [menuButton, inspectButton, playTestMode, 0, wiredWhisperDisabled, showAllNotifications, uiStyle];
        }

        public getMessageArray() {
            return this._data;
        }
    }
}));

vi.mock('../../api', () => ({
    GetLocalStorage: (key: string) => JSON.parse(window.localStorage.getItem(key) ?? 'null'),
    SetLocalStorage: (key: string, value: unknown) => window.localStorage.setItem(key, JSON.stringify(value)),
    SendMessageComposer: (composer: unknown) => sendMessageComposer(composer),
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

import { composeWiredPlayTestPreference, getPlayTestNotificationText, switchWiredPlayTestMode, useWiredPlayTestStore } from './useWiredPlayTestMode';

describe('wired play-test mode (:playtest, WiredMenuController.setPlayTestMode)', () => {
    beforeEach(() => {
        window.localStorage.clear();
        useWiredPlayTestStore.setState({ isPlayTestMode: false });
        sendMessageComposer.mockClear();
    });

    it('sends the play-test flag with the whisper preference in the official preference order', () => {
        expect(composeWiredPlayTestPreference(true, false).getMessageArray()).toEqual([false, false, true, 0, false, false, '']);
        expect(composeWiredPlayTestPreference(false, true).getMessageArray()).toEqual([false, false, false, 0, true, false, '']);
    });

    it('toggles, persists and reports the official notification text', () => {
        const enabled = switchWiredPlayTestMode(false);

        expect(enabled.isPlayTestMode).toBe(true);
        expect(enabled.notification).toBe(getPlayTestNotificationText(true));
        expect(useWiredPlayTestStore.getState().isPlayTestMode).toBe(true);
        expect(window.localStorage.getItem('octane.wired.playTestMode')).toBe('true');
        expect(sendMessageComposer).toHaveBeenCalledTimes(1);
        expect(sendMessageComposer.mock.calls[0][0].getMessageArray()[2]).toBe(true);

        const disabled = switchWiredPlayTestMode(false);

        expect(disabled.isPlayTestMode).toBe(false);
        expect(disabled.notification).toBe(getPlayTestNotificationText(false));
        expect(window.localStorage.getItem('octane.wired.playTestMode')).toBe('false');
    });
});
