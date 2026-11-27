import { KEEP_PROFILE_CUSTOMIZATION, RoomUnitBackgroundComposer, UserProfileParser } from '@octane/renderer';
import { configFileUrl } from '../../secure-assets';
import { parseCssColors, toneOf } from '../utils/backgroundTone';
import { GetConfigurationValue, GetOptionalConfigurationValue, SendMessageComposer } from '../octane';
import { GetUserProfile } from './GetUserProfile';

/**
 * One banner of the gallery: its id, the picture (a path below images.url or a full URL) and the
 * part of it the banner shows. Gallery pictures are pixel art, shown at their own size so they stay
 * sharp: "position" picks the part, as a CSS background-position.
 */
export interface ProfileBannerEntry {
    id: number;
    image: string;
    position?: string;
}

export const DEFAULT_PROFILE_BANNER_POSITION = 'left 72%';

const PROFILE_BANNER_SKY = 'linear-gradient(180deg, #6fb3dc 0%, #b9e0f2 100%)';

/** The style of a gallery banner: the picture at its own size over a sky gradient that fills the rest. */
export const profileGalleryBannerStyle = (entry: ProfileBannerEntry): { backgroundImage: string; backgroundPosition: string; backgroundSize: string } => ({
    backgroundImage: `url(${resolveProfileBannerUrl(entry.image)}), ${PROFILE_BANNER_SKY}`,
    backgroundPosition: `${entry.position ?? DEFAULT_PROFILE_BANNER_POSITION}, 0 0`,
    backgroundSize: 'auto, 100% 100%'
});

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

/**
 * Effects that are whole outfits (6 suit, 7 dress, 8 football kit): they are drawn with a body and pose of their
 * own, so the user's clothes would show around them. Under one of them the avatar is drawn without its clothes;
 * head, hair, hat and face accessories stay.
 */
export const PROFILE_COSTUME_OVERLAYS: ReadonlyArray<number> = [6, 7, 8];

const CLOTHING_PARTS = /^(ch|cc|ca|cp|lg|sh|wa)-/;

export const figureUnderOverlay = (figure: string, overlayId: number | null | undefined): string =>
    overlayId && PROFILE_COSTUME_OVERLAYS.includes(overlayId)
        ? figure
              .split('.')
              .filter((part) => !CLOTHING_PARTS.test(part))
              .join('.')
        : figure;

/** An accent of the user's own colour: this bit over the colour as 0xRRGGBB (the server checks the same bit). */
export const PROFILE_CUSTOM_ACCENT = 0x1000000;

export const isCustomProfileAccent = (accentId: number): boolean => (accentId & 0x7f000000) === PROFILE_CUSTOM_ACCENT;

/** The accent id of a colour picked freely, from "#rrggbb". */
export const customProfileAccentId = (color: string): number => {
    const match = /^#?([0-9a-f]{6})$/i.exec(color.trim());

    return match ? PROFILE_CUSTOM_ACCENT | parseInt(match[1], 16) : 0;
};

export const getProfileAccentColor = (accentId: number): string | null => {
    if (isCustomProfileAccent(accentId)) return `#${(accentId & 0xffffff).toString(16).padStart(6, '0')}`;

    return PROFILE_ACCENTS.find((accent) => accent.id === accentId)?.color ?? null;
};

/** The features the hotel has on for profiles, as the server reports them in the profile. */
export const PROFILE_FEATURE_BANNER = 1;
export const PROFILE_FEATURE_UPLOAD = 2;
export const PROFILE_FEATURE_THEME = 4;

export const hasProfileFeature = (profile: Pick<UserProfileParser, 'features'> | null | undefined, feature: number): boolean =>
    ((profile?.features ?? PROFILE_FEATURE_BANNER | PROFILE_FEATURE_UPLOAD | PROFILE_FEATURE_THEME) & feature) !== 0;

/** A background of the user's own: two colours, the angle of the gradient between them, a gallery pattern over it. */
export interface ProfileBackgroundStyle {
    from: string;
    to: string;
    angle: number;
    /** A card background of the gallery laid over the colours, 0 for none. */
    pattern: number;
}

export const PROFILE_BACKGROUND_ANGLES: ReadonlyArray<number> = [0, 45, 90, 135, 180, 225, 270, 315];

const BACKGROUND_STYLE = /^([0-9a-f]{6});([0-9a-f]{6});(0|45|90|135|180|225|270|315);([0-9]{1,4})$/;

/** Reads the style the server sends ("rrggbb;rrggbb;angle;pattern"); null for none or anything else. */
export const parseProfileBackgroundStyle = (value: string | null | undefined): ProfileBackgroundStyle | null => {
    const match = BACKGROUND_STYLE.exec((value ?? '').trim().toLowerCase());

    if (!match) return null;

    return { from: `#${match[1]}`, to: `#${match[2]}`, angle: Number(match[3]), pattern: Number(match[4]) };
};

export const formatProfileBackgroundStyle = (style: ProfileBackgroundStyle): string =>
    [style.from.replace('#', ''), style.to.replace('#', ''), style.angle, style.pattern].join(';').toLowerCase();

/** The gradient of a style; only the parsed hex colours reach the CSS. */
export const profileBackgroundStyleCss = (style: ProfileBackgroundStyle): { backgroundImage: string } => ({
    backgroundImage: `linear-gradient(${style.angle}deg, ${style.from}, ${style.to})`
});

/** True when an accent is light enough that the title on it must be dark to be read. */
export const isLightProfileAccent = (accentId: number): boolean => {
    const color = getProfileAccentColor(accentId);
    const [rgb] = color ? parseCssColors(color) : [];

    return !!rgb && toneOf(rgb) === 'light';
};

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
    backgrounds: number[];
    stands: number[];
    overlays: number[];
}

type RawData = Partial<Record<'banners.data' | 'cards.data' | 'backgrounds.data' | 'borders.data' | 'stands.data' | 'overlays.data', unknown[]>>;

const readIds = (list: unknown[] | undefined, field: string): number[] =>
    (Array.isArray(list) ? list : [])
        .map((item) => (typeof item === 'number' ? item : Number((item as Record<string, unknown>)?.[field])))
        .filter((id) => Number.isInteger(id) && id >= 0);

export const parseProfileCustomizationData = (raw: RawData | null): ProfileCustomizationData => {
    const banners = (Array.isArray(raw?.['banners.data']) ? raw['banners.data'] : [])
        .map((item) => {
            const entry = item as Record<string, unknown>;

            return {
                id: Number(entry?.bannerId),
                image: String(entry?.image ?? ''),
                position: typeof entry?.position === 'string' ? entry.position : undefined
            };
        })
        .filter((entry) => Number.isInteger(entry.id) && entry.id > 0 && entry.image.length > 0)
        .map((entry) => (entry.position ? entry : { id: entry.id, image: entry.image }));
    const cards = readIds(raw?.['cards.data']?.length ? raw['cards.data'] : raw?.['backgrounds.data'], 'backgroundId');

    return {
        banners: banners.length ? banners : [...DEFAULT_PROFILE_BANNERS],
        cards: cards.length ? cards : [0],
        borders: readIds(raw?.['borders.data'], 'borderId'),
        backgrounds: readIds(raw?.['backgrounds.data'], 'backgroundId'),
        stands: readIds(raw?.['stands.data'], 'standId'),
        overlays: readIds(raw?.['overlays.data'], 'overlayId')
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
                'borders.data': GetOptionalConfigurationValue<unknown[]>('borders.data', []),
                'stands.data': GetOptionalConfigurationValue<unknown[]>('stands.data', []),
                'overlays.data': GetOptionalConfigurationValue<unknown[]>('overlays.data', [])
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

export const findProfileBanner = (banners: ReadonlyArray<ProfileBannerEntry>, bannerId: number): ProfileBannerEntry | null =>
    (bannerId && banners.find((banner) => banner.id === bannerId)) || null;

export const findProfileBannerUrl = (banners: ReadonlyArray<ProfileBannerEntry>, bannerId: number): string => {
    const entry = findProfileBanner(banners, bannerId);

    return entry ? resolveProfileBannerUrl(entry.image) : '';
};

export type ProfileCustomizationChange = Partial<Record<'background' | 'stand' | 'overlay' | 'card' | 'border' | 'banner' | 'accent', number>>;

/**
 * Saves one change of the own profile window. The infostand values travel in the same message, so
 * they are sent as they are now; banner and accent are left to the server unless they change. The
 * profile is asked for again to show the result.
 */
export const sendProfileCustomization = (profile: UserProfileParser, change: ProfileCustomizationChange): void => {
    SendMessageComposer(
        new RoomUnitBackgroundComposer(
            change.background ?? profile.backgroundId ?? 0,
            change.stand ?? profile.standId ?? 0,
            change.overlay ?? profile.overlayId ?? 0,
            change.card ?? profile.cardBackgroundId ?? 0,
            change.border ?? profile.borderId ?? 0,
            change.banner ?? KEEP_PROFILE_CUSTOMIZATION,
            change.accent ?? KEEP_PROFILE_CUSTOMIZATION
        )
    );
    GetUserProfile(profile.id);
};
