/**
 * Maps a RoomSettingsSaveError (header 1555) to the field AIR marks, mirroring
 * navigator/roomsettings/RoomSettingsCtrl.onRoomSettingsSaveError. Tabs are
 * numbered like AIR's (1 basic, 2 access, 3 rights, 4 club & chat, 5 moderation).
 */

export type RoomSettingsErrorField = 'name' | 'description' | 'tag1' | 'tag2' | 'password' | 'idle_sleep' | 'idle_autokick';

export interface RoomSettingsFieldError {
    /** Localization key, or null when `fallback` is the literal text. */
    key: string | null;
    fallback: string;
}

export interface RoomSettingsSaveErrorResult {
    tab: number;
    errors: Partial<Record<RoomSettingsErrorField, RoomSettingsFieldError>>;
}

export const ROOM_SETTINGS_TAB_BASIC = 1;
export const ROOM_SETTINGS_TAB_ACCESS = 2;
export const ROOM_SETTINGS_TAB_CLUB_AND_CHAT = 4;

const ERROR_PASSWORD_REQUIRED = 5;
const ERROR_ROOM_NAME_MISSING = 7;
const ERROR_ROOM_NAME_BADWORDS = 8;
const ERROR_ROOM_DESCRIPTION_BADWORDS = 10;
const ERROR_ROOM_TAGS_BADWORDS = 11;
const ERROR_RESTRICTED_TAGS = 12;
const ERROR_TAGS_TOO_LONG = 13;
const ERROR_CUSTOM = 16;

const UNACCEPTABLE: RoomSettingsFieldError = { key: 'navigator.roomsettings.unacceptablewords', fallback: 'Unacceptable words' };
const NON_CHOOSABLE: RoomSettingsFieldError = { key: 'navigator.roomsettings.nonuserchoosabletag', fallback: 'This tag is reserved by the staff.' };
const TOO_LONG: RoomSettingsFieldError = { key: 'navigator.roomsettings.toomanycharacters', fallback: 'Too long' };
const NAME_MANDATORY: RoomSettingsFieldError = { key: 'navigator.roomsettings.roomnameismandatory', fallback: 'You must give your room a name' };
const PASSWORD_MANDATORY: RoomSettingsFieldError = { key: 'navigator.roomsettings.passwordismandatory', fallback: 'You must enter a password' };
const IDLE_SLEEP_INVALID: RoomSettingsFieldError = {
    key: 'navigator.roomsettings.idle_sleep_timeout.invalid',
    fallback: 'Enter a time between 30 and 3600 seconds.'
};
const IDLE_AUTOKICK_INVALID: RoomSettingsFieldError = {
    key: 'navigator.roomsettings.idle_autokick_timeout.invalid',
    fallback: 'Enter a time between 60 and 36000 seconds.'
};

const updateFailed = (code: number): RoomSettingsFieldError => ({ key: null, fallback: `Update failed: error ${code}` });

/**
 * AIR marks a tag only when its lower-cased text equals the server's info string.
 * A server that leaves info empty would mark nothing, so then every filled tag is marked.
 */
const tagErrors = (tags: string[], info: string, error: RoomSettingsFieldError): RoomSettingsSaveErrorResult['errors'] => {
    const fields: RoomSettingsErrorField[] = ['tag1', 'tag2'];
    const wanted = (info ?? '').toLowerCase();
    const errors: RoomSettingsSaveErrorResult['errors'] = {};

    fields.forEach((field, index) => {
        const tag = (tags[index] ?? '').toLowerCase();

        if (tag.length && tag === wanted) errors[field] = error;
    });

    if (Object.keys(errors).length) return errors;

    fields.forEach((field, index) => {
        if ((tags[index] ?? '').length) errors[field] = error;
    });

    return errors;
};

export const resolveRoomSettingsSaveError = (code: number, info: string, tags: string[]): RoomSettingsSaveErrorResult => {
    switch (code) {
        case ERROR_ROOM_NAME_MISSING:
            return { tab: ROOM_SETTINGS_TAB_BASIC, errors: { name: NAME_MANDATORY } };
        case ERROR_ROOM_NAME_BADWORDS:
            return { tab: ROOM_SETTINGS_TAB_BASIC, errors: { name: UNACCEPTABLE } };
        case ERROR_ROOM_DESCRIPTION_BADWORDS:
            return { tab: ROOM_SETTINGS_TAB_BASIC, errors: { description: UNACCEPTABLE } };
        case ERROR_ROOM_TAGS_BADWORDS:
            return { tab: ROOM_SETTINGS_TAB_BASIC, errors: tagErrors(tags, info, UNACCEPTABLE) };
        case ERROR_RESTRICTED_TAGS:
            return { tab: ROOM_SETTINGS_TAB_BASIC, errors: tagErrors(tags, info, NON_CHOOSABLE) };
        case ERROR_PASSWORD_REQUIRED:
            return { tab: ROOM_SETTINGS_TAB_ACCESS, errors: { password: PASSWORD_MANDATORY } };
        case ERROR_TAGS_TOO_LONG:
            return { tab: ROOM_SETTINGS_TAB_BASIC, errors: tagErrors(tags, info, TOO_LONG) };
        case ERROR_CUSTOM:
            // AIR's handleCustomRoomSettingSaveError: info names the offending field.
            if (info === 'idleSleepTimeoutSeconds') return { tab: ROOM_SETTINGS_TAB_CLUB_AND_CHAT, errors: { idle_sleep: IDLE_SLEEP_INVALID } };
            if (info === 'idleAutokickTimeoutSeconds') return { tab: ROOM_SETTINGS_TAB_CLUB_AND_CHAT, errors: { idle_autokick: IDLE_AUTOKICK_INVALID } };

            return { tab: ROOM_SETTINGS_TAB_BASIC, errors: { name: updateFailed(code) } };
        default:
            return { tab: ROOM_SETTINGS_TAB_BASIC, errors: { name: updateFailed(code) } };
    }
};
