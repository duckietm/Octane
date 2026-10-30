import { AvatarInfoFurni, LocalizeText } from '../../../../../api';

type FurniKind = Pick<AvatarInfoFurni, 'isBuildersClub' | 'isTemporary'>;

/** Official InfoStandFurniView.update: the panel colour follows the furni's id band. */
export const infostandFurniPanelClass = (info: FurniKind): string => {
    if (info.isBuildersClub) return 'octane-infostand-furni--builders-club bg-[rgba(51,28,0,.95)]';
    if (info.isTemporary) return 'octane-infostand-furni--temporary bg-[rgba(20,43,68,.95)]';

    return 'bg-[rgba(28,28,32,.95)]';
};

/** Official setOwnerInfo: a Builders Club furni names the warehouse, a temporary copy the Wired catalogue. */
export const infostandFurniOwnerText = (info: FurniKind & Pick<AvatarInfoFurni, 'ownerName'>): string => {
    if (info.isBuildersClub) return LocalizeText('builder.catalog.title');
    if (info.isTemporary) return LocalizeText('temp.catalog.title');

    return LocalizeText('furni.owner', ['name'], [info.ownerName]);
};

/** A branding setting's number range, as the server clamps it (RoomBackgroundSettings); null for a text setting. */
export const BRANDING_NUMBER_RANGES: Readonly<Record<string, { min: number; max: number }>> = {
    offsetX: { min: -10000, max: 10000 },
    offsetY: { min: -10000, max: 10000 },
    offsetZ: { min: -1000, max: 1000 },
    scale: { min: 0, max: 500 },
    alpha: { min: 0, max: 100 }
};

/** The branding settings: tab separated, each split at its first "=" only, so an address may hold "=". */
export const parseBrandingOptions = (text: string): { keys: string[]; values: string[] } => {
    const keys: string[] = [];
    const values: string[] = [];

    for (const part of (text ?? '').split('\t')) {
        const index = part.indexOf('=');

        if (index <= 0) continue;

        keys.push(part.substring(0, index));
        values.push(part.substring(index + 1));
    }

    return { keys, values };
};

/** The save map, built straight from the edited lists; a cleared number setting is saved as 0. */
export const brandingSaveMap = (keys: string[], values: string[]): Map<string, string> => {
    const map = new Map<string, string>();

    keys.forEach((key, index) => {
        const value = values[index] ?? '';

        map.set(key, BRANDING_NUMBER_RANGES[key] && value.trim() === '' ? '0' : value);
    });

    return map;
};

/** The highest a furni can be placed from the infostand height field. */
export const MAX_FURNI_HEIGHT = 40;

/**
 * The height typed in the infostand field, held between 0 and the maximum with 4 decimals, or null while the
 * field is empty or not a number: an empty field used to move the furni to the floor.
 */
export const parseFurniHeight = (raw: string): number | null => {
    if (raw == null || raw.trim() === '') return null;

    const value = parseFloat(raw);

    if (Number.isNaN(value)) return null;

    return parseFloat(Math.min(MAX_FURNI_HEIGHT, Math.max(0, value)).toFixed(4));
};
