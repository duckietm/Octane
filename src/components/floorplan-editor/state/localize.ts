import { LocalizeText } from '../../../api';

export const localizeOr = (key: string, fallback: string, parameters: string[] = null, replacements: string[] = null): string => {
    const value = LocalizeText(key, parameters, replacements);

    return !value || value === key ? fallback : value;
};
