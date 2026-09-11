/**
 * Pure logic of the talent tracks (friendbar/talent/*, package_148 class_4148 / class_2561 /
 * class_4184): the level and task states, the progress meter maths, the task actions and
 * the text / image keys the panorama, the level-up popup and the task dialog use.
 */

import { GetConfigurationValue } from '../octane';

export const TALENT_TRACK_HELPER = 'helper';
export const TALENT_TRACK_CITIZENSHIP = 'citizenship';
export const TALENT_TRACKS = [TALENT_TRACK_HELPER, TALENT_TRACK_CITIZENSHIP];

/** TalentTrackLevel.state / TalentTrackTask.state. */
export const TALENT_STATE_LOCKED = 0;
export const TALENT_STATE_IN_PROGRESS = 1;
export const TALENT_STATE_COMPLETED = 2;

/** The task badges the official track handles by hand (class_4184 constants). */
export const TALENT_TASK_HABBO_WAY = 'ACH_HabboWayGraduate1';
export const TALENT_TASK_GUIDE_GROUP = 'ACH_GuideGroupMember1';
export const TALENT_TASK_SAFETY_QUIZ = 'ACH_SafetyQuizGraduate1';
export const TALENT_TASK_EMAIL = 'ACH_EmailVerification1';
export const TALENT_TASK_ROOM_ENTRY_1 = 'ACH_RoomEntry1';
export const TALENT_TASK_ROOM_ENTRY_2 = 'ACH_RoomEntry2';
export const TALENT_TASK_AVATAR_LOOKS = 'ACH_AvatarLooks1';
export const TALENT_TASK_TOUR_ADVERT = 'ACH_GuideAdvertisementReader1';

/** The configuration keys of HabboTalent.as / TalentPromoCtrl.as / CitizenshipPopupController.as. */
export const TALENT_TRACK_ENABLED_CONFIG = 'talent.track.enabled';
export const TALENT_CITIZENSHIP_ENABLED_CONFIG = 'talent.track.citizenship.enabled';
export const TALENT_PROMO_TRACK_CONFIG = 'talentpromo.track';
export const CITIZENSHIP_POPUP_ENABLED_CONFIG = 'new.user.citizenship.popup.enabled';
export const NEW_IDENTITY_CONFIG = 'new.identity';
export const TALENT_EMAIL_CHANGE_ENABLED_CONFIG = 'talent.progress.emailchange.enabled';

/** The shape the renderer parsers (TalentTrackLevel / TalentTrackTask / reward classes) expose. */
export interface TalentTrackTaskLike {
    id: number;
    requiredLevel: number;
    badgeCode: string;
    state: number;
    currentScore: number;
    totalScore: number;
}

export interface TalentTrackRewardProductLike {
    productCode: string;
    vipDays: number;
}

export interface TalentTrackLevelLike {
    level: number;
    state: number;
    tasks: TalentTrackTaskLike[];
    perks: string[];
    items: TalentTrackRewardProductLike[];
}

/** The level-up rewards: perk ids are strings on the wire, kept normalized as strings here. */
export interface TalentLevelUpRewards {
    perks: string[];
    products: TalentTrackRewardProductLike[];
}

/** HabboTalent.habboTalentEnabled: off unless the hotel configuration turns it on (getBoolean defaults to false). */
export const isTalentTrackEnabled = (): boolean => !!GetConfigurationValue<boolean>(TALENT_TRACK_ENABLED_CONFIG, false);

/** HabboTalent.citizenshipEnabled */
export const isCitizenshipEnabled = (): boolean => !!GetConfigurationValue<boolean>(TALENT_CITIZENSHIP_ENABLED_CONFIG, false);

/** TalentTrackController.emailChangeEnabled: the e-mail block of the task dialog. */
export const isTalentEmailChangeEnabled = (): boolean => !!GetConfigurationValue<boolean>(TALENT_EMAIL_CHANGE_ENABLED_CONFIG, false);

/** The talent track the toolbar / landing promos point at (HabboTalentsPromoWidget, TalentPromoCtrl). */
export const getPromotedTalentTrack = (): string =>
    normalizeTalentTrackName(GetConfigurationValue<string>(TALENT_PROMO_TRACK_CONFIG, TALENT_TRACK_CITIZENSHIP));

/** The emulator names the track in upper case in the level-up packet; the texts and the images are lower case. */
export const normalizeTalentTrackName = (name: string): string => {
    const value = (name ?? '').trim().toLowerCase();

    return TALENT_TRACKS.includes(value) ? value : value || TALENT_TRACK_CITIZENSHIP;
};

/** TalentTrackLevel.levelProgress: the share of completed tasks of the level (clamped 0..1). */
export const getTalentLevelProgress = (level: TalentTrackLevelLike): number => {
    if (!level || !level.tasks || !level.tasks.length) return 0;

    const share = 1 / level.tasks.length;
    let progress = 0;

    for (const task of level.tasks) if (task.state === TALENT_STATE_COMPLETED) progress += share;

    return Math.min(1, Math.max(0, progress));
};

/** TalentTrack.currentLevelIndex: the last level in progress (0 when none). */
export const getTalentCurrentLevelIndex = (levels: TalentTrackLevelLike[]): number => {
    let index = 0;

    (levels ?? []).forEach((level, levelIndex) => {
        if (level.state === TALENT_STATE_IN_PROGRESS) index = levelIndex;
    });

    return index;
};

/** TalentTrack.progressPerLevel */
export const getTalentProgressPerLevel = (levels: TalentTrackLevelLike[]): number => (levels && levels.length ? 1 / levels.length : 0);

/** TalentTrack.totalProgress: the levels done plus the share of the current one (0..1). */
export const getTalentTotalProgress = (levels: TalentTrackLevelLike[]): number => {
    if (!levels || !levels.length) return 0;

    const index = getTalentCurrentLevelIndex(levels);
    const perLevel = getTalentProgressPerLevel(levels);

    return Math.min(1, Math.max(0, index * perLevel + getTalentLevelProgress(levels[index]) * perLevel));
};

/** createWindow: with citizenship on, the helper track hides its first level (it is the citizenship). */
export const getVisibleTalentLevels = (name: string, levels: TalentTrackLevelLike[], citizenshipEnabled: boolean): TalentTrackLevelLike[] => {
    const list = levels ?? [];

    if (citizenshipEnabled && normalizeTalentTrackName(name) !== TALENT_TRACK_CITIZENSHIP && list.length > 0) return list.slice(1);

    return list;
};

/** TalentTrack.findTaskByAchievementId: the last match among the unlocked levels. */
export const findTalentTaskByAchievementId = (levels: TalentTrackLevelLike[], achievementId: number): TalentTrackTaskLike => {
    let found: TalentTrackTaskLike = null;

    for (const level of levels ?? []) {
        if (level.state === TALENT_STATE_LOCKED) continue;

        for (const task of level.tasks ?? []) if (task.id === achievementId) found = task;
    }

    return found;
};

/** TalentTrackTask.hasProgressDisplay: the one-shot tasks show no progress bar. */
export const hasTalentTaskProgressDisplay = (badgeCode: string): boolean => {
    switch (badgeCode) {
        case TALENT_TASK_HABBO_WAY:
        case TALENT_TASK_SAFETY_QUIZ:
        case TALENT_TASK_EMAIL:
        case TALENT_TASK_AVATAR_LOOKS:
            return false;
        default:
            return true;
    }
};

/** mapBadgeCode: the two room-entry tasks share their action texts. */
export const mapTalentTaskBadgeCode = (badgeCode: string): string =>
    badgeCode === TALENT_TASK_ROOM_ENTRY_1 || badgeCode === TALENT_TASK_ROOM_ENTRY_2 ? 'ACH_RoomEntry' : badgeCode;

/** The task progress bar width (class_2724.map onto the 48px bar). */
export const getTalentTaskProgressWidth = (task: TalentTrackTaskLike, width: number): number => {
    if (!task || task.totalScore <= 0) return 0;

    return Math.round(Math.min(1, Math.max(0, task.currentScore / task.totalScore)) * width);
};

/** TalentLevelUpController.onTalentLevelUp: with citizenship on, helper level 1 is the citizenship itself and stays silent. */
export const shouldShowTalentLevelUp = (name: string, level: number, citizenshipEnabled: boolean): boolean =>
    !(level === 1 && normalizeTalentTrackName(name) === TALENT_TRACK_HELPER && citizenshipEnabled);

/** The renderer parser reads the perk ids as numbers; keep whatever arrives as a string id. */
export const normalizeTalentPerkIds = (perks: Array<{ perkId: number | string }>): string[] =>
    (perks ?? []).map((perk) => String(perk.perkId)).filter((perkId) => perkId.length > 0 && perkId !== 'undefined' && perkId !== 'null');

export const getTalentLevelTextKey = (name: string, level: number, part: 'title' | 'description' | 'unlock'): string =>
    `talent.track.${normalizeTalentTrackName(name)}.level.${level}.${part}`;

export const getTalentTrackTextKey = (name: string, part: string): string => `talent.track.${normalizeTalentTrackName(name)}.${part}`;

/** The `talent.track.task.action.<track>.<badge>.<description|link>` texts of the task dialog. */
export const getTalentTaskActionKey = (name: string, badgeCode: string, part: 'description' | 'link'): string =>
    `talent.track.task.action.${normalizeTalentTrackName(name)}.${mapTalentTaskBadgeCode(badgeCode)}.${part}`;

const imageLibraryUrl = (): string => {
    const url = GetConfigurationValue<string>('image.library.url', '');

    return typeof url === 'string' ? url : '';
};

/** `${image.library.url}talent/<track>_<level>.png` */
export const getTalentLevelIllustrationUrl = (name: string, level: number): string =>
    `${imageLibraryUrl()}talent/${normalizeTalentTrackName(name)}_${level}.png`;

/** `${image.library.url}talent/<track>_levelup_<level>.png` */
export const getTalentLevelUpDecorationUrl = (name: string, level: number): string =>
    `${imageLibraryUrl()}talent/${normalizeTalentTrackName(name)}_levelup_${level}.png`;

/** `${image.library.url}talent/reward_product_<code>.png` (lower case, spaces to underscores) */
export const getTalentRewardProductUrl = (productCode: string): string =>
    `${imageLibraryUrl()}talent/reward_product_${(productCode ?? '').toLowerCase().replace(/ /g, '_')}.png`;

/** `${image.library.url}talent/welcome.png` (citizenship_welcome) */
export const getCitizenshipWelcomeImageUrl = (): string => `${imageLibraryUrl()}talent/welcome.png`;
