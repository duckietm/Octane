import { describe, expect, it } from 'vitest';
import { HousekeepingTabId } from './HousekeepingActionType';
import { HOUSEKEEPING_TABS, isHousekeepingTabOpen } from './HousekeepingConfig';

describe('HOUSEKEEPING_TABS', () => {
    it('lists every tab once, in menu order, with no light/full split', () => {
        expect(HOUSEKEEPING_TABS).toEqual([
            HousekeepingTabId.DASHBOARD,
            HousekeepingTabId.LIVE,
            HousekeepingTabId.USERS,
            HousekeepingTabId.ROOMS,
            HousekeepingTabId.SUPPORT,
            HousekeepingTabId.BANS,
            HousekeepingTabId.AUDIT,
            HousekeepingTabId.HOTEL,
            HousekeepingTabId.PERMISSIONS,
            HousekeepingTabId.SOUNDBOARD
        ]);
    });
});

describe('isHousekeepingTabOpen', () => {
    const holding =
        (...keys: string[]) =>
        (permission: string) =>
            keys.includes(permission);

    it('opens the overview tabs to every operator', () => {
        for (const tab of [HousekeepingTabId.DASHBOARD, HousekeepingTabId.LIVE, HousekeepingTabId.SUPPORT, HousekeepingTabId.AUDIT]) {
            expect(isHousekeepingTabOpen(tab, holding())).toBe(true);
        }
    });

    it('opens an area tab only with its permission', () => {
        expect(isHousekeepingTabOpen(HousekeepingTabId.USERS, holding())).toBe(false);
        expect(isHousekeepingTabOpen(HousekeepingTabId.USERS, holding('acc_hk_users'))).toBe(true);
        expect(isHousekeepingTabOpen(HousekeepingTabId.BANS, holding('acc_hk_users'))).toBe(false);
        expect(isHousekeepingTabOpen(HousekeepingTabId.PERMISSIONS, holding('acc_hk_permissions'))).toBe(true);
        expect(isHousekeepingTabOpen(HousekeepingTabId.SOUNDBOARD, holding('acc_soundboard_manage'))).toBe(true);
    });
});
