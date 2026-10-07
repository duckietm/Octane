import { GetSessionDataManager } from '@octane/renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HasSessionPermission, IsAnyRoomController } from './HasSessionPermission';

const useManager = (manager: object) => vi.mocked(GetSessionDataManager).mockReturnValue(manager as never);

describe('HasSessionPermission', () => {
    afterEach(() => vi.mocked(GetSessionDataManager).mockReset());

    it('uses the renderer method when it has one', () => {
        const hasPermission = vi.fn(() => true);

        useManager({ hasPermission });

        expect(HasSessionPermission('acc_gift_hide_sender', 5)).toBe(true);
        expect(hasPermission).toHaveBeenCalledWith('acc_gift_hide_sender', 5);
    });

    it('works on an older renderer from the permissions snapshot', () => {
        useManager({ getPermissionsSnapshot: () => new Map([['acc_anyroomowner', 1], ['acc_debug', 2]]), hasSecurity: () => true });

        expect(IsAnyRoomController()).toBe(true);
        expect(HasSessionPermission('acc_debug', 0)).toBe(false);
        expect(HasSessionPermission('acc_staff_pick', 0)).toBe(false);
    });

    it('falls back to the rank level when the server sent no keys', () => {
        const hasSecurity = vi.fn((level: number) => level <= 4);

        useManager({ getPermissionsSnapshot: () => new Map(), hasSecurity });

        expect(HasSessionPermission('acc_anyroomowner', 4)).toBe(true);
        expect(IsAnyRoomController()).toBe(false);
    });
});
