import { localizeWithFallback } from '../utils/localizeWithFallback';

/**
 * Wired setup share / import (ours; the official client only has a per-box clipboard). The server
 * builds and validates every code; the client only shows, copies, saves and pastes it.
 */
export const WIRED_SHARE_CODE_PREFIX = 'OWS1:';
/** A code travels as one packet string. */
export const WIRED_SHARE_MAX_CODE_LENGTH = 65000;

export const WIRED_SHARE_ANCHOR_ORIGINAL = 0;
export const WIRED_SHARE_ANCHOR_AVATAR = 1;

export const WIRED_SHARE_STATUS_OK = 0;

export const WIRED_IMPORT_ENTRY_CONFIGURE = 1;
export const WIRED_IMPORT_ENTRY_PLACE = 2;
export const WIRED_IMPORT_ENTRY_MISSING = 3;
export const WIRED_IMPORT_ENTRY_REFUSED = 4;
export const WIRED_IMPORT_ENTRY_BLOCKED = 5;
export const WIRED_IMPORT_ENTRY_UNSUPPORTED = 6;
export const WIRED_IMPORT_ENTRY_UNCHANGED = 7;

const ERROR_FALLBACKS: Record<number, string> = {
    1: 'You may not modify the wired of this room.',
    2: 'There is no wired in this room.',
    3: 'This wired is too large for one code.',
    4: 'Too many wired boxes for one code (300 at most).',
    5: 'This is not a valid wired code.',
    6: 'This code comes from a newer version and cannot be read here.',
    7: 'Stand in the room first.'
};

const ENTRY_FALLBACKS: Record<number, string> = {
    1: 'Configure',
    2: 'From inventory',
    3: 'Missing',
    4: 'Refused',
    5: 'Blocked',
    6: 'Unsupported',
    7: 'Unchanged'
};

/** The text of a share or import status other than OK. */
export const wiredShareErrorText = (status: number): string =>
    localizeWithFallback(`wiredmenu.share.error.${status}`, ERROR_FALLBACKS[status] ?? `Error ${status}`);

/** The text of one import entry's status. */
export const wiredImportEntryText = (status: number): string =>
    localizeWithFallback(`wiredmenu.share.import.status.${status}`, ENTRY_FALLBACKS[status] ?? String(status));

/** A localization key (dotted, no spaces) is localized; a plain server message is shown as it is. */
export const wiredImportReasonText = (reason: string): string => {
    const text = (reason ?? '').trim();

    if (!text) return '';
    if (/^[\w-]+(\.[\w-]+)+$/.test(text)) return localizeWithFallback(text, text);

    return text;
};

/** A pasted or loaded code without the whitespace mail clients and editors wrap it in. */
export const normalizeWiredShareCode = (text: string): string => (text ?? '').replace(/\s+/g, '');

/** Whether text looks like a share code worth sending (the server still checks everything). */
export const isWiredShareCode = (text: string): boolean => {
    const code = normalizeWiredShareCode(text);

    return code.startsWith(WIRED_SHARE_CODE_PREFIX) && code.length > WIRED_SHARE_CODE_PREFIX.length && code.length <= WIRED_SHARE_MAX_CODE_LENGTH;
};

/** The file name a share code is saved under. */
export const wiredShareFileName = (roomId: number): string => `wired-room-${Math.max(0, Math.trunc(roomId || 0))}.owired.txt`;
