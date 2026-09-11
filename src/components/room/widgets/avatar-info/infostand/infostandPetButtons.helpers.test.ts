import { describe, expect, it } from 'vitest';
import { getPetButtons } from './infostandPetButtons.helpers';

describe('getPetButtons', () => {
    it('lets the owner pick up, move and never kick the own pet', () => {
        expect(getPetButtons({ isOwner: true, canRemovePet: true, isMonsterplant: false })).toEqual({ pickUp: true, kick: false, move: true, rotate: false });
    });

    it('lets a room controller kick and move somebody else\'s pet', () => {
        expect(getPetButtons({ isOwner: false, canRemovePet: true, isMonsterplant: false })).toEqual({ pickUp: false, kick: true, move: true, rotate: false });
    });

    it('offers nothing to a guest', () => {
        expect(getPetButtons({ isOwner: false, canRemovePet: false, isMonsterplant: false })).toEqual({ pickUp: false, kick: false, move: false, rotate: false });
    });

    it('offers pick up, move and rotate for a monsterplant the viewer may remove', () => {
        expect(getPetButtons({ isOwner: false, canRemovePet: true, isMonsterplant: true })).toEqual({ pickUp: true, kick: false, move: true, rotate: true });
    });
});
