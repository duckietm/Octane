import { describe, expect, it } from 'vitest';
import { resolveRoomSettingsSaveError, ROOM_SETTINGS_TAB_ACCESS, ROOM_SETTINGS_TAB_BASIC, ROOM_SETTINGS_TAB_CLUB_AND_CHAT } from './RoomSettingsSaveError';

describe('resolveRoomSettingsSaveError', () => {
    it('marks the room name when it is missing or has bad words', () => {
        expect(resolveRoomSettingsSaveError(7, '', [])).toEqual({
            tab: ROOM_SETTINGS_TAB_BASIC,
            errors: { name: expect.objectContaining({ key: 'navigator.roomsettings.roomnameismandatory' }) }
        });
        expect(resolveRoomSettingsSaveError(8, '', []).errors.name?.key).toBe('navigator.roomsettings.unacceptablewords');
    });

    it('marks the description for code 10', () => {
        expect(resolveRoomSettingsSaveError(10, '', []).errors).toEqual({
            description: expect.objectContaining({ key: 'navigator.roomsettings.unacceptablewords' })
        });
    });

    it('switches to the access tab for a missing password', () => {
        const result = resolveRoomSettingsSaveError(5, '', []);

        expect(result.tab).toBe(ROOM_SETTINGS_TAB_ACCESS);
        expect(result.errors.password?.key).toBe('navigator.roomsettings.passwordismandatory');
    });

    it('marks only the tag the server names, case-insensitively', () => {
        const result = resolveRoomSettingsSaveError(12, 'staff', ['fun', 'Staff']);

        expect(Object.keys(result.errors)).toEqual(['tag2']);
        expect(result.errors.tag2?.key).toBe('navigator.roomsettings.nonuserchoosabletag');
        expect(resolveRoomSettingsSaveError(13, 'averyveryverylongtag', ['averyveryverylongtag', '']).errors.tag1?.key).toBe(
            'navigator.roomsettings.toomanycharacters'
        );
    });

    it('marks every filled tag when the server does not name one', () => {
        expect(Object.keys(resolveRoomSettingsSaveError(11, '', ['a', 'b']).errors)).toEqual(['tag1', 'tag2']);
        expect(Object.keys(resolveRoomSettingsSaveError(11, '', ['a', '']).errors)).toEqual(['tag1']);
    });

    it('routes the custom idle errors to the club and chat tab', () => {
        expect(resolveRoomSettingsSaveError(16, 'idleSleepTimeoutSeconds', [])).toEqual({
            tab: ROOM_SETTINGS_TAB_CLUB_AND_CHAT,
            errors: { idle_sleep: expect.objectContaining({ key: 'navigator.roomsettings.idle_sleep_timeout.invalid' }) }
        });
        expect(resolveRoomSettingsSaveError(16, 'idleAutokickTimeoutSeconds', []).errors.idle_autokick).toBeDefined();
    });

    it("falls back to AIR's generic message on the name field", () => {
        expect(resolveRoomSettingsSaveError(16, 'other', []).errors.name).toEqual({ key: null, fallback: 'Update failed: error 16' });
        expect(resolveRoomSettingsSaveError(2, '', [])).toEqual({
            tab: ROOM_SETTINGS_TAB_BASIC,
            errors: { name: { key: null, fallback: 'Update failed: error 2' } }
        });
    });
});
