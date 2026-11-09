import { describe, expect, it } from 'vitest';
import { buildHousekeepingAlertRecipient, formatHousekeepingCountdown, housekeepingTempRankSeconds } from './HousekeepingHotelTools';

describe('buildHousekeepingAlertRecipient', () => {
    it('sends nothing for the whole hotel, so an older server still broadcasts', () => {
        expect(buildHousekeepingAlertRecipient('hotel', 'ignored')).toBeUndefined();
    });

    it('names the user or the room', () => {
        expect(buildHousekeepingAlertRecipient('staff', '')).toBe('staff');
        expect(buildHousekeepingAlertRecipient('user', ' Frank ')).toBe('user:Frank');
        expect(buildHousekeepingAlertRecipient('room', ' 42 ')).toBe('room:42');
    });

    it('has no recipient until a user or a valid room id is given', () => {
        expect(buildHousekeepingAlertRecipient('user', '  ')).toBeNull();
        expect(buildHousekeepingAlertRecipient('room', 'lobby')).toBeNull();
        expect(buildHousekeepingAlertRecipient('room', '0')).toBeNull();
        expect(buildHousekeepingAlertRecipient('room', '4.5')).toBeNull();
    });
});

describe('formatHousekeepingCountdown', () => {
    it('reads minutes and seconds, with hours from an hour up', () => {
        expect(formatHousekeepingCountdown(0)).toBe('0:00');
        expect(formatHousekeepingCountdown(65)).toBe('1:05');
        expect(formatHousekeepingCountdown(600)).toBe('10:00');
        expect(formatHousekeepingCountdown(3725)).toBe('1:02:05');
    });

    it('never goes below zero', () => {
        expect(formatHousekeepingCountdown(-30)).toBe('0:00');
    });
});

describe('housekeepingTempRankSeconds', () => {
    it('turns days into seconds within a year', () => {
        expect(housekeepingTempRankSeconds(1)).toBe(86_400);
        expect(housekeepingTempRankSeconds(365)).toBe(365 * 86_400);
    });

    it('reads anything else as a lasting rank', () => {
        expect(housekeepingTempRankSeconds(0)).toBe(0);
        expect(housekeepingTempRankSeconds(366)).toBe(0);
        expect(housekeepingTempRankSeconds(1.5)).toBe(0);
    });
});
