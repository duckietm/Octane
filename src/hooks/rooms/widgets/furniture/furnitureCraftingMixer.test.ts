import { describe, expect, it } from 'vitest';
import { canCraftMixerVerdict, countInMixer, CraftingMixerItem, craftingMixerVerdict, MIXER_CAPACITY, pickMixerInventoryId } from './furnitureCraftingMixer';

const item = (name: string, inventoryId: number): CraftingMixerItem => ({ name, inventoryId, iconUrl: '' });

describe('crafting free mixer', () => {
    it('reads the server answer as the official widget does', () => {
        expect(craftingMixerVerdict(0, true)).toBe('hit');
        expect(craftingMixerVerdict(2, true)).toBe('hitPlusOthers');
        expect(craftingMixerVerdict(3, false)).toBe('others');
        expect(craftingMixerVerdict(0, false)).toBe('nohit');
    });

    it('crafts only a whole recipe', () => {
        expect(canCraftMixerVerdict('hit')).toBe(true);
        expect(canCraftMixerVerdict('hitPlusOthers')).toBe(true);
        expect(canCraftMixerVerdict('others')).toBe(false);
        expect(canCraftMixerVerdict('nohit')).toBe(false);
        expect(canCraftMixerVerdict(null)).toBe(false);
    });

    it('takes the next furni of a kind that is not in the mixer yet', () => {
        expect(pickMixerInventoryId([5, 6, 7], [])).toBe(5);
        expect(pickMixerInventoryId([5, 6, 7], [item('a', 5), item('a', 6)])).toBe(7);
        expect(pickMixerInventoryId([5], [item('a', 5)])).toBeNull();
        expect(pickMixerInventoryId([], [])).toBeNull();
    });

    it('holds at most ten furni', () => {
        const full = Array.from({ length: MIXER_CAPACITY }, (_, index) => item('a', index + 1));

        expect(pickMixerInventoryId([99], full)).toBeNull();
    });

    it('counts what lies in the mixer per kind', () => {
        const mixer = [item('a', 1), item('b', 2), item('a', 3)];

        expect(countInMixer('a', mixer)).toBe(2);
        expect(countInMixer('c', mixer)).toBe(0);
    });
});
