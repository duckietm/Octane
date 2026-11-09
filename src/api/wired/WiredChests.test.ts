import { describe, expect, it } from 'vitest';
import {
    getWiredChestLayout,
    getWiredChestMaxCapacity,
    getWiredChestOptions,
    getWiredChestRights,
    isStarterChest,
    readWiredChestStuffData,
    WIRED_CHEST_KIND_COINS,
    WIRED_CHEST_KIND_FURNI,
} from './WiredChests';

const stuff = (overrides: Record<string, string> = {}) => readWiredChestStuffData({
    chest_name: 'Box', chest_desc: 'Mine', everyone_can_open: '1', everyone_can_donate: '0', state_control_mode: '2',
    preview_mode: '3', preview_amount: '4', is_wired_enabled: '0', locked: '0', auto_lock: '1', capacity: '700',
    capacity_level: '2', contents_count: '5', notification_chest_full: '1', notification_donation: '0',
    notification_someone_withdraws: '1', notification_chest_empty: '0', notification_wired_transaction: '1', notify_mode: '1',
    ...overrides,
});

const rights = (owner: boolean, overrides: Partial<Parameters<typeof getWiredChestRights>[0]> = {}) => getWiredChestRights({
    owner, roomOwner: false, hasWiredRead: false, hasWiredWrite: false, empty: false, data: stuff(), ...overrides,
});

describe('wired chest stuff data (AIR WiredChestWrapperView / ChestSettingsUI keys)', () => {
    it('reads every key the server writes', () => {
        expect(stuff()).toEqual({
            name: 'Box', description: 'Mine', everyoneCanOpen: true, everyoneCanDonate: false, stateMode: 2, previewMode: 3,
            previewAmount: 4, wiredEnabled: false, locked: false, autoLock: true, capacity: 700, capacityLevel: 2, contentsCount: 5,
            notifyChestFull: true, notifyDonation: false, notifySomeoneWithdraws: true, notifyChestEmpty: false,
            notifyWiredTransaction: true, notifyMode: 1,
        });
    });

    it('falls back to closed defaults without stuff data', () => {
        const empty = readWiredChestStuffData(null);

        expect([empty.name, empty.wiredEnabled, empty.locked, empty.previewAmount, empty.capacity]).toEqual(['', false, false, 1, 0]);
    });

    it('keeps the stored capacity, even 0, when only the lock or auto-lock changes', () => {
        expect(getWiredChestOptions(stuff({ capacity: '0', locked: '0', auto_lock: '0' }), { locked: true })).toEqual({ locked: true, autoLock: false, capacity: 0 });
        expect(getWiredChestOptions(stuff({ capacity: '0' }), { autoLock: false })).toEqual({ locked: false, autoLock: false, capacity: 0 });
        expect(getWiredChestOptions(stuff(), { capacity: 300 })).toEqual({ locked: false, autoLock: true, capacity: 300 });
    });

    it('computes the max capacity from the level, the starter rule and the hotel config', () => {
        expect(isStarterChest('wf_storage_coins_starter')).toBe(true);
        expect(isStarterChest('wf_storage_coins')).toBe(false);
        expect(getWiredChestMaxCapacity(WIRED_CHEST_KIND_COINS, true, 3)).toBe(100);
        expect(getWiredChestMaxCapacity(WIRED_CHEST_KIND_COINS, false, 0)).toBe(5000);
        expect(getWiredChestMaxCapacity(WIRED_CHEST_KIND_COINS, false, 2)).toBe(15000);
        expect(getWiredChestMaxCapacity(WIRED_CHEST_KIND_FURNI, false, 2)).toBe(3000);
        const config = (key: string) => ({ 'wired.furni_chest.initial_capacity': 500, 'wired.furni_chest.upgrade_capacity': 250 })[key] ?? null;
        expect(getWiredChestMaxCapacity(WIRED_CHEST_KIND_FURNI, false, 2, config)).toBe(1000);
    });
});

describe('wired chest rights and layout (AIR WiredChestWrapperView)', () => {
    it('lets the owner do everything a locked chest still allows', () => {
        expect(rights(true, { data: stuff({ locked: '1' }) })).toMatchObject({ canRead: true, canEdit: true, canWithdraw: true, canDeposit: true, canToggleLock: true });
        expect(rights(true, { empty: true }).canWithdraw).toBe(false);
    });

    it('needs wired permissions for a visitor and keeps a locked chest shut for them', () => {
        expect(rights(false)).toMatchObject({ canRead: false, canEdit: false, canWithdraw: false, canDeposit: false });
        expect(rights(false, { data: stuff({ everyone_can_donate: '1' }) }).canDeposit).toBe(true);
        expect(rights(false, { hasWiredRead: true, hasWiredWrite: true })).toMatchObject({ canRead: true, canEdit: true, canWithdraw: true, canDeposit: true });
        expect(rights(false, { hasWiredWrite: true, data: stuff({ locked: '1' }) })).toMatchObject({ canWithdraw: false, canDeposit: false });
    });

    it('lets the room owner lock but not unlock somebody else\'s chest', () => {
        expect(rights(false, { roomOwner: true }).canToggleLock).toBe(true);
        expect(rights(false, { roomOwner: true, data: stuff({ locked: '1' }) }).canToggleLock).toBe(false);
        expect(rights(false).canToggleLock).toBe(false);
    });

    it('hides the owner sections without read rights and the locking options until the chest is wired', () => {
        expect(getWiredChestLayout(false, true, WIRED_CHEST_KIND_FURNI)).toMatchObject({
            showSettings: false, showLockingOptions: false, showCapacityOptions: false, showWithdrawAll: false, depositKey: 'wiredchests.donate',
        });
        expect(getWiredChestLayout(true, false, WIRED_CHEST_KIND_COINS)).toMatchObject({
            showSettings: true, showNotificationSettings: true, showCapacityOptions: true, showLockingOptions: false,
        });
        expect(getWiredChestLayout(true, true, WIRED_CHEST_KIND_FURNI)).toMatchObject({ showLockingOptions: true, depositKey: 'wiredchests.start_deposit' });
    });
});
