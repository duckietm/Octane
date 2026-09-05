import { GetConfigurationValue } from '../octane';
import { HousekeepingTabId } from './HousekeepingActionType';

export type HousekeepingMode = 'light' | 'full';

export const HOUSEKEEPING_ENABLED_KEY = 'housekeeping.enabled';
export const HOUSEKEEPING_MODE_KEY = 'housekeeping.mode';

/**
 * Default-off master switch. When false, the HK module is completely
 * hidden: no toolbar icon, no panel mount, no link-event routing.
 * Layered ON TOP of the `acc_housekeeping` permission gate — config
 * lets the operator disable HK at the build/deploy level even when
 * the permission exists on the server.
 */
export const isHousekeepingEnabled = (): boolean => GetConfigurationValue<boolean>(HOUSEKEEPING_ENABLED_KEY, false) === true;

/**
 * `full` (default) exposes the six-tab layout: dashboard, users,
 * rooms, economy, audit, and Soundboard. `light` strips the panel down to the
 * essentials — Users + Rooms only — for operators who want the
 * in-client HK only for live moderation, not for economy
 * management. Anything else than `'light'` resolves to `'full'`
 * so a typo doesn't quietly hide tabs.
 */
export const resolveHousekeepingMode = (raw: unknown): HousekeepingMode => (raw === 'light' ? 'light' : 'full');

export const getHousekeepingMode = (): HousekeepingMode => resolveHousekeepingMode(GetConfigurationValue<string>(HOUSEKEEPING_MODE_KEY, 'full'));

const LIGHT_TABS: ReadonlySet<HousekeepingTabId> = new Set<HousekeepingTabId>([HousekeepingTabId.USERS, HousekeepingTabId.ROOMS]);

/**
 * Pure tab-availability check. Kept side-effect-free so tab list
 * filtering and toolbar / link-event gating can all read the same
 * source of truth without hitting the config layer multiple times.
 */
export const isHousekeepingTabAvailable = (tab: HousekeepingTabId, mode: HousekeepingMode): boolean => {
    if (mode === 'full') return true;

    return LIGHT_TABS.has(tab);
};

export const housekeepingTabsForMode = (mode: HousekeepingMode): HousekeepingTabId[] => {
    const all: HousekeepingTabId[] = [
        HousekeepingTabId.DASHBOARD,
        HousekeepingTabId.USERS,
        HousekeepingTabId.ROOMS,
        HousekeepingTabId.ECONOMY,
        HousekeepingTabId.AUDIT,
        HousekeepingTabId.SOUNDBOARD
    ];

    return all.filter((tab) => isHousekeepingTabAvailable(tab, mode));
};
