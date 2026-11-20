import { RoomUnitBackgroundComposer, UserProfileParser } from '@octane/renderer';
import { configFileUrl } from '../../secure-assets';
import { GetConfigurationValue, GetOptionalConfigurationValue, SendMessageComposer } from '../octane';
import { GetUserProfile } from './GetUserProfile';

/** One banner of the gallery: its id and the picture, a path below images.url or a full URL. */
export interface ProfileBannerEntry {
    id: number;
    image: string;
}

/** The accent palette of the profile window. Id 0 is the default look and has no colour. */
export const PROFILE_ACCENTS: ReadonlyArray<{ id: number; color: string }> = [
    { id: 1, color: '#1e7cb8' },
    { id: 2, color: '#0f9d8a' },
    { id: 3, color: '#3f9b2f' },
    { id: 4, color: '#c9a227' },
    { id: 5, color: '#e07b1a' },
    { id: 6, color: '#d23c3c' },
    { id: 7, color: '#d94f9b' },
    { id: 8, color: '#8a4fd1' },
    { id: 9, color: '#4b54c9' },
    { id: 10, color: '#6d4c2f' },
    { id: 11, color: '#5c6670' },
    { id: 12, color: '#1f2329' }
];

export const getProfileAccentColor = (accentId: number): string | null => PROFILE_ACCENTS.find((accent) => accent.id === accentId)?.color ?? null;

/** The banners used when the hotel's infostand_backgrounds.json has no "banners.data": its own hotel view pictures. */
export const DEFAULT_PROFILE_BANNERS: ReadonlyArray<ProfileBannerEntry> = [
    { id: 1, image: 'reception/nl.png' },
    { id: 2, image: 'reception/de.png' },
    { id: 3, image: 'reception/sg.png' },
    { id: 4, image: 'reception/br.png' },
    { id: 5, image: 'reception/ca.png' },
    { id: 6, image: 'reception/ru.png' },
    { id: 7, image: 'reception/fr.png' },
    { id: 8, image: 'reception/uk.png' }
];

export interface ProfileCustomizationData {
    banners: ProfileBannerEntry[];
    cards: number[];
    borders: number[];
}

type RawData = Partial<Record<'banners.data' | 'cards.data' | 'backgrounds.data' | 'borders.data', unknown[]>>;

const readIds = (list: unknown[] | undefined, field: string): number[] =>
    (Array.isArray(list) ? list : [])
        .map((item) => (typeof item === 'number' ? item : Number((item as Record<string, unknown>)?.[field])))
        .filter((id) => Number.isInteger(id) && id >= 0);

export const parseProfileCustomizationData = (raw: RawData | null): ProfileCustomizationData => {
    const banners = (Array.isArray(raw?.['banners.data']) ? raw['banners.data'] : [])
        .map((item) => ({ id: Number((item as Record<string, unknown>)?.bannerId), image: String((item as Record<string, unknown>)?.image ?? '') }))
        .filter((entry) => Number.isInteger(entry.id) && entry.id > 0 && entry.image.length > 0);
    const cards = readIds(raw?.['cards.data']?.length ? raw['cards.data'] : raw?.['backgrounds.data'], 'backgroundId');

    return {
        banners: banners.length ? banners : [...DEFAULT_PROFILE_BANNERS],
        cards: cards.length ? cards : [0],
        borders: readIds(raw?.['borders.data'], 'borderId')
    };
};

let cachedData: ProfileCustomizationData | null = null;
let inflight: Promise<ProfileCustomizationData> | null = null;

/** The lists the profile customiser offers, read from the same infostand_backgrounds.json as the infostand picker. */
export const loadProfileCustomizationData = (): Promise<ProfileCustomizationData> => {
    if (cachedData) return Promise.resolve(cachedData);
    if (inflight) return inflight;

    inflight = fetch(configFileUrl('infostand_backgrounds.json'), { credentials: 'omit' })
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null)
        .then((json) => {
            const fallback: RawData = {
                'cards.data': GetOptionalConfigurationValue<unknown[]>('cards.data', []),
                'backgrounds.data': GetOptionalConfigurationValue<unknown[]>('backgrounds.data', []),
                'borders.data': GetOptionalConfigurationValue<unknown[]>('borders.data', [])
            };
            cachedData = parseProfileCustomizationData(json && typeof json === 'object' ? { ...fallback, ...(json as RawData) } : fallback);

            return cachedData;
        })
        .finally(() => {
            inflight = null;
        });

    return inflight;
};

/** A banner picture as a URL: full URLs and site-relative paths stay as they are, the rest is read below images.url. */
export const resolveProfileBannerUrl = (image: string): string => {
    if (!image) return '';
    if (/^(https?:)?\/\//i.test(image) || image.startsWith('/') || image.startsWith('data:')) return image;

    return `${GetConfigurationValue<string>('images.url', '')}/${image}`;
};

export const findProfileBannerUrl = (banners: ReadonlyArray<ProfileBannerEntry>, bannerId: number): string => {
    if (!bannerId) return '';

    const entry = banners.find((banner) => banner.id === bannerId);

    return entry ? resolveProfileBannerUrl(entry.image) : '';
};

export type ProfileCustomizationChange = Partial<Record<'card' | 'border' | 'banner' | 'accent', number>>;

/**
 * Saves one change of the own profile window. The infostand values travel in the same message,
 * so they are sent as they are now; the profile is asked for again to show the result.
 */
export const sendProfileCustomization = (profile: UserProfileParser, change: ProfileCustomizationChange): void => {
    SendMessageComposer(
        new RoomUnitBackgroundComposer(
            profile.backgroundId ?? 0,
            profile.standId ?? 0,
            profile.overlayId ?? 0,
            change.card ?? profile.cardBackgroundId ?? 0,
            change.border ?? profile.borderId ?? 0,
            change.banner ?? profile.bannerId ?? 0,
            change.accent ?? profile.accentId ?? 0
        )
    );
    GetUserProfile(profile.id);
};
