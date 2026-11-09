import { describe, expect, it } from 'vitest';
import {
    IRaidProtectionEditable,
    isValidRaidProtectionSettings,
    parseRaidProtectionLinkRoomId,
    raidProtectionMatchesEditable,
    raidProtectionNeedsConfirmation,
    raidProtectionSaveResultKey
} from './RaidProtection';

const base: IRaidProtectionEditable = {
    roomId: 7,
    enabled: false,
    sensitivity: 1,
    actionType: 0,
    banDurationSeconds: 3600,
    guardEnabled: false,
    guardDurationSeconds: 900,
    guardSensitivity: 1
};

describe('AIR raid protection helpers', () =>
{
    it('accepts only the values of AIR’s lists', () =>
    {
        expect(isValidRaidProtectionSettings(base)).toBe(true);
        expect(isValidRaidProtectionSettings({ ...base, sensitivity: 3 })).toBe(false);
        expect(isValidRaidProtectionSettings({ ...base, actionType: 2 })).toBe(false);
        expect(isValidRaidProtectionSettings({ ...base, banDurationSeconds: 60 })).toBe(false);
        expect(isValidRaidProtectionSettings({ ...base, guardDurationSeconds: 604800 })).toBe(false);
        expect(isValidRaidProtectionSettings({ ...base, guardSensitivity: -1 })).toBe(false);
        expect(isValidRaidProtectionSettings(null)).toBe(false);
    });

    it('parses the room id of navigator/raidprotection/<id> as AIR does', () =>
    {
        expect(parseRaidProtectionLinkRoomId('42')).toBe(42);
        expect(parseRaidProtectionLinkRoomId('0')).toBeNull();
        expect(parseRaidProtectionLinkRoomId('-4')).toBeNull();
        expect(parseRaidProtectionLinkRoomId('4a')).toBeNull();
        expect(parseRaidProtectionLinkRoomId('2147483648')).toBeNull();
        expect(parseRaidProtectionLinkRoomId(null)).toBeNull();
    });

    it('asks for confirmation only when protection is being switched on', () =>
    {
        expect(raidProtectionNeedsConfirmation(base, { ...base, enabled: true })).toBe(true);
        expect(raidProtectionNeedsConfirmation({ ...base, enabled: true }, { ...base, enabled: true, sensitivity: 2 })).toBe(false);
        expect(raidProtectionNeedsConfirmation(base, { ...base, sensitivity: 2 })).toBe(false);
    });

    it('compares the editable fields only', () =>
    {
        expect(raidProtectionMatchesEditable(base, { ...base, roomId: 8 })).toBe(true);
        expect(raidProtectionMatchesEditable(base, { ...base, guardEnabled: true })).toBe(false);
    });

    it('maps save results to their texts', () =>
    {
        expect(raidProtectionSaveResultKey(0)).toBe('raid.protection.settings.save.success');
        expect(raidProtectionSaveResultKey(5)).toBe('raid.protection.settings.save.fail.5');
    });
});
