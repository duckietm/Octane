import type { Triggerable } from '@octane/renderer';

/**
 * Merged selections ([furni index, user index]) that an inline section of the card claims, per card kind and code.
 * The official editor draws a claimed source inside the card body, so it never counts towards the advanced section
 * (UserDefinedRoomEventsCtrl.findInputSourceClaimOwner).
 */
const INLINE_MERGED_SELECTIONS: Record<string, Record<number, Array<[number, number]>>> = {
    // Give / change variable [1,1], chest rewards [1,1], init transaction [2,1], progress achievement [0,1], place furni [2,1],
    // progress reward track [0,1], and the twelve dataframe rows of the link dataframe sender [i+1,i].
    action: {
        39: [[1, 1]], 41: [[1, 1]], 45: [[1, 1]], 46: [[1, 1]], 47: [[2, 1]], 51: [[0, 1]], 55: [[2, 1]], 58: [[0, 1]],
        64: Array.from({ length: 12 }, (_, index): [number, number] => [index + 1, index])
    },
    // Variable value / age [1,1], chest has amount [1,0], chest has item type [2,0].
    condition: { 42: [[1, 1]], 43: [[1, 1]], 45: [[1, 0]], 46: [[2, 0]] },
    // Selectors with variable [0,0].
    selector: { 17: [[0, 0]], 18: [[0, 0]] },
    // Selector / variable filters [0,0], custom contract [2,0] and [3,1], projectile [1,0] and [2,2], movement curve [0,0],
    // leaderboard [0,0].
    extra: { 10: [[0, 0]], 11: [[0, 0]], 12: [[0, 0]], 13: [[0, 0]], 20: [[2, 0], [3, 1]], 21: [[1, 0], [2, 2]], 22: [[0, 0]], 1005: [[0, 0]] }
};

const differs = (values: number[], defaults: number[], skip: Set<number>) =>
    defaults.some((value, index) => !skip.has(index) && index < values.length && values[index] !== value);

/**
 * Official UserDefinedRoomEventsCtrl.isUsingAdvancedSettings: a source of the advanced section that differs from the
 * server default for its index, or a condition quantifier other than 0. The editor then opens with the section expanded.
 */
export const isUsingAdvancedSettings = (trigger: Triggerable | null, wiredType: string): boolean => {
    const conf = trigger?.inputSourcesConf;

    if (!trigger?.advancedMode || !conf) return false;

    const inline = INLINE_MERGED_SELECTIONS[wiredType]?.[trigger.code] ?? [];
    const furniSkip = new Set(inline.map(([furni]) => furni));
    const userSkip = new Set(inline.map(([, user]) => user));

    if (differs(trigger.furniSourceTypes ?? [], conf.furniDefaults ?? [], furniSkip)) return true;
    if (differs(trigger.userSourceTypes ?? [], conf.userDefaults ?? [], userSkip)) return true;

    return wiredType === 'condition' && !!trigger.quantifierType && (trigger.quantifierCode ?? 0) !== 0;
};

/**
 * A condition saved on "any": its quantifier sits in the advanced section, so the editor opens with it expanded, as
 * the official one does for a quantifier other than 0. Our editor always draws that section, so this does not wait
 * for the definition's advanced mode the way the source rule above does.
 */
export const opensOnConditionQuantifier = (trigger: Triggerable | null, wiredType: string): boolean =>
    wiredType === 'condition' && !!trigger?.quantifierType && (trigger.quantifierCode ?? 0) !== 0;

/**
 * The elements whose official advancedAlwaysVisible() returns true, by holder and code (AIR roomevents/wired_setup:
 * StuffTypeMatches, input source quantity, HasVariable, VariableValue, VariableAge, ChestHasAmount and its item-type
 * child; ReceiveLinkMessage; CarryUsers, VariablePlaceholderAddon, the chest item type scanner and the furni name
 * placeholder; furni to furni, furni to user, GiveVariable, RemoveVariable, ChangeVariable, user to furni, the chest
 * rewards, initiate transaction, remove furni, MoveAsGroup, the reward track actions, furni transparency and
 * highlight; InNeighborhood and its furni / users children). Their advanced section is always open, with no toggle.
 */
const ADVANCED_ALWAYS_VISIBLE: Partial<Record<string, ReadonlySet<number>>> = {
    trigger: new Set([29]),
    condition: new Set([8, 38, 40, 42, 43, 45, 46]),
    action: new Set([34, 35, 39, 40, 41, 43, 45, 46, 47, 56, 57, 58, 59, 61, 62]),
    addon: new Set([8, 15, 18, 19]),
    selector: new Set([6, 12])
};

/** Official advancedAlwaysVisible(): the element's advanced section opens expanded and cannot be folded. */
export const isAdvancedAlwaysVisible = (holder: string | null, code: number): boolean => !!holder && !!ADVANCED_ALWAYS_VISIBLE[holder]?.has(code);
