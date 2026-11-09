/**
 * Wired chest window model, after AIR WiredChestWrapperView / ChestSettingsUI / ChestNotificationSettingsUI
 * (WIN63-202610131318-860371703, roomevents/wired_trading/chests). AIR has no chest data packet: the window reads the
 * chest furni's map stuff data and computes the viewer's rights on the client.
 */

/** Link the success notification uses to open the reward popup (AIR `.click_to_popup`). */
export const WIRED_CHEST_REWARD_LINK = 'wiredchestreward/open';

export const WIRED_CHEST_KIND_COINS = 'coins';
export const WIRED_CHEST_KIND_FURNI = 'furni';
export type WiredChestKind = typeof WIRED_CHEST_KIND_COINS | typeof WIRED_CHEST_KIND_FURNI;

/** Capacity defaults when the hotel config has no wired.<kind>_chest.* values (the PlusEMU rule). */
export const WIRED_CHEST_STARTER_CAPACITY = 100;
export const WIRED_CHEST_COINS_CAPACITY_STEP = 5000;
export const WIRED_CHEST_FURNI_CAPACITY_STEP = 1000;

export interface IWiredChestStuffData {
    name: string;
    description: string;
    everyoneCanOpen: boolean;
    everyoneCanDonate: boolean;
    stateMode: number;
    previewMode: number;
    previewAmount: number;
    wiredEnabled: boolean;
    locked: boolean;
    autoLock: boolean;
    capacity: number;
    capacityLevel: number;
    contentsCount: number;
    notifyChestFull: boolean;
    notifyDonation: boolean;
    notifySomeoneWithdraws: boolean;
    notifyChestEmpty: boolean;
    notifyWiredTransaction: boolean;
    notifyMode: number;
}

type StuffMap = Record<string, string> | null | undefined;

const flag = (data: StuffMap, key: string): boolean => (data?.[key] ?? '') === '1' || data?.[key] === 'true';
const int = (data: StuffMap, key: string, fallback: number): number => {
    const value = parseInt(data?.[key] ?? '', 10);

    return Number.isFinite(value) ? value : fallback;
};

/** Reads the keys the server writes on a chest's map stuff data. */
export const readWiredChestStuffData = (data: StuffMap): IWiredChestStuffData => ({
    name: data?.chest_name ?? '',
    description: data?.chest_desc ?? '',
    everyoneCanOpen: flag(data, 'everyone_can_open'),
    everyoneCanDonate: flag(data, 'everyone_can_donate'),
    stateMode: int(data, 'state_control_mode', 0),
    previewMode: int(data, 'preview_mode', 0),
    previewAmount: int(data, 'preview_amount', 1),
    wiredEnabled: flag(data, 'is_wired_enabled'),
    locked: flag(data, 'locked'),
    autoLock: flag(data, 'auto_lock'),
    capacity: int(data, 'capacity', 0),
    capacityLevel: int(data, 'capacity_level', 0),
    contentsCount: int(data, 'contents_count', 0),
    notifyChestFull: flag(data, 'notification_chest_full'),
    notifyDonation: flag(data, 'notification_donation'),
    notifySomeoneWithdraws: flag(data, 'notification_someone_withdraws'),
    notifyChestEmpty: flag(data, 'notification_chest_empty'),
    notifyWiredTransaction: flag(data, 'notification_wired_transaction'),
    notifyMode: int(data, 'notify_mode', 0),
});

/**
 * Values for ChestSaveOptions (1211). Only the capacity input changes the capacity; a lock or auto-lock toggle sends the
 * stored capacity unchanged (also 0), because the server refuses a non-owner's lock change when anything else moved.
 */
export const getWiredChestOptions = (
    data: IWiredChestStuffData,
    next: { locked?: boolean; autoLock?: boolean; capacity?: number }): { locked: boolean; autoLock: boolean; capacity: number } => ({
    locked: next.locked ?? data.locked,
    autoLock: next.autoLock ?? data.autoLock,
    capacity: next.capacity ?? data.capacity,
});

export const isStarterChest = (className: string): boolean => !!className && className.includes('_starter');

/**
 * Max capacity. AIR reads wired.<coins|furni>_chest.{starter,initial,upgrade}_capacity; without those the PlusEMU rule
 * applies: a starter chest holds 100, otherwise coins 5000 and furni 1000 per capacity level (+1).
 */
export const getWiredChestMaxCapacity = (
    kind: WiredChestKind,
    starter: boolean,
    capacityLevel: number,
    config: (key: string) => number | null = () => null): number => {
    const prefix = `wired.${ kind }_chest.`;

    if (starter) return config(`${ prefix }starter_capacity`) ?? WIRED_CHEST_STARTER_CAPACITY;

    const step = kind === WIRED_CHEST_KIND_COINS ? WIRED_CHEST_COINS_CAPACITY_STEP : WIRED_CHEST_FURNI_CAPACITY_STEP;
    const initial = config(`${ prefix }initial_capacity`) ?? step;
    const upgrade = config(`${ prefix }upgrade_capacity`) ?? step;

    return initial + (upgrade * Math.max(0, capacityLevel));
};

export interface IWiredChestRights {
    owner: boolean;
    roomOwner: boolean;
    canRead: boolean;
    canEdit: boolean;
    canWithdraw: boolean;
    canDeposit: boolean;
    /** AIR Util.disableSection(lockChestCheckbox, !owner && (!roomOwner || locked)). */
    canToggleLock: boolean;
}

/** AIR WiredChestWrapperView rights (L643-655). */
export const getWiredChestRights = (input: {
    owner: boolean;
    roomOwner: boolean;
    hasWiredRead: boolean;
    hasWiredWrite: boolean;
    empty: boolean;
    data: IWiredChestStuffData;
}): IWiredChestRights => {
    const { owner, roomOwner, hasWiredRead, hasWiredWrite, empty, data } = input;
    const canRead = owner || hasWiredRead;
    const canEdit = owner || hasWiredWrite;

    return {
        owner,
        roomOwner,
        canRead,
        canEdit,
        canWithdraw: !empty && canEdit && (!data.locked || owner),
        canDeposit: !(!data.everyoneCanDonate && (!canEdit || (data.locked && !owner))),
        canToggleLock: owner || (roomOwner && !data.locked),
    };
};

export interface IWiredChestLayout {
    showSettings: boolean;
    showNotificationSettings: boolean;
    showLockingOptions: boolean;
    showCapacityOptions: boolean;
    showLogs: boolean;
    showWithdrawAll: boolean;
    /** Deposit button caption key. */
    depositKey: string;
}

/** AIR WiredChestWrapperView.updateLayout. */
export const getWiredChestLayout = (canRead: boolean, wiredEnabled: boolean, kind: WiredChestKind): IWiredChestLayout => {
    const depositKey = kind === WIRED_CHEST_KIND_FURNI ? 'wiredchests.start_deposit' : 'wiredchests.initial_deposit';

    if (!canRead) {
        return {
            showSettings: false,
            showNotificationSettings: false,
            showLockingOptions: false,
            showCapacityOptions: false,
            showLogs: false,
            showWithdrawAll: false,
            depositKey: 'wiredchests.donate',
        };
    }

    return {
        showSettings: true,
        showNotificationSettings: true,
        showLockingOptions: wiredEnabled,
        showCapacityOptions: true,
        showLogs: true,
        showWithdrawAll: true,
        depositKey,
    };
};
