import { IFigurePartSet } from '@octane/renderer';
import { describe, expect, it } from 'vitest';
import { IsNftAvatarPartSet } from './IsNftAvatarPartSet';

const makePartSet = (id: number, isSellable: boolean): IFigurePartSet => ({ id, isSellable }) as unknown as IFigurePartSet;

describe('IsNftAvatarPartSet', () => {
    it('returns false for a missing part set', () => {
        expect(IsNftAvatarPartSet(null, new Set([1]), () => true)).toBe(false);
    });

    it('uses the server-sent id map exclusively when present', () => {
        const knownIds = new Set([10]);

        expect(IsNftAvatarPartSet(makePartSet(10, false), knownIds, () => false)).toBe(true);
        expect(IsNftAvatarPartSet(makePartSet(11, true), knownIds, () => true)).toBe(false);
    });

    it('falls back to asset detection when no id map was sent', () => {
        expect(IsNftAvatarPartSet(makePartSet(10, true), new Set(), () => true)).toBe(true);
        expect(IsNftAvatarPartSet(makePartSet(10, true), new Set(), () => false)).toBe(false);
    });

    it('does not require the sellable flag (custom figuredata often omits it)', () => {
        expect(IsNftAvatarPartSet(makePartSet(10, false), new Set(), () => true)).toBe(true);
    });
});
