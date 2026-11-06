import type { IWiredVariableHolder } from '@octane/renderer';
import {
    VariablesWebApiError,
    WebApiEntry,
    WebApiFurniTargetKind,
    WebApiHolderScope,
    WebApiProfile,
    WebApiSortField,
    WebApiSortOrder,
    WebApiTargetKind,
    WebApiUserTargetKind,
    WebApiVariable
} from './variablesWebApi';
import { normalizeWebApiBaseUrl, WebApiHotel } from './WiredWebApi';
import { localizeWithFallback } from '../utils/localizeWithFallback';

/** Pure pieces of the Variables Explorer window. */

export interface ExplorerConnectInput {
    hotelUrl: string;
    roomId: string;
    readKey: string;
    writeKey: string;
}

export interface ExplorerConnection {
    hotelUrl: string;
    roomId: number;
    readKey: string;
    writeKey: string;
}

export type ExplorerConnectField = keyof ExplorerConnectInput;

const KEY_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;
const MAX_ROOM_ID = 2147483647;

export const sanitizeRoomIdInput = (value: string): string => (value ?? '').replace(/[^0-9]/g, '').slice(0, 10);

export const validateExplorerConnect = (
    input: ExplorerConnectInput,
    hotels: WebApiHotel[]
): { errors: Partial<Record<ExplorerConnectField, string>>; connection: ExplorerConnection | null } => {
    const errors: Partial<Record<ExplorerConnectField, string>> = {};
    const hotelUrl = normalizeWebApiBaseUrl(input.hotelUrl);
    const readKey = (input.readKey ?? '').trim();
    const writeKey = (input.writeKey ?? '').trim();
    const roomText = (input.roomId ?? '').trim();
    const roomId = /^[0-9]{1,10}$/.test(roomText) ? Number(roomText) : 0;

    if (!hotelUrl || !hotels.some((hotel) => hotel.url === hotelUrl)) errors.hotelUrl = localizeWithFallback('octane.wired.pick_a_hotel', 'Pick a hotel');
    if (roomId <= 0 || roomId > MAX_ROOM_ID) errors.roomId = localizeWithFallback('octane.wired.enter_a_room_id', 'Enter a room id');
    if (readKey && !KEY_PATTERN.test(readKey)) errors.readKey = localizeWithFallback('octane.wired.this_is_not_a_valid_key', 'This is not a valid key');
    if (writeKey && !KEY_PATTERN.test(writeKey)) errors.writeKey = localizeWithFallback('octane.wired.this_is_not_a_valid_key', 'This is not a valid key');
    if (!readKey && !writeKey) errors.readKey = localizeWithFallback('octane.wired.enter_a_read_key_or_a', 'Enter a read key or a write key');

    if (Object.keys(errors).length) return { errors, connection: null };

    return { errors, connection: { hotelUrl, roomId, readKey, writeKey } };
};

const REMEMBER_PREFIX = 'octane.variables_explorer.keys';

export const rememberedKeysStorageKey = (hotelUrl: string, roomId: number): string => `${REMEMBER_PREFIX}:${hotelUrl}:${roomId}`;

export const loadRememberedKeys = (
    hotelUrl: string,
    roomId: number,
    storage: Storage | null = safeLocalStorage()
): { readKey: string; writeKey: string } | null => {
    if (!storage || !hotelUrl || !roomId) return null;

    try {
        const raw = storage.getItem(rememberedKeysStorageKey(hotelUrl, roomId));

        if (!raw) return null;

        const parsed = JSON.parse(raw) as { readKey?: unknown; writeKey?: unknown };

        return {
            readKey: typeof parsed?.readKey === 'string' ? parsed.readKey : '',
            writeKey: typeof parsed?.writeKey === 'string' ? parsed.writeKey : ''
        };
    } catch {
        return null;
    }
};

export const saveRememberedKeys = (connection: ExplorerConnection, remember: boolean, storage: Storage | null = safeLocalStorage()): void => {
    if (!storage) return;

    const key = rememberedKeysStorageKey(connection.hotelUrl, connection.roomId);

    try {
        if (remember) storage.setItem(key, JSON.stringify({ readKey: connection.readKey, writeKey: connection.writeKey }));
        else storage.removeItem(key);
    } catch {}
};

function safeLocalStorage(): Storage | null {
    try {
        return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
        return null;
    }
}

export const USER_TARGET_KINDS: WebApiUserTargetKind[] = ['users', 'pets', 'bots'];
/** Habbo's furni kinds; Builders Club items have their own. */
export const FURNI_TARGET_KINDS: WebApiFurniTargetKind[] = ['furni', 'wall-items', 'furni-bc', 'wall-items-bc'];

export const targetKindsOf = (scope: WebApiHolderScope): WebApiTargetKind[] => (scope === 'furni' ? FURNI_TARGET_KINDS : USER_TARGET_KINDS);

export const isWallTargetKind = (kind: string): boolean => kind === 'wall-items' || kind === 'wall-items-bc';

export const targetKindLabel = (kind: string): string => {
    switch (kind) {
        case 'users':
            return 'Habbo';
        case 'pets':
            return 'Pet';
        case 'bots':
            return 'Bot';
        case 'furni':
            return localizeWithFallback('octane.wired.floor_furni', 'Floor furni');
        case 'wall-items':
            return localizeWithFallback('octane.wired.wall_furni', 'Wall furni');
        case 'furni-bc':
            return localizeWithFallback('octane.wired.builders_club_floor_furni', 'Builders Club floor furni');
        case 'wall-items-bc':
            return localizeWithFallback('octane.wired.builders_club_wall_furni', 'Builders Club wall furni');
        default:
            return kind || 'Room';
    }
};

export const holderScopeOfKind = (kind: WebApiTargetKind): WebApiHolderScope => (FURNI_TARGET_KINDS.includes(kind as WebApiFurniTargetKind) ? 'furni' : 'user');

export interface ExplorerSortOption {
    id: string;
    label: string;
    sort: WebApiSortField;
    order: WebApiSortOrder;
}

export const EXPLORER_SORT_OPTIONS: ExplorerSortOption[] = [
    { id: 'id_asc', get label() { return localizeWithFallback('octane.wired.entity_id', 'Entity id'); }, sort: 'id', order: 'asc' },
    { id: 'value_desc', get label() { return localizeWithFallback('octane.wired.highest_value', 'Highest value'); }, sort: 'value', order: 'desc' },
    { id: 'value_asc', get label() { return localizeWithFallback('octane.wired.lowest_value', 'Lowest value'); }, sort: 'value', order: 'asc' },
    { id: 'id_desc', get label() { return localizeWithFallback('octane.wired.newest_entity_id', 'Newest entity id'); }, sort: 'id', order: 'desc' },
    { id: 'updated_desc', get label() { return localizeWithFallback('octane.wired.last_updated', 'Last updated'); }, sort: 'update_time', order: 'desc' }
];

export const sortOptionById = (id: string): ExplorerSortOption => EXPLORER_SORT_OPTIONS.find((option) => option.id === id) ?? EXPLORER_SORT_OPTIONS[0];

export const formatUnixSeconds = (seconds: number | null | undefined): string => {
    if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return '';

    const date = new Date(seconds * 1000);
    const pad = (value: number) => String(value).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

/** The server's holder kinds as the owners table knows them (`HOLDER_TYPE_USER` / `HOLDER_TYPE_FURNI`). */
export const webApiEntryToHolder = (entry: WebApiEntry, scope: WebApiHolderScope, kind: WebApiTargetKind): IWiredVariableHolder => ({
    entityType: scope === 'furni' ? 2 : 1,
    entityId: entry.entityId,
    entityName: entry.name || `${targetKindLabel(kind)} #${entry.entityId}`,
    storage: {
        value: entry.value ?? 0,
        creationTime: (entry.createdAt ?? 0) * 1000,
        creationTimeStr: formatUnixSeconds(entry.createdAt),
        lastUpdateTime: (entry.updatedAt ?? 0) * 1000,
        lastUpdateTimeStr: formatUnixSeconds(entry.updatedAt)
    }
});

export interface ExplorerProfileEntry {
    name: string;
    hasValue: boolean;
    value: number | null;
    createdAt: number;
    updatedAt: number;
}

/** A profile's variables in name order, with `hasValue` taken from the room's variable list when known. */
export const profileToEntries = (profile: WebApiProfile | null, variables: WebApiVariable[]): ExplorerProfileEntry[] => {
    if (!profile?.variables) return [];

    return Object.entries(profile.variables)
        .map(([name, stored]) => {
            const definition = variables.find((variable) => variable.name === name);
            const hasValue = definition ? definition.hasValue : typeof stored?.value === 'number';

            return {
                name,
                hasValue,
                value: hasValue && typeof stored?.value === 'number' ? stored.value : null,
                createdAt: stored?.createdAt ?? 0,
                updatedAt: stored?.updatedAt ?? 0
            };
        })
        .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));
};

/** Variables of the scope that the holder does not have yet. */
export const giveableVariables = (variables: WebApiVariable[], scope: WebApiHolderScope, entries: ExplorerProfileEntry[]): WebApiVariable[] =>
    variables
        .filter((variable) => variable.scope === scope && !entries.some((entry) => entry.name === variable.name))
        .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));

/** A 32-bit signed integer typed by the user, or `null`. */
export const parseInt32 = (text: string): number | null => {
    const trimmed = (text ?? '').trim();

    if (!/^-?\d{1,10}$/.test(trimmed)) return null;

    const value = Number(trimmed);

    return value >= -2147483648 && value <= 2147483647 ? value : null;
};

/** What each of the API's error codes means for the person using the explorer. */
const ERROR_MESSAGES: Record<string, string> = {
    'wired.variables.key_missing': localizeWithFallback('octane.wired.this_needs_the_write_key', 'This needs the write key.'),
    'wired.variables.key_invalid': localizeWithFallback('octane.wired.the_key_was_not_accepted', 'The key was not accepted.'),
    'wired.variables.api_disabled': localizeWithFallback('octane.wired.the_variables_web_api_add_on', 'The Variables Web API add-on does not work in this room.'),
    'wired.variables.bulk_delete_not_enabled': localizeWithFallback('octane.wired.this_write_key_may_not_bulk', 'This write key may not bulk delete. Allow mass deletion in the Web API add-on first.'),
    'wired.variables.operation_not_allowed': localizeWithFallback('octane.wired.this_room_does_not_allow_that', 'This room does not allow that.'),
    'wired.variables.user_not_participating': localizeWithFallback('octane.wired.that_user_is_not_in_the', 'That user is not in the room and has no saved variables in it.'),
    'wired.variables.entity_not_found': localizeWithFallback('octane.wired.nothing_with_that_id_is_in', 'Nothing with that id is in the room.'),
    'wired.variables.not_found': localizeWithFallback('octane.wired.not_found', 'Not found.'),
    'room.not_found': localizeWithFallback('octane.wired.that_room_was_not_found', 'That room was not found.'),
    'wired.variables.unknown_endpoint': localizeWithFallback('octane.wired.the_variables_web_api_is_not', 'The Variables Web API is not available on this hotel.'),
    'wired.variables.invalid_value': localizeWithFallback('octane.wired.that_value_is_not_accepted', 'That value is not accepted.'),
    'wired.variables.invalid_target': localizeWithFallback('octane.wired.that_holder_is_not_valid_for', 'That holder is not valid for this variable.'),
    'wired.variables.bulk_delete_invalid_variable': localizeWithFallback('octane.wired.that_variable_is_not_in_this', 'That variable is not in this room.'),
    'timeout': localizeWithFallback('octane.wired.the_hotel_did_not_answer_in', 'The hotel did not answer in time.'),
    'network': localizeWithFallback('octane.wired.the_hotel_could_not_be_reached', 'The hotel could not be reached.')
};

export const explorerErrorMessage = (error: unknown): string => {
    if (error instanceof VariablesWebApiError) {
        if (error.code === 'wired.variables.too_many_requests') return `Too many requests. Try again in ${error.retryAfterSeconds ?? 10} s.`;
        if (error.code === 'no_key') return error.message;

        return ERROR_MESSAGES[error.code] ?? (error.message || 'Something went wrong.');
    }

    return error instanceof Error && error.message ? error.message : localizeWithFallback('octane.wired.something_went_wrong', 'Something went wrong.');
};
