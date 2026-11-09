import { GetConfigurationValue } from '../octane/GetConfigurationValue';

/** Official avatar editor category for effects (class_1962 "effects"). */
export const AVATAR_EDITOR_EFFECTS_TAB = 'effects';

/** Effect type that clears the effect ("remove" grid item). */
export const AVATAR_EDITOR_NO_EFFECT = -1;

/** Icon for an effect type, from `avatareditor.effects.icon.url` (fx_icon_<type>). */
export const getAvatarEffectIconUrl = (type: number): string => {
    const url = GetConfigurationValue<string>('avatareditor.effects.icon.url', '');

    if (!url || !Number.isInteger(type) || type <= 0) return '';

    return url.replace('%type%', String(type));
};

export interface AvatarEffectTimeLeftText {
    key: string;
    parameter?: string;
    value?: string;
}

const pad = (value: number) => (value < 10 ? `0${value}` : String(value));

/** Localization of the time left line, like the official EffectsParamView. */
export const getAvatarEffectTimeLeftText = (secondsLeft: number, isPermanent: boolean): AvatarEffectTimeLeftText => {
    if (isPermanent) return { key: 'avatareditor.effects.active.permanent' };

    const seconds = Math.max(0, Math.floor(secondsLeft));

    if (seconds > 3600 * 24) return { key: 'avatareditor.effects.active.daysleft', parameter: 'days_left', value: String(Math.floor(seconds / (3600 * 24))) };

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds / 60) % 60;
    const rest = seconds % 60;
    const value = hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(rest)}` : `${pad(minutes)}:${pad(rest)}`;

    return { key: 'avatareditor.effects.active.timeleft', parameter: 'time_left', value };
};

export interface AvatarEffectDurationText {
    key: string;
    fallback: string;
    parameter?: string;
    value?: string;
}

/**
 * The length of a catalog effect offer, from the product's extra param (seconds, 0 for permanent,
 * as the emulator sends it). Null when the offer carries no length (an older emulator).
 */
export const getAvatarEffectDurationText = (extraParam: string | null | undefined): AvatarEffectDurationText => {
    const text = (extraParam ?? '').trim();

    if (!/^\d+$/.test(text)) return null;

    const seconds = parseInt(text, 10);

    if (seconds <= 0) return { key: 'catalog.effect.duration.permanent', fallback: 'Permanent' };

    if (seconds >= 86400 && seconds % 86400 === 0) {
        const days = String(seconds / 86400);

        return { key: 'catalog.effect.duration.days', fallback: `${days} days`, parameter: 'days', value: days };
    }

    if (seconds >= 3600) {
        const hours = String(Math.round(seconds / 3600));

        return { key: 'catalog.effect.duration.hours', fallback: `${hours} hours`, parameter: 'hours', value: hours };
    }

    const minutes = String(Math.max(1, Math.round(seconds / 60)));

    return { key: 'catalog.effect.duration.minutes', fallback: `${minutes} minutes`, parameter: 'minutes', value: minutes };
};
