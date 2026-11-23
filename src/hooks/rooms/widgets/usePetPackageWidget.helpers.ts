import { LocalizeText } from '../../../api';

const ERROR_NAMES: Record<number, string> = { 1: 'long', 2: 'short', 3: 'chars' };

/**
 * The text for a pet package name the server refused: 1 too long, 2 too short, 3 invalid characters, anything else
 * a forbidden word. When the server adds a detail (the longest name allowed, the characters it refused) and the
 * hotel has the text for it, the `.additionalInfo` text is used with the detail in `%additional_info%`, as AIR does.
 */
export const getPetPackageNameError = (errorCode: number, info: string = ''): string => {
    if (!errorCode) return '';

    const key = `catalog.alert.petname.${ERROR_NAMES[errorCode] ?? 'bobba'}`;

    if (info) {
        const detailKey = `${key}.additionalInfo`;
        const detailed = LocalizeText(detailKey, ['additional_info'], [info]);

        if (detailed && detailed !== detailKey) return detailed;
    }

    return LocalizeText(key);
};
