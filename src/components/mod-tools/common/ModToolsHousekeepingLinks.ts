import { GetConfigurationValue, OpenUrl } from '../../../api';

/**
 * Housekeeping page keys the official client reads from its configuration. Each value is
 * a URL prefix that the client completes with the user name, the identity id or the flat
 * id, exactly as `ModerationManager.openHkPage` does.
 */
export const HK_MODERATOR_ACTION_LOG_URL = 'moderatoractionlog.url';
export const HK_IDENTITY_INFORMATION_URL = 'identityinformationtool.url';
export const HK_HABBO_INFO_TOOL_URL = 'habboinfotool.url';
export const HK_ROOM_ADMIN_URL = 'roomadmin.url';

/**
 * The official client appends the parameter to the configured prefix. A `%param%` marker
 * is honoured as well so a hotel can put the value in the middle of its own URL.
 */
export const buildHousekeepingUrl = (base: string, parameter: string | number): string | null => {
    if (!base || !base.trim().length) return null;

    const value = String(parameter ?? '');

    return base.includes('%param%') ? base.replace(/%param%/g, value) : base + value;
};

/** Whether the hotel configured this housekeeping page at all; the links stay hidden otherwise. */
export const hasHousekeepingUrl = (configKey: string): boolean => !!GetConfigurationValue<string>(configKey, '');

/** Opens the housekeeping page for `configKey`; returns false when the hotel has not configured it. */
export const openHousekeepingPage = (configKey: string, parameter: string | number): boolean => {
    const url = buildHousekeepingUrl(GetConfigurationValue<string>(configKey, ''), parameter);

    if (!url) return false;

    OpenUrl(url);

    return true;
};
