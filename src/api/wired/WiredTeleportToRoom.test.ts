import { describe, expect, it } from 'vitest';
import { isTeleportToRoomPickable, isValidTeleportRoomId, readTeleportToRoomParams, sanitizeTeleportRoomId } from './WiredTeleportToRoom';

describe('teleport to room', () => {
    it('keeps a room id to plain digits the server accepts', () => {
        expect(sanitizeTeleportRoomId(' 12a-3 ')).toBe('123');
        expect(sanitizeTeleportRoomId('123456789012')).toBe('1234567890');
        expect(isValidTeleportRoomId('42')).toBe(true);
        expect(isValidTeleportRoomId('0')).toBe(false);
        expect(isValidTeleportRoomId('')).toBe(false);
        expect(isValidTeleportRoomId('9999999999')).toBe(false);
    });

    it('lets room links and teleporters be picked and nothing else', () => {
        expect(isTeleportToRoomPickable({ internalLink: '55' }, ['poster'])).toBe(true);
        expect(isTeleportToRoomPickable(null, ['doorB'])).toBe(true);
        expect(isTeleportToRoomPickable({}, ['xmas_teleport'])).toBe(true);
        expect(isTeleportToRoomPickable({ state: '0' }, ['chair_plasto', null])).toBe(false);
    });

    it('lets room linkers be picked by their classname', () => {
        expect(isTeleportToRoomPickable(null, ['wf_room_linker'])).toBe(true);
        expect(isTeleportToRoomPickable({}, ['WF_ROOM_LINKER', 'WIRED Collegatore Stanze'])).toBe(true);
    });

    it('reads a box saved before the furni source as picked furni', () => {
        expect(readTeleportToRoomParams([11])).toEqual({ userSource: 11, furniSource: 100 });
        expect(readTeleportToRoomParams([0, 201])).toEqual({ userSource: 0, furniSource: 201 });
        expect(readTeleportToRoomParams(undefined)).toEqual({ userSource: 0, furniSource: 100 });
    });
});
