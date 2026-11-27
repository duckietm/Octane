import { describe, expect, it } from 'vitest';
import { handheldVolterSize } from './handheldTextSize';

describe('handheldVolterSize', () => {
    it('draws small Volter text at its larger pixel size', () => {
        expect(handheldVolterSize('Volter, sans-serif', 9)).toBe(11);
        expect(handheldVolterSize('"Volter Bold"', 8)).toBe(10);
        expect(handheldVolterSize("'volter'", 7)).toBe(9);
    });

    it('leaves other faces and text that is large enough alone', () => {
        expect(handheldVolterSize('HabboAirUbuntu, sans-serif', 9)).toBeNull();
        expect(handheldVolterSize('Volter', 11)).toBeNull();
        expect(handheldVolterSize('Volter', Number.NaN)).toBeNull();
        expect(handheldVolterSize('', 9)).toBeNull();
    });
});
