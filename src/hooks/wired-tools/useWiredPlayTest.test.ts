/* @vitest-environment jsdom */

import { AddLinkEventTracker, GetRoomSessionManager, RemoveLinkEventTracker } from '@octane/renderer';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyWiredPlayTestMode, WIRED_PLAYTEST_TOGGLE_LINK, wiredPlayTestNotificationKey } from '../../api/wired/WiredPlayTest';
import { useWiredPlayTest } from './useWiredPlayTest';

vi.mock('../../api', async () => await import('../../api/wired/WiredPlayTest'));

const setPlayTestMode = vi.fn();

describe('wired menu playtest wiring (AIR WiredMenuController.setPlayTestMode)', () => {
    beforeEach(() => {
        setPlayTestMode.mockReset();
        vi.mocked(AddLinkEventTracker).mockReset();
        vi.mocked(RemoveLinkEventTracker).mockReset();
        vi.mocked(GetRoomSessionManager).mockReturnValue({ setPlayTestMode } as never);
    });

    it('hands the preference to the room session manager', () => {
        applyWiredPlayTestMode(true);
        applyWiredPlayTestMode(false);

        expect(setPlayTestMode.mock.calls).toEqual([[true], [false]]);
    });

    it('leaves the room alone on a renderer without the playtest API', () => {
        vi.mocked(GetRoomSessionManager).mockReturnValue({} as never);

        expect(() => applyWiredPlayTestMode(true)).not.toThrow();
    });

    it('names the official switch notifications', () => {
        expect(wiredPlayTestNotificationKey(true)).toBe('wiredmenu.settings.preferences.notification.playtest.enabled');
        expect(wiredPlayTestNotificationKey(false)).toBe('wiredmenu.settings.preferences.notification.playtest.disabled');
    });

    it('applies the stored preference at once and again on every change', () => {
        const { rerender } = renderHook(({ on }) => useWiredPlayTest(on, () => {}), { initialProps: { on: true } });

        expect(setPlayTestMode).toHaveBeenLastCalledWith(true);

        rerender({ on: true });
        expect(setPlayTestMode).toHaveBeenCalledTimes(1);

        rerender({ on: false });
        expect(setPlayTestMode).toHaveBeenLastCalledWith(false);
    });

    it('flips the preference through the :playtest link with the latest toggle', () => {
        const first = vi.fn();
        const latest = vi.fn();
        const { rerender, unmount } = renderHook(({ toggle }) => useWiredPlayTest(false, toggle), { initialProps: { toggle: first } });

        rerender({ toggle: latest });

        const tracker = vi.mocked(AddLinkEventTracker).mock.calls[0][0];

        expect(AddLinkEventTracker).toHaveBeenCalledTimes(1);
        expect(tracker.eventUrlPrefix).toBe(WIRED_PLAYTEST_TOGGLE_LINK);

        tracker.linkReceived(WIRED_PLAYTEST_TOGGLE_LINK);

        expect(first).not.toHaveBeenCalled();
        expect(latest).toHaveBeenCalledTimes(1);

        unmount();
        expect(RemoveLinkEventTracker).toHaveBeenCalledWith(tracker);
    });
});
