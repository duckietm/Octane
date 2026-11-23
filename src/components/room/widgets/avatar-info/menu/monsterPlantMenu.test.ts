import { describe, expect, it } from 'vitest';
import { monsterPlantMenu } from './monsterPlantMenu';

const plant = { dead: false, energy: 50, maximumEnergy: 100, level: 3, maximumLevel: 7, breedable: false };

describe('monsterPlantMenu', () => {
    it('lists Treat for a living plant and turns it off when nearly full', () => {
        expect(monsterPlantMenu(plant, true, true)).toEqual({ revive: false, compost: false, treat: true, treatEnabled: true, breeding: false });
        expect(monsterPlantMenu({ ...plant, energy: 98 }, true, true)).toMatchObject({ treat: true, treatEnabled: false });
    });

    it('offers revive for a dead plant, and compost to the room owner where composting is on', () => {
        expect(monsterPlantMenu({ ...plant, dead: true }, true, true)).toEqual({ revive: true, compost: true, treat: false, treatEnabled: false, breeding: false });
        expect(monsterPlantMenu({ ...plant, dead: true }, false, true).compost).toBe(false);
        expect(monsterPlantMenu({ ...plant, dead: true }, true, false).compost).toBe(false);
    });

    it('offers breeding for a fully grown breedable plant', () => {
        expect(monsterPlantMenu({ ...plant, level: 7, breedable: true }, false, true).breeding).toBe(true);
        expect(monsterPlantMenu({ ...plant, level: 7 }, false, true).breeding).toBe(false);
    });
});
