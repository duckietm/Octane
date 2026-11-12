/**
 * The crafting table's free mixer, as the official widget runs it: the player lays up to ten furni from their
 * inventory in the mixer, the server says how many secret recipes that content fits, and a content that is a whole
 * recipe can be crafted.
 */
export const MIXER_CAPACITY = 10;

export interface CraftingMixerItem {
    /** The furni's class name, as the ingredient list names it. */
    name: string;
    /** The inventory furni laid in the mixer. */
    inventoryId: number;
    iconUrl: string;
}

/**
 * What the server's answer means (official CraftingInfoController.craftingSecretRecipesAvailable):
 * - `hit`: the content is a whole recipe and fits no other;
 * - `hitPlusOthers`: a whole recipe, and `count` more recipes start with it;
 * - `others`: no whole recipe yet, `count` recipes start with it;
 * - `nohit`: nothing can be made from it.
 */
export type CraftingMixerVerdict = 'hit' | 'hitPlusOthers' | 'others' | 'nohit';

export const craftingMixerVerdict = (count: number, recipeComplete: boolean): CraftingMixerVerdict => {
    if (recipeComplete) return count === 0 ? 'hit' : 'hitPlusOthers';

    return count > 0 ? 'others' : 'nohit';
};

/** Only a whole recipe can be crafted. */
export const canCraftMixerVerdict = (verdict: CraftingMixerVerdict | null) => verdict === 'hit' || verdict === 'hitPlusOthers';

/** The next inventory furni of a kind that is not in the mixer yet, or null when all are (or the mixer is full). */
export const pickMixerInventoryId = (inventoryIds: readonly number[], mixer: readonly CraftingMixerItem[]): number | null => {
    if (mixer.length >= MIXER_CAPACITY) return null;

    const used = new Set(mixer.map((item) => item.inventoryId));

    for (const id of inventoryIds) {
        if (!used.has(id)) return id;
    }

    return null;
};

/** How many furni of a kind are in the mixer: they no longer count as available in the inventory list. */
export const countInMixer = (name: string, mixer: readonly CraftingMixerItem[]) => mixer.reduce((total, item) => total + (item.name === name ? 1 : 0), 0);
