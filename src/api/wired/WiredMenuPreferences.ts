import { normalizeWiredStyle, WiredStyleName } from './WiredStyle';

/** The wired menu preferences the server stores (the official WiredMenuController ones). */
export interface WiredMenuStoredPreferences {
    showToolbarButton: boolean;
    showInspectButton: boolean;
    playTestMode: boolean;
    showSystemNotifications: boolean;
    wiredStyle: WiredStyleName;
}

/**
 * The server's stored text, `menu,inspect,playtest,showAll,style`; null while the user never saved
 * them (the client keeps its own defaults then).
 */
export const decodeWiredMenuPreferences = (text: string): WiredMenuStoredPreferences | null => {
    const parts = (text ?? '').split(',');

    if (parts.length < 5) return null;

    return {
        showToolbarButton: parts[0] === '1',
        showInspectButton: parts[1] === '1',
        playTestMode: parts[2] === '1',
        showSystemNotifications: parts[3] === '1',
        wiredStyle: normalizeWiredStyle(parts[4])
    };
};
