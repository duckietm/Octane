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
