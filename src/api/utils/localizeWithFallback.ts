import { LocalizeText } from './LocalizeText';

/**
 * Pure decision: the localization manager returns the key itself for a missing
 * translation, so treat "text equals the key" (or empty) as "no translation"
 * and use the fallback instead.
 */
export const resolveLocalized = (localized: string, key: string, fallback: string): string => (localized && localized !== key ? localized : fallback);

/** Fills `%name%` placeholders the way the localization manager does: case-insensitive, every occurrence. */
export const fillPlaceholders = (text: string, parameters: string[] = null, replacements: string[] = null): string => {
    if (!text || !parameters || !replacements) return text;

    return parameters.reduce((value, parameter, index) => {
        const replacement = replacements[index];

        if (replacement === undefined || replacement === null) return value;

        const pattern = new RegExp(`%${parameter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}%`, 'gi');

        return value.replace(pattern, () => replacement);
    }, text);
};

/**
 * Localize `key`, returning `fallback` when the key has no translation
 * (so raw keys never surface in the UI). Optional `parameters` / `replacements`
 * fill the placeholders of the translation and of the fallback alike: a fallback used to show `%count%` as typed.
 */
export const localizeWithFallback = (
    key: string,
    fallback: string,
    parameters: string[] = null,
    replacements: string[] = null,
): string => resolveLocalized(LocalizeText(key, parameters, replacements), key, fillPlaceholders(fallback, parameters, replacements));

/** The last part of a text key as a title: `navigator.flatcategory.global.TRADING` -> "Trading". */
export const titleFromKey = (key: string): string => {
    const last = (key ?? '').split('.').pop() ?? '';
    const words = last.replace(/[_-]+/g, ' ').trim().toLowerCase();

    return words ? words.charAt(0).toUpperCase() + words.slice(1) : '';
};

/**
 * A server text that is a text key in `${...}` (the navigator's category names: `${navigator.flatcategory.global.BC}`) is looked up;
 * a key without a translation reads as its last part (`Trading`), never as the raw key. Any other text comes back as it is.
 */
export const localizeServerText = (text: string): string => {
    const match = /^\$\{([^}]+)\}$/.exec(text?.trim() ?? '');

    if (!match) return text;

    return localizeWithFallback(match[1], titleFromKey(match[1]));
};
