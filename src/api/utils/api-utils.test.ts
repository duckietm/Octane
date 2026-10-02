import { describe, expect, it } from 'vitest';
import { GetWiredTimeLocale } from '../wired/GetWiredTimeLocale';
import { WiredDateToString } from '../wired/WiredDateToString';
import { CloneObject } from './CloneObject';
import { ConvertSeconds } from './ConvertSeconds';
import { LocalizeShortNumber } from './LocalizeShortNumber';

describe('ConvertSeconds', () => {
    it('formats zero seconds as the dd:hh:mm:ss zero string', () => {
        expect(ConvertSeconds(0)).toBe('00:00:00:00');
    });

    it('formats one minute correctly', () => {
        expect(ConvertSeconds(60)).toBe('00:00:01:00');
    });

    it('formats one hour correctly', () => {
        expect(ConvertSeconds(3600)).toBe('00:01:00:00');
    });

    it('formats one day correctly', () => {
        expect(ConvertSeconds(86400)).toBe('01:00:00:00');
    });

    it('formats a mixed value (1d 2h 3m 4s)', () => {
        expect(ConvertSeconds(86400 + 2 * 3600 + 3 * 60 + 4)).toBe('01:02:03:04');
    });

    it('pads single-digit components with a leading zero', () => {
        expect(ConvertSeconds(9)).toBe('00:00:00:09');
    });
});

describe('LocalizeShortNumber', () => {
    it('returns "0" for zero, null, undefined, and NaN', () => {
        expect(LocalizeShortNumber(0)).toBe('0');
        expect(LocalizeShortNumber(NaN)).toBe('0');
        expect(LocalizeShortNumber(null)).toBe('0');
        expect(LocalizeShortNumber(undefined as unknown as number)).toBe('0');
    });

    it('keeps numbers safely under 1000 unchanged (returns as-is)', () => {
        expect(LocalizeShortNumber(42)).toBe('42');
        // Anything that rounds to >= 1.0K (i.e. >= 950) crosses into the K bucket
        expect(LocalizeShortNumber(949)).toBe('949');
    });

    it('rounds 950..999 up into the K bucket (documented quirk)', () => {
        expect(LocalizeShortNumber(950)).toBe('1K');
        expect(LocalizeShortNumber(999)).toBe('1K');
    });

    it('uses K for thousands', () => {
        expect(LocalizeShortNumber(1500)).toBe('1.5K');
        expect(LocalizeShortNumber(12_345)).toBe('12.3K');
    });

    it('uses M for millions', () => {
        expect(LocalizeShortNumber(2_500_000)).toBe('2.5M');
    });

    it('uses B for billions', () => {
        expect(LocalizeShortNumber(3_700_000_000)).toBe('3.7B');
    });

    it('preserves the sign for negative values', () => {
        expect(LocalizeShortNumber(-1500)).toBe('-1.5K');
        expect(LocalizeShortNumber(-2_500_000)).toBe('-2.5M');
    });
});

describe('CloneObject', () => {
    it('returns primitives unchanged', () => {
        expect(CloneObject(42)).toBe(42);
        expect(CloneObject('hello')).toBe('hello');
        expect(CloneObject(null)).toBe(null);
        expect(CloneObject(undefined)).toBe(undefined);
    });

    it('returns a new object instance for object inputs', () => {
        const original = { a: 1, b: 'two' };
        const copy = CloneObject(original);

        expect(copy).not.toBe(original);
        expect(copy).toEqual(original);
    });

    it('preserves enumerable own keys', () => {
        const original = { x: 1, y: 2, z: 3 };
        const copy = CloneObject(original);

        expect(copy.x).toBe(1);
        expect(copy.y).toBe(2);
        expect(copy.z).toBe(3);
    });
});

describe('GetWiredTimeLocale', () => {
    // The renderer encodes time as `value = seconds * 2` so even values
    // are whole seconds, odd values are half-seconds.

    it('returns "0" for value 0', () => {
        expect(GetWiredTimeLocale(0)).toBe('0');
    });

    it('returns whole seconds for even values', () => {
        expect(GetWiredTimeLocale(2)).toBe('1');
        expect(GetWiredTimeLocale(10)).toBe('5');
        expect(GetWiredTimeLocale(60)).toBe('30');
    });

    it('returns half-second formatting for odd values', () => {
        expect(GetWiredTimeLocale(1)).toBe('0.5');
        expect(GetWiredTimeLocale(3)).toBe('1.5');
        expect(GetWiredTimeLocale(11)).toBe('5.5');
    });
});

describe('WiredDateToString', () => {
    it('zero-pads single-digit month / day / hour / minute', () => {
        const d = new Date(2024, 0, 5, 7, 9); // Jan 5, 2024, 07:09
        expect(WiredDateToString(d)).toBe('2024/01/05 07:09');
    });

    it('formats two-digit values without extra padding', () => {
        const d = new Date(2024, 11, 31, 23, 59); // Dec 31, 2024, 23:59
        expect(WiredDateToString(d)).toBe('2024/12/31 23:59');
    });
});
