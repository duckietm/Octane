import { GetConfigurationValue } from '../octane';
import { HousekeepingTabId } from './HousekeepingActionType';
import { HousekeepingSanctionTemplate, resolveSanctionTemplates } from './HousekeepingSanctionTemplates';
import {
    HOUSEKEEPING_ESCALATION_KEY,
    HOUSEKEEPING_TICKET_REPLIES_KEY,
    HousekeepingEscalationStep,
    HousekeepingTicketReply,
    resolveEscalationSteps,
    resolveTicketReplies
} from './HousekeepingTicketTools';

export const HOUSEKEEPING_ENABLED_KEY = 'housekeeping.enabled';

/**
 * Default-off master switch. When false, the HK module is completely
 * hidden: no toolbar icon, no panel mount, no link-event routing.
 * Layered ON TOP of the `acc_housekeeping` permission gate — config
 * lets the operator disable HK at the build/deploy level even when
 * the permission exists on the server.
 */
export const isHousekeepingEnabled = (): boolean => GetConfigurationValue<boolean>(HOUSEKEEPING_ENABLED_KEY, false) === true;

/** Every tab of the panel, in menu order; which ones an operator sees depends on their permissions. */
export const HOUSEKEEPING_TABS: readonly HousekeepingTabId[] = [
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
];

/**
 * The permission each tab needs on top of acc_housekeeping; tabs not listed are open to every
 * operator (dashboard, live, support, audit). The server enforces the same areas on every action.
 */
export const HOUSEKEEPING_TAB_PERMISSIONS: Partial<Record<HousekeepingTabId, string>> = {
    [HousekeepingTabId.USERS]: 'acc_hk_users',
    [HousekeepingTabId.ECONOMY]: 'acc_hk_users',
    [HousekeepingTabId.ROOMS]: 'acc_hk_rooms',
    [HousekeepingTabId.BANS]: 'acc_hk_bans',
    [HousekeepingTabId.HOTEL]: 'acc_hk_hotel',
    [HousekeepingTabId.PERMISSIONS]: 'acc_hk_permissions',
    [HousekeepingTabId.SOUNDBOARD]: 'acc_soundboard_manage'
};

/** Every permission a tab can need, so a view can read them all at once. */
export const HOUSEKEEPING_AREA_PERMISSIONS = [
    'acc_hk_users',
    'acc_hk_rooms',
    'acc_hk_bans',
    'acc_hk_economy',
    'acc_hk_hotel',
    'acc_hk_permissions',
    'acc_soundboard_manage'
] as const;

export const isHousekeepingTabOpen = (tab: HousekeepingTabId, holds: (permission: string) => boolean): boolean => {
    const permission = HOUSEKEEPING_TAB_PERMISSIONS[tab];

    return !permission || holds(permission);
};

export const HOUSEKEEPING_SANCTION_TEMPLATES_KEY = 'housekeeping.sanction_templates';

/** The sanction templates for this hotel: `housekeeping.sanction_templates` when set and valid, else the defaults. */
export const getHousekeepingSanctionTemplates = (): HousekeepingSanctionTemplate[] =>
    resolveSanctionTemplates(GetConfigurationValue<unknown>(HOUSEKEEPING_SANCTION_TEMPLATES_KEY, null));

/** The canned replies for this hotel: `housekeeping.ticket_replies` when set and valid, else the defaults. */
export const getHousekeepingTicketReplies = (): HousekeepingTicketReply[] =>
    resolveTicketReplies(GetConfigurationValue<unknown>(HOUSEKEEPING_TICKET_REPLIES_KEY, null));

/** The escalation steps for this hotel: `housekeeping.escalation` when set and valid, else the defaults. */
export const getHousekeepingEscalationSteps = (): HousekeepingEscalationStep[] =>
    resolveEscalationSteps(GetConfigurationValue<unknown>(HOUSEKEEPING_ESCALATION_KEY, null));
