import { RoomObjectCategory, RoomObjectType } from '@octane/renderer';
import { describe, expect, it } from 'vitest';
import { FurniCategory } from '../../../api/inventory/FurniCategory';
import { collectUseProductBubbles, UseProductCandidate, UseProductUnit } from './avatarInfo.products';

const OWNER = 5;
const PRODUCT_OBJECT = 900;

const pet = (overrides: Partial<UseProductCandidate> = {}): UseProductCandidate => ({
    type: RoomObjectType.PET as unknown as number,
    roomIndex: 3,
    name: 'Rex',
    ownerId: OWNER,
    figure: '1 2 ffffff',
    hasSaddle: false,
    canRevive: false,
    canBreed: false,
    petLevel: 1,
    ...overrides
});

const unit = (roomObjectId: number, userData: UseProductCandidate | null): UseProductUnit => ({ roomObjectId, userData });

const collect = (specialType: number, units: UseProductUnit[], customParams = '1') =>
    collectUseProductBubbles({ customParams, specialType }, OWNER, PRODUCT_OBJECT, units);

describe('collectUseProductBubbles', () => {
    it('offers the product to each of the owner pets of the matching kind', () => {
        const bubbles = collect(0, [unit(11, pet()), unit(12, pet({ roomIndex: 4, name: 'Fido' }))]);

        expect(bubbles).toHaveLength(2);
        expect(bubbles[0]).toMatchObject({
            id: 3,
            category: RoomObjectCategory.UNIT,
            name: 'Rex',
            requestRoomObjectId: PRODUCT_OBJECT,
            targetRoomObjectId: 11,
            requestInventoryStripId: -1,
            replace: false
        });
        expect(bubbles[1]).toMatchObject({ name: 'Fido', targetRoomObjectId: 12 });
    });

    it('skips other owners, other kinds, non-pets and units without data', () => {
        const bubbles = collect(0, [unit(11, pet({ ownerId: 6 })), unit(12, pet({ figure: '2 2 ffffff' })), unit(13, pet({ type: 1 })), unit(14, null)]);

        expect(bubbles).toEqual([]);
    });

    it('marks a saddle as a replacement only for a pet that already has one', () => {
        const bubbles = collect(FurniCategory.PET_SADDLE, [unit(11, pet({ hasSaddle: true })), unit(12, pet())]);

        expect(bubbles.map((bubble) => bubble.replace)).toEqual([true, false]);
    });

    it('applies the monster plant products only at their stage', () => {
        const dead = pet({ canRevive: true, petLevel: 7 });
        const grown = pet({ petLevel: 7 });
        const grownBreedable = pet({ petLevel: 7, canBreed: true });
        const young = pet({ petLevel: 3 });
        const units = [unit(1, dead), unit(2, grown), unit(3, grownBreedable), unit(4, young)];

        expect(collect(FurniCategory.MONSTERPLANT_REVIVAL, units).map((bubble) => bubble.targetRoomObjectId)).toEqual([1]);
        expect(collect(FurniCategory.MONSTERPLANT_REBREED, units).map((bubble) => bubble.targetRoomObjectId)).toEqual([2]);
        expect(collect(FurniCategory.MONSTERPLANT_FERTILIZE, units).map((bubble) => bubble.targetRoomObjectId)).toEqual([4]);
    });

    it('returns null when the product names no pet part, and nothing when the part is not a number', () => {
        expect(collect(0, [unit(11, pet())], '-1')).toBeNull();
        expect(collect(0, [unit(11, pet())], '')).toEqual([]);
    });
});
