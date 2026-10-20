/**
 * AIR's "new feature" notification (com/sulake/habbo/notifications/singular/NewFeatureNotification and
 * SingularNotificationController.maybeShowNewFeatureNotification), as pure rules. Everything is driven by
 * hotel properties (AIR's external variables, our configuration):
 *
 *   notifications.new_feature.active                 comma list of keys
 *   notifications.new_feature.condition.<key>        "reward_track_incomplete:<track id>" (else always shown)
 *   notifications.new_feature.type.<key>             normal (default) | promo | countdown
 *   notifications.new_feature.expiry.<key>           server time ("yyyy-MM-dd HH:mm"): gone once it passed
 *   notifications.new_feature.count_down_to.<key>    countdown type: the time the clock counts down to
 *   notifications.new_feature.image.<key>            the picture (an AIR asset name or a URL)
 *   notifications.new_feature.color.<key>            the border colour, "#686661" by default
 *   notifications.new_feature.internal_link.<key>    the link "open" follows (else the external link)
 *   notifications.new_feature.external_link.<key>
 *
 * and the text `notifications.new_feature.<key>.desc`. AIR keeps no "seen" flag: "cancel" closes it until
 * the next login, and a reward track condition hides it for good once that track is complete.
 */

export const NEW_FEATURE_TYPE_NORMAL = 'normal';
export const NEW_FEATURE_TYPE_PROMO = 'promo';
export const NEW_FEATURE_TYPE_COUNTDOWN = 'countdown';

export type NewFeatureType = typeof NEW_FEATURE_TYPE_NORMAL | typeof NEW_FEATURE_TYPE_PROMO | typeof NEW_FEATURE_TYPE_COUNTDOWN;

/** NewFeatureNotification.BG_COLOR_NORMAL. */
export const NEW_FEATURE_BG_COLOR_NORMAL = '#686661';
/** NewFeatureNotification.LINK_COLOR_NORMAL / LINK_COLOR_HIGHLIGHT. */
export const NEW_FEATURE_LINK_COLOR_NORMAL = 0xffffff;
export const NEW_FEATURE_LINK_COLOR_HIGHLIGHT = 0xbae1f9;

/** SingularNotificationController: the first check 2 s after start, then up to 3 retries 2 s apart. */
export const NEW_FEATURE_FIRST_CHECK_DELAY_MS = 2000;
export const NEW_FEATURE_CONDITION_RETRY_DELAY_MS = 2000;
export const NEW_FEATURE_CONDITION_MAX_RETRIES = 3;
export const NEW_FEATURE_CONDITION_REWARD_TRACK_INCOMPLETE = 'reward_track_incomplete';

export enum NewFeatureConditionState {
    UNAVAILABLE = -1,
    HIDDEN = 0,
    VISIBLE = 1
}

export interface NewFeatureNotificationConfig {
    key: string;
    type: NewFeatureType;
    expiry: string;
    countDownTo: string;
    image: string;
    color: string;
    internalLink: string;
    externalLink: string;
}

export type NewFeaturePropertyReader = (key: string) => string;

export interface NewFeatureRewardTrackLookup {
    id: string;
    complete: boolean;
}

/** notifications.new_feature.active: the keys, empty entries dropped. */
export const getActiveNewFeatureKeys = (property: NewFeaturePropertyReader): string[] =>
    (property('notifications.new_feature.active') || '').split(',').filter((key) => key.length > 0);

/** The properties of one notification; an unknown type falls back to "normal" only when empty, as AIR does. */
export const readNewFeatureConfig = (key: string, property: NewFeaturePropertyReader): NewFeatureNotificationConfig => ({
    key,
    type: (property(`notifications.new_feature.type.${key}`) || NEW_FEATURE_TYPE_NORMAL) as NewFeatureType,
    expiry: property(`notifications.new_feature.expiry.${key}`),
    countDownTo: property(`notifications.new_feature.count_down_to.${key}`),
    image: property(`notifications.new_feature.image.${key}`),
    color: property(`notifications.new_feature.color.${key}`) || NEW_FEATURE_BG_COLOR_NORMAL,
    internalLink: property(`notifications.new_feature.internal_link.${key}`),
    externalLink: property(`notifications.new_feature.external_link.${key}`)
});

/**
 * SingularNotificationController.getNewFeatureConditionState(): "reward_track_incomplete:<id>" is unavailable
 * until the tracks know that track, hidden once it is complete, visible otherwise. No (or another) condition
 * is visible.
 */
export const getNewFeatureConditionState = (condition: string, tracks: ReadonlyArray<NewFeatureRewardTrackLookup> | null): NewFeatureConditionState => {
    if (!condition || !condition.length) return NewFeatureConditionState.VISIBLE;

    const parts = condition.split(':');

    if (parts.length < 2) return NewFeatureConditionState.VISIBLE;

    if (parts[0] === NEW_FEATURE_CONDITION_REWARD_TRACK_INCOMPLETE) {
        const track = tracks ? (tracks.find((existing) => existing.id === parts[1]) ?? null) : null;

        if (!track) return NewFeatureConditionState.UNAVAILABLE;

        return track.complete ? NewFeatureConditionState.HIDDEN : NewFeatureConditionState.VISIBLE;
    }

    return NewFeatureConditionState.VISIBLE;
};

/** Whether the notification has to wait for the server's seconds until its expiry / countdown time. */
export const getNewFeaturePendingTimes = (config: NewFeatureNotificationConfig): { expiry: boolean; countdown: boolean } => ({
    expiry: config.expiry.length > 0,
    countdown: config.type === NEW_FEATURE_TYPE_COUNTDOWN && config.countDownTo.length > 0
});

/** ColorConverter.hexToUint(). */
export const newFeatureHexToUint = (hex: string): number => Number.parseInt((hex || '').replace(/^#/, ''), 16) >>> 0;

/** 0xRRGGBB as a CSS colour. */
export const newFeatureColorToCss = (color: number): string => `#${(color & 0xffffff).toString(16).padStart(6, '0')}`;

/** CountdownWidget units: weeks, days, hours, minutes, seconds. */
export const NEW_FEATURE_COUNTDOWN_UNITS = ['weeks', 'days', 'hours', 'minutes', 'seconds'];
const COUNTDOWN_UNIT_SECONDS = [604800, 86400, 3600, 60, 1];
const COUNTDOWN_UNIT_MODULO = [100, 7, 24, 60, 60];

/**
 * CountdownWidget.updateTime(): `digits` (2..4, 3 by default) counters starting at the largest unit the
 * time reaches (never so late that fewer than `digits` units remain), each a two-digit value.
 */
export const getNewFeatureCountdownUnits = (seconds: number, digits = 3): { unit: string; value: string }[] => {
    const count = Math.max(2, Math.min(4, Math.trunc(digits)));
    const remaining = Math.max(0, Math.trunc(seconds));
    let first = 0;

    for (; first < COUNTDOWN_UNIT_SECONDS.length - count; first++) if (remaining >= COUNTDOWN_UNIT_SECONDS[first]) break;

    const units: { unit: string; value: string }[] = [];

    for (let index = 0; index < count; index++) {
        const unit = first + index;
        const value = Math.trunc(remaining / COUNTDOWN_UNIT_SECONDS[unit]) % COUNTDOWN_UNIT_MODULO[unit];

        units.push({ unit: NEW_FEATURE_COUNTDOWN_UNITS[unit], value: `${value < 10 ? '0' : ''}${value}` });
    }

    return units;
};
