import type { DailyTaskData, QuestMessageData, RewardTrackData, RewardTrackPrizeData } from '@octane/renderer';
import { GetConfigurationValue } from '../octane';
import { LocalizeText, localizeWithFallback } from '../utils';

/** The official quest engine texts and image rules (HabboQuestEngine / QuestsList / QuestCompleted). */

export const QUEST_TIMER_IMAGE = 'quest_timer_questionmark';

/** The prompt-animated quests of the official client (their image carries an `_a` suffix). */
export const QUESTS_WITH_PROMPTS = ['MOVEITEM', 'ENTEROTHERSROOM', 'CHANGEFIGURE', 'FINDLIFEGUARDTOWER', 'SCRATCHAPET'];

/** `${image.library.questing.url}` with the generic image library as fallback. */
export const getQuestingImageBaseUrl = (): string => {
    const configured = GetConfigurationValue<string>('image.library.questing.url', '');

    if (configured && configured.length) return configured;

    return `${GetConfigurationValue<string>('image.library.url', '')}questing/`;
};

export const getQuestingImageUrl = (name: string): string => `${getQuestingImageBaseUrl()}${name}.png`;

/** `<campaign>_<code><imageVersion>[_a]`, lower-cased, or the hourglass while the quest waits. */
export const getQuestImageName = (campaignCode: string, localizationCode: string, imageVersion: string, waiting: boolean = false): string => {
    if (waiting) return QUEST_TIMER_IMAGE;

    const prompt = QUESTS_WITH_PROMPTS.includes((localizationCode || '').toUpperCase()) ? '_a' : '';

    return `${campaignCode}_${localizationCode}${imageVersion || ''}${prompt}`.toLowerCase();
};

export const getQuestImageUrl = (quest: QuestMessageData): string =>
    getQuestingImageUrl(getQuestImageName(quest.campaignCode, quest.localizationCode, quest.imageVersion, quest.waitPeriodSeconds > 0));

export const getCampaignImageUrl = (campaignCode: string): string => getQuestingImageUrl(campaignCode);

export const getCampaignLocalizationKey = (campaignCode: string): string => `quests.${campaignCode}`;

export const getCampaignName = (campaignCode: string): string => localizeWithFallback(`${getCampaignLocalizationKey(campaignCode)}.name`, campaignCode);

export const getQuestLocalizationKey = (quest: QuestMessageData): string => `${getCampaignLocalizationKey(quest.campaignCode)}.${quest.localizationCode}`;

export const getQuestName = (quest: QuestMessageData): string => localizeWithFallback(`${getQuestLocalizationKey(quest)}.name`, quest.localizationCode);

export const getQuestDescription = (quest: QuestMessageData): string => localizeWithFallback(`${getQuestLocalizationKey(quest)}.desc`, '');

export const getQuestHint = (quest: QuestMessageData): string => localizeWithFallback(`${getQuestLocalizationKey(quest)}.hint`, '');

export const getQuestCompletedText = (quest: QuestMessageData): string =>
    localizeWithFallback(`${getQuestLocalizationKey(quest)}.completed`, getQuestDescription(quest));

/** The tracker bar: ceil(100 * completed / total), clamped. */
export const getQuestProgressPercent = (completedSteps: number, totalSteps: number): number => {
    if (!totalSteps || totalSteps <= 0) return 0;

    return Math.max(0, Math.min(100, Math.ceil((100 * completedSteps) / totalSteps)));
};

export type CampaignCounterStyle = 'red' | 'blue' | 'green';

/** quest_counterbkg_disabled / _active / _completed of the official campaign block. */
export const getCampaignCounterStyle = (completedQuests: number, completedCampaign: boolean): CampaignCounterStyle => {
    if (completedCampaign) return 'green';

    return completedQuests > 0 ? 'blue' : 'red';
};

/** The official list hides the reward when the type is unknown or the amount is empty. */
export const isQuestRewardVisible = (activityPointType: number, amount: number): boolean => activityPointType >= -1 && amount > 0;

/** activityPointType -1 is credits, every other value is a points type (0 duckets, 5 diamonds). */
export const getActivityPointName = (activityPointType: number): string => {
    if (activityPointType === -1) return localizeWithFallback('quests.currency.credits', 'Credits');

    if (activityPointType === 0) return localizeWithFallback('quests.currency.duckets', 'Duckets');

    if (activityPointType === 5) return localizeWithFallback('quests.currency.diamonds', 'Diamonds');

    return localizeWithFallback(`activitypoint.name.${activityPointType}`, 'Points');
};

/** The currency icon type of `LayoutCurrencyIcon`: credits use -1 in the client sprite set. */
export const getActivityPointIconType = (activityPointType: number): number => activityPointType;

// ---------------------------------------------------------------- daily tasks

export type DailyTaskStyle = 'orange' | 'green' | 'yellow';

/** Orange while in progress, green once claimable or claimed; bonus rows stay yellow. */
export const getDailyTaskStyle = (status: number, isBonus: boolean): DailyTaskStyle => {
    if (isBonus) return 'yellow';

    return status === 0 ? 'orange' : 'green';
};

export const getDailyTaskProgressPercent = (repeats: number, requiredRepeats: number): number => {
    if (!requiredRepeats || requiredRepeats <= 0) return 100;

    return Math.max(0, Math.min(100, Math.floor((repeats / requiredRepeats) * 100)));
};

export const getDailyTaskImageUrl = (task: DailyTaskData): string => {
    const configured = GetConfigurationValue<string>('image.library.dailytasks.url', '');
    const base = configured && configured.length ? configured : `${GetConfigurationValue<string>('image.library.url', '')}dailytasks/`;

    return `${base}${task.taskCode}${task.imageVersion || ''}.png`;
};

/** Bonus tasks go last, the official controller order. */
export const sortDailyTasks = (tasks: DailyTaskData[]): DailyTaskData[] => [...tasks.filter((task) => !task.isBonus), ...tasks.filter((task) => task.isBonus)];

export const getDailyTasksWindowCaption = (maxSecondsLeft: number): string => {
    const title = localizeWithFallback('dailytasks.title', 'Daily rewards');

    if (maxSecondsLeft <= 0) return title;

    const refresh = localizeWithFallback('dailytasks.refreshes', 'Refresh in %time%', ['time'], [formatFriendlySeconds(maxSecondsLeft)]);

    return `${title} - ${refresh}`;
};

/** "2h 5m" style countdowns; the official client uses FriendlyTime, this keeps it self-contained. */
export const formatFriendlySeconds = (seconds: number): string => {
    const total = Math.max(0, Math.floor(seconds));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;

    if (days > 0) return `${days}d ${hours}h`;

    if (hours > 0) return `${hours}h ${minutes}m`;

    if (minutes > 0) return `${minutes}m ${secs}s`;

    return `${secs}s`;
};

// ---------------------------------------------------------------- reward track

export type RewardTrackPrizeState = 'claimed' | 'premium_locked' | 'not_enough_points' | 'claimable';

/** The four tooltip states of RewardTrackPrizeView.refreshState(). */
export const getRewardTrackPrizeState = (prize: RewardTrackPrizeData, track: RewardTrackData): RewardTrackPrizeState => {
    if (prize.claimed) return 'claimed';

    if (prize.isPremiumLocked(track)) return 'premium_locked';

    if (!prize.hasEnoughPoints(track)) return 'not_enough_points';

    return 'claimable';
};

export const getRewardTrackPrizeTooltip = (state: RewardTrackPrizeState): string => {
    switch (state) {
        case 'claimed':
            return localizeWithFallback('reward_track.rewards.reward_tooltip.claimed', 'Already claimed');
        case 'premium_locked':
            return localizeWithFallback('reward_track.rewards.reward_tooltip.premium', 'Premium reward - upgrade to claim it');
        case 'not_enough_points':
            return localizeWithFallback('reward_track.rewards.reward_tooltip.not_enough_points', 'Collect more points to claim this reward');
        default:
            return localizeWithFallback('reward_track.rewards.reward_tooltip.claim', 'Click to claim');
    }
};

export interface RewardTrackTheme {
    dark: string;
    medium: string;
    light: string;
    active: string;
}

/** RewardTrackTheme.resolve(): five recolour themes, blue is the fallback. */
export const REWARD_TRACK_THEMES: Record<string, RewardTrackTheme> = {
    blue: { dark: '#3577B9', medium: '#CFE2F9', light: '#DDEBF9', active: '#BDD6EF' },
    orange: { dark: '#C97C98', medium: '#FFE1B2', light: '#FFF1D6', active: '#FFD1D1' },
    forest_green: { dark: '#3F8B45', medium: '#CDE0CB', light: '#E1F0DF', active: '#B8E0B6' },
    red: { dark: '#B84A4B', medium: '#F1D9CC', light: '#F8E8DD', active: '#E7B0B8' },
    cyan: { dark: '#1F9BF3', medium: '#C7F1B5', light: '#DCF3BB', active: '#B5E9B1' }
};

export const resolveRewardTrackTheme = (theme: string): RewardTrackTheme => REWARD_TRACK_THEMES[theme] ?? REWARD_TRACK_THEMES.blue;

/** The 30 official task icons are `reward_track_tasks_<actionType>`; the icon set is served as a sprite class. */
export const getRewardTrackTaskIconClass = (actionType: string): string => `reward-track-task-icon reward-track-task-icon-${(actionType || '').toLowerCase()}`;

export const getRewardTrackText = (trackId: string, suffix: string, fallback: string): string =>
    localizeWithFallback(`reward_track.${trackId}.${suffix}`, fallback);

export const getRewardTrackTaskText = (trackId: string, taskId: string, suffix: string, fallback: string): string =>
    localizeWithFallback(`reward_track.${trackId}.task.${taskId}.${suffix}`, fallback);

export type RewardTrackTaskFilter = 'all' | 'in_progress' | 'completed';

export const filterRewardTrackTasks = <T extends { hasProgress: boolean; isComplete: boolean }>(tasks: T[], filter: RewardTrackTaskFilter): T[] => {
    switch (filter) {
        case 'in_progress':
            return tasks.filter((task) => task.hasProgress && !task.isComplete);
        case 'completed':
            return tasks.filter((task) => task.isComplete);
        default:
            return tasks;
    }
};

/** The prizes of one page of the track, per tier; the official layout paginates by points span. */
export const paginatePrizes = <T extends { requiredPoints: number }>(prizes: T[], perPage: number): T[][] => {
    const ordered = [...prizes].sort((a, b) => a.requiredPoints - b.requiredPoints);
    const pages: T[][] = [];

    for (let i = 0; i < ordered.length; i += Math.max(1, perPage)) pages.push(ordered.slice(i, i + Math.max(1, perPage)));

    return pages.length ? pages : [[]];
};

/** The premium confirmation shows the boost as a percentage: round((boost - 1) * 100). */
export const getPremiumBoostPercent = (taskPointsBoost: number): number => Math.round((taskPointsBoost - 1) * 100);

/** The official client localizes non-zero result codes as `<prefix><code>`. */
export const getRewardTrackResultText = (prefix: string, resultCode: number, fallback: string): string => {
    if (resultCode === 0) return localizeWithFallback(`${prefix}success`, fallback);

    return localizeWithFallback(`${prefix}fail.${resultCode}`, LocalizeText(`${prefix}fail.${resultCode}`) || fallback);
};
