import { GetConfiguration } from '@octane/renderer';
import { LocalizeText } from '../../../api';

export const t = (key: string, fallback: string, params?: string[], replacements?: string[]): string => {
    try {
        const value = LocalizeText(key, params ?? null, replacements ?? null);
        if (value && value !== key) return value;
    } catch {}

    if (!params || !replacements) return fallback;
    let out = fallback;
    for (let i = 0; i < params.length; i++) {
        if (replacements[i] !== undefined) out = out.replace('%' + params[i] + '%', replacements[i]);
    }
    return out;
};

export const interpolate = (value: string | null | undefined): string => {
    if (!value) return '';
    try {
        return GetConfiguration().interpolate(value);
    } catch {
        return value;
    }
};
