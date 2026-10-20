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

export const getQuestImageUrl = (quest: QuestMessageData, waiting: boolean = quest.waitPeriodSeconds > 0): string =>
    getQuestingImageUrl(getQuestImageName(quest.campaignCode, quest.localizationCode, quest.imageVersion, waiting));

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

// ---------------------------------------------------------------- next quest timer

/** NextQuestTimer.REFRESH_PERIOD_IN_MSECS: the countdown is redrawn once a second. */
export const NEXT_QUEST_TIMER_REFRESH_MS = 1000;

const FRIENDLY_TIME_UNITS: { name: string; seconds: number; fallback: string }[] = [
    { name: 'years', seconds: 365 * 86400, fallback: '%amount% years' },
    { name: 'months', seconds: 30 * 86400, fallback: '%amount% months' },
    { name: 'days', seconds: 86400, fallback: '%amount% days' },
    { name: 'hours', seconds: 3600, fallback: '%amount% hours' },
    { name: 'minutes', seconds: 60, fallback: '%amount% min' }
];

/**
 * FriendlyTime.getFriendlyTime of the official client: the largest unit the time exceeds three
 * times, rounded, as `friendlytime.<unit>` with `%amount%`.
 */
export const getFriendlyTimeParts = (seconds: number, threshold: number = 3): { key: string; amount: number; fallback: string } => {
    for (const unit of FRIENDLY_TIME_UNITS) {
        if (seconds > threshold * unit.seconds) return { key: `friendlytime.${unit.name}`, amount: Math.round(seconds / unit.seconds), fallback: unit.fallback };
    }

    return { key: 'friendlytime.seconds', amount: Math.round(seconds), fallback: '%amount% sec' };
};

export const formatQuestWaitTime = (seconds: number): string => {
    const { key, amount, fallback } = getFriendlyTimeParts(Math.max(0, seconds));
    const value = String(amount);

    return localizeWithFallback(key, fallback.replace('%amount%', value), ['amount', 'AMOUNT'], [value, value]);
};

/**
 * The wait left on a quest. `QuestMessageData.waitPeriodSeconds` counts itself down from the moment
 * the packet arrived; `clock` is the caller's tick so a memoizing render re-reads it every second.
 */
export const getQuestWaitSecondsLeft = (quest: QuestMessageData, clock: number): number => {
    if (!quest || !Number.isFinite(clock)) return 0;

    return Math.max(0, quest.waitPeriodSeconds || 0);
};

/** `quests.<campaign>.delayedmsg`, the text of the expanded timer. */
export const getQuestDelayedMessageKey = (quest: QuestMessageData): string => `${getCampaignLocalizationKey(quest.campaignCode)}.delayedmsg`;

export const getNextQuestTimerCaption = (expanded: boolean, time: string): string =>
    expanded
        ? localizeWithFallback('quests.nextquesttimer.caption.expanded', 'Time until next Quest')
        : localizeWithFallback('quests.nextquesttimer.caption.contracted', `Next Quest: ${time}`, ['time'], [time]);

export const getNextQuestTimerMessage = (quest: QuestMessageData, time: string): string =>
    localizeWithFallback(getQuestDelayedMessageKey(quest), `Your next Quest is available in <b>${time}</b>`, ['time'], [time]);

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
    blue: { dark: '#3576B9', medium: '#CFE2F9', light: '#DDEBF9', active: '#BDD6EF' },
    orange: { dark: '#C97918', medium: '#FFDFB2', light: '#FFEFD6', active: '#FFCF91' },
    forest_green: { dark: '#3F8A45', medium: '#CDEACB', light: '#E1F3DF', active: '#B8DFB6' },
    red: { dark: '#B84B4B', medium: '#F1CCCC', light: '#F8DDDD', active: '#E7B8B8' },
    cyan: { dark: '#1F9EB3', medium: '#C7EFF5', light: '#DCF7FB', active: '#B5E9F1' }
};

export const resolveRewardTrackTheme = (theme: string): RewardTrackTheme => REWARD_TRACK_THEMES[theme] ?? REWARD_TRACK_THEMES.blue;

/**
 * The window the hint button opens for a task. The official client reads the link from the
 * `reward_track.<track>.task.<task>.hint.internal_link` property and hides the button when it is
 * empty; `configuredLink` is that property. Without one, the official actions whose hint has a
 * button text (`task.<id>.hint.button_text`) open their window; the others show no button.
 */
export const getRewardTrackTaskHintLink = (actionType: string, configuredLink: string = null): { fallbackText: string; link: string } | null => {
    if (configuredLink) return { fallbackText: '', link: configuredLink };

    switch ((actionType || '').toLowerCase()) {
        case 'enter_other_users_room':
        case 'chat_with_someone':
            return { fallbackText: 'Open the Navigator', link: 'navigator/show' };
        case 'create_room':
            return { fallbackText: 'Open the Navigator', link: 'navigator/create' };
        case 'place_item':
            return { fallbackText: 'Open the inventory', link: 'inventory/show' };
        case 'wear_badge':
            return { fallbackText: 'Open the inventory', link: 'inventory/show/badges' };
        case 'buy_from_catalogue':
            return { fallbackText: 'Open the Catalogue', link: 'catalog/show' };
        case 'change_figure':
            return { fallbackText: 'Open the Look Editor', link: 'avatar-editor/show' };
        case 'request_friend':
            return { fallbackText: 'Find friends', link: 'friends/show' };
        case 'publish_picture':
            return { fallbackText: 'Open the Camera', link: 'camera/show' };
        default:
            return null;
    }
};

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

/** Splits a single tier into pages of `perPage` prizes, ordered by required points. */
export const paginatePrizes = <T extends { requiredPoints: number }>(prizes: T[], perPage: number): T[][] => {
    const ordered = [...prizes].sort((a, b) => a.requiredPoints - b.requiredPoints);
    const pages: T[][] = [];

    for (let i = 0; i < ordered.length; i += Math.max(1, perPage)) pages.push(ordered.slice(i, i + Math.max(1, perPage)));

    return pages.length ? pages : [[]];
};

/** The premium confirmation shows the boost as a percentage: round((boost - 1) * 100). */
/**
 * One page per span of points milestones, so the free and the premium row stay
 * column-aligned: the Nth column of both rows is the same milestone, and a
 * milestone that only one tier rewards leaves the other row's column empty
 * instead of shifting every prize after it.
 */
export const paginatePrizeTiers = <T extends { premium: boolean; requiredPoints: number }>(
    prizes: T[],
    milestonesPerPage: number
): { free: T[][]; milestones: number[][]; premium: T[][] } => {
    const perPage = Math.max(1, milestonesPerPage);
    const milestones = [...new Set(prizes.map((prize) => prize.requiredPoints))].sort((a, b) => a - b);
    const free: T[][] = [];
    const premium: T[][] = [];
    const pageMilestones: number[][] = [];

    for (let index = 0; index < milestones.length; index += perPage) {
        const page = milestones.slice(index, index + perPage);
        const span = new Set(page);

        pageMilestones.push(page);
        const ofPage = (tier: boolean) => prizes.filter((prize) => prize.premium === tier && span.has(prize.requiredPoints)).sort((a, b) => a.requiredPoints - b.requiredPoints);

        free.push(ofPage(false));
        premium.push(ofPage(true));
    }

    return free.length ? { free, milestones: pageMilestones, premium } : { free: [[]], milestones: [[]], premium: [[]] };
};

export const getPremiumBoostPercent = (taskPointsBoost: number): number => Math.round((taskPointsBoost - 1) * 100);

/** The official client localizes non-zero result codes as `<prefix><code>`. */
export const getRewardTrackResultText = (prefix: string, resultCode: number, fallback: string): string => {
    if (resultCode === 0) return localizeWithFallback(`${prefix}success`, fallback);

    return localizeWithFallback(`${prefix}fail.${resultCode}`, LocalizeText(`${prefix}fail.${resultCode}`) || fallback);
};
