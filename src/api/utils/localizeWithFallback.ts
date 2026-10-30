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
