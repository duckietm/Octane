import { localizeWithFallback } from '../utils/localizeWithFallback';
/**
 * The staff editor's input rules, the same the emulator applies (RewardTrackAdmin.java), so a form can
 * point at the field before the round trip. The server stays the judge.
 */

export const REWARD_TRACK_ID_MAX_LENGTH = 64;
export const REWARD_TRACK_TEXT_MAX_LENGTH = 255;
export const REWARD_TRACK_MAX_LEVELS = 50;
export const REWARD_TRACK_MAX_BOOST_PERCENT = 1000;
export const REWARD_TRACK_MAX_AMOUNT = 1_000_000;
export const REWARD_TRACK_MAX_FURNI_PER_PRIZE = 10;

const ID_PATTERN = /^[A-Za-z0-9_.-]+$/;

export type RewardTrackFieldErrors = Record<string, string>;

export interface RewardTrackRuleTrack {
    id: string;
    theme: string;
    startsAt: number;
    endsAt: number;
    hasPremium: boolean;
    premiumBoostPercent: number;
    premiumInstantPoints: number;
    premiumCostDiamonds: number;
    premiumCostCredits: number;
}

export interface RewardTrackRuleTask {
    id: string;
    actionType: string;
    parameter: string;
    levels: { requiredCount: number; pointsReward: number }[];
}

export interface RewardTrackRulePrize {
    id: string;
    requiredPoints: number;
    productItemTypeId: number;
    rewardType: string;
    extraParams: string;
    rewardAmount: number;
}

const idProblem = (id: string): string | null => {
    if (!id || !id.trim()) return 'Required';
    if (id.length > REWARD_TRACK_ID_MAX_LENGTH) return localizeWithFallback('octane.quests.up_to_reward_track_id_max', 'Up to %reward_track_id_max_length% characters', ['reward_track_id_max_length'], [String(REWARD_TRACK_ID_MAX_LENGTH)]);
    if (!ID_PATTERN.test(id)) return localizeWithFallback('octane.quests.letters_digits_and_only', 'Letters, digits, \'_\', \'-\' and \'.\' only');

    return null;
};

export const validateRewardTrackInput = (input: RewardTrackRuleTrack): RewardTrackFieldErrors => {
    const errors: RewardTrackFieldErrors = {};
    const id = idProblem(input.id);

    if (id) errors.id = id;
    if (!input.theme || !input.theme.trim()) errors.theme = 'Required';
    else if (input.theme.length > REWARD_TRACK_ID_MAX_LENGTH) errors.theme = localizeWithFallback('octane.quests.up_to_reward_track_id_max', 'Up to %reward_track_id_max_length% characters', ['reward_track_id_max_length'], [String(REWARD_TRACK_ID_MAX_LENGTH)]);
    if (input.startsAt > 0 && input.endsAt > 0 && input.endsAt <= input.startsAt) errors.endsAt = localizeWithFallback('octane.quests.must_come_after_the_start', 'Must come after the start');

    if (input.hasPremium) {
        if (input.premiumBoostPercent < 0 || input.premiumBoostPercent > REWARD_TRACK_MAX_BOOST_PERCENT) errors.premiumBoostPercent = `0 to ${REWARD_TRACK_MAX_BOOST_PERCENT}% (10x)`;
        if (input.premiumInstantPoints < 0 || input.premiumInstantPoints > REWARD_TRACK_MAX_AMOUNT) errors.premiumInstantPoints = `0 to ${REWARD_TRACK_MAX_AMOUNT}`;
        if (input.premiumCostDiamonds < 0 || input.premiumCostDiamonds > REWARD_TRACK_MAX_AMOUNT) errors.premiumCostDiamonds = `0 to ${REWARD_TRACK_MAX_AMOUNT}`;
        if (input.premiumCostCredits < 0 || input.premiumCostCredits > REWARD_TRACK_MAX_AMOUNT) errors.premiumCostCredits = `0 to ${REWARD_TRACK_MAX_AMOUNT}`;
    }

    return errors;
};

export const validateRewardTrackTaskInput = (input: RewardTrackRuleTask, actionTypes: string[]): RewardTrackFieldErrors => {
    const errors: RewardTrackFieldErrors = {};
    const id = idProblem(input.id);

    if (id) errors.id = id;
    if (actionTypes.length && !actionTypes.includes(input.actionType)) errors.actionType = localizeWithFallback('octane.quests.pick_an_action', 'Pick an action');
    if (input.parameter && input.parameter.length > REWARD_TRACK_TEXT_MAX_LENGTH) errors.parameter = localizeWithFallback('octane.quests.up_to_reward_track_text_max', 'Up to %reward_track_text_max_length% characters', ['reward_track_text_max_length'], [String(REWARD_TRACK_TEXT_MAX_LENGTH)]);

    if (!input.levels.length) errors.levels = localizeWithFallback('octane.quests.at_least_one_level', 'At least one level');
    else if (input.levels.length > REWARD_TRACK_MAX_LEVELS) errors.levels = localizeWithFallback('octane.quests.up_to_reward_track_max_levels', 'Up to %reward_track_max_levels% levels', ['reward_track_max_levels'], [String(REWARD_TRACK_MAX_LEVELS)]);
    else {
        let previous = 0;

        input.levels.forEach((level, index) => {
            if (level.requiredCount <= previous) errors[`level.${index}.requiredCount`] = index === 0 ? localizeWithFallback('octane.quests.at_least_1', 'At least 1') : localizeWithFallback('octane.quests.more_than_the_level_before', 'More than the level before');
            if (level.pointsReward < 0 || level.pointsReward > REWARD_TRACK_MAX_AMOUNT) errors[`level.${index}.pointsReward`] = `0 to ${REWARD_TRACK_MAX_AMOUNT}`;
            previous = level.requiredCount;
        });
    }

    return errors;
};

export const validateRewardTrackPrizeInput = (input: RewardTrackRulePrize, rewardTypes: string[]): RewardTrackFieldErrors => {
    const errors: RewardTrackFieldErrors = {};
    const id = idProblem(input.id);
    const type = (input.rewardType || '').trim().toLowerCase();

    if (id) errors.id = id;
    if (input.requiredPoints < 0 || input.requiredPoints > REWARD_TRACK_MAX_AMOUNT) errors.requiredPoints = `0 to ${REWARD_TRACK_MAX_AMOUNT}`;
    if (input.productItemTypeId < 0 || input.productItemTypeId > 32767) errors.productItemTypeId = '0 to 32767';
    if (rewardTypes.length && !rewardTypes.includes(type)) errors.rewardType = localizeWithFallback('octane.quests.pick_a_reward_type', 'Pick a reward type');

    if (type === 'badge' && !input.extraParams.trim()) errors.extraParams = localizeWithFallback('octane.quests.the_badge_code', 'The badge code');
    if (type === 'furni') {
        if (!input.extraParams.trim()) errors.extraParams = localizeWithFallback('octane.quests.the_furni_name_items_base_item', 'The furni name (items_base.item_name)');
        if (input.rewardAmount < 1 || input.rewardAmount > REWARD_TRACK_MAX_FURNI_PER_PRIZE) errors.rewardAmount = `1 to ${REWARD_TRACK_MAX_FURNI_PER_PRIZE} copies`;
    } else if (input.rewardAmount < 0 || input.rewardAmount > REWARD_TRACK_MAX_AMOUNT) errors.rewardAmount = `0 to ${REWARD_TRACK_MAX_AMOUNT}`;

    if (input.extraParams.length > REWARD_TRACK_TEXT_MAX_LENGTH) errors.extraParams = localizeWithFallback('octane.quests.up_to_reward_track_text_max', 'Up to %reward_track_text_max_length% characters', ['reward_track_text_max_length'], [String(REWARD_TRACK_TEXT_MAX_LENGTH)]);

    return errors;
};

/** Renumbers a list after moving one entry, returning the entries whose sort order changed. */
export const reorderRewardTrackEntries = <T extends { id: string; sortOrder: number }>(entries: T[], fromIndex: number, toIndex: number): T[] => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= entries.length || toIndex >= entries.length) return [];

    const moved = [...entries];
    const [entry] = moved.splice(fromIndex, 1);

    moved.splice(toIndex, 0, entry);

    return moved.map((item, index) => ({ ...item, sortOrder: index + 1 })).filter((item) => item.sortOrder !== entries.find((original) => original.id === item.id)?.sortOrder);
};
