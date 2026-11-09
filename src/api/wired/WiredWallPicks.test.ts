import { RoomObjectCategory } from '@octane/renderer';
import { describe, expect, it } from 'vitest';
import { wiredPickIdOf, wiredPickIndexOf, withoutWallPick } from './WiredWallPicks';

describe('wired wall picks', () => {
    it('picks a wall item as its negative id and a floor item as its id', () => {
        expect(wiredPickIdOf(42, RoomObjectCategory.WALL)).toBe(-42);
        expect(wiredPickIdOf(42, RoomObjectCategory.FLOOR)).toBe(42);
    });

    it('finds a wall pick in AIR form and in the form boxes stored before', () => {
        expect(wiredPickIndexOf([7, -42], 42, RoomObjectCategory.WALL)).toBe(1);
        expect(wiredPickIndexOf([7, 42], 42, RoomObjectCategory.WALL)).toBe(1);
        expect(wiredPickIndexOf([7, -42], 42, RoomObjectCategory.FLOOR)).toBe(-1);
        expect(wiredPickIndexOf([7], 42, RoomObjectCategory.WALL)).toBe(-1);
    });

    it('drops a removed wall item in either form', () => {
        expect(withoutWallPick([7, -42, 42, 9], 42)).toEqual([7, 9]);
        expect(withoutWallPick([7, 9], 42)).toEqual([7, 9]);
    });
});
