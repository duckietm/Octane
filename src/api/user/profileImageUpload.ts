import { GetConfiguration, GetSessionDataManager } from '@octane/renderer';
import { getAccessToken } from '../auth';
import { localizeWithFallback } from '../utils/localizeWithFallback';
import { GetUserProfile } from './GetUserProfile';
import { ProfileImageKind } from './profileImageCrop';

const interpolate = (value: string): string => {
    try {
        return GetConfiguration().interpolate(value);
    } catch {
        return value;
    }
};

const endpoint = (kind: ProfileImageKind, extra: Record<string, string> = {}): string => {
    const base = interpolate(GetConfiguration().getValue<string>('profile.images.endpoint', '${api.url}/profile-images/upload'));
    const query = new URLSearchParams({ kind, ...extra }).toString();

    return `${base}${base.includes('?') ? '&' : '?'}${query}`;
};

/** The URL of an uploaded profile picture, from the file name the server sends in the profile. */
export const profileImageUrl = (file: string): string => {
    if (!file) return '';

    const template = interpolate(GetConfiguration().getValue<string>('profile.images.url', '${api.url}/profile-images/%file%'));

    return template.replace('%file%', encodeURIComponent(file));
};

const headers = (contentType?: string): Record<string, string> => {
    const result: Record<string, string> = { Accept: 'application/json', 'X-Requested-With': 'OctaneProfileImage' };
    const token = getAccessToken();

    if (token) result.Authorization = `Bearer ${token}`;
    if (contentType) result['Content-Type'] = contentType;

    return result;
};

/** The server's reasons for refusing an upload, as the user reads them. */
const REFUSALS: Record<string, [string, string]> = {
    too_large: ['extendedprofile.customize.upload.too_large', 'This picture is too large, even after compressing it.'],
    invalid: ['extendedprofile.customize.upload.invalid', 'Choose a PNG, JPEG, GIF or WebP picture smaller than 15 MB.'],
    rate_limited: ['extendedprofile.customize.upload.rate_limited', 'You changed your picture a moment ago. Try again in a few minutes.'],
    blocked: ['extendedprofile.customize.upload.blocked', 'You cannot upload profile pictures.'],
    disabled: ['extendedprofile.customize.upload.disabled', 'Uploading profile pictures is turned off in this hotel.']
};

const refusal = (code: string): string => {
    const [key, fallback] = REFUSALS[code] ?? ['extendedprofile.customize.upload.failed', 'The picture could not be saved. Try again later.'];

    return localizeWithFallback(key, fallback);
};

export type ProfileImageUploadResult = { ok: true } | { ok: false; message: string };

const readCode = async (response: Response): Promise<string> => {
    try {
        const body = (await response.json()) as { code?: unknown };

        return typeof body?.code === 'string' ? body.code : '';
    } catch {
        return '';
    }
};

const refreshOwnProfile = () => {
    const userId = GetSessionDataManager()?.userId;

    if (userId) GetUserProfile(userId);
};

/**
 * Sends a picture; the server checks and re-encodes it, then the own profile is asked for again. A still was cropped
 * here; an animated GIF banner goes as it is with `placement` (scale and centre in the 1280 x 220 editor frame), and
 * the server places every frame the same way.
 */
export const uploadProfileImage = async (
    kind: ProfileImageKind,
    bytes: Uint8Array,
    placement?: { scale: number; centerX: number; centerY: number; pixelated: boolean }
): Promise<ProfileImageUploadResult> => {
    const type = placement ? 'image/gif' : 'image/jpeg';
    const extra = placement
        ? { scale: placement.scale.toFixed(6), cx: placement.centerX.toFixed(2), cy: placement.centerY.toFixed(2), pixelated: placement.pixelated ? '1' : '0' }
        : {};

    try {
        const response = await fetch(endpoint(kind, extra), { method: 'POST', credentials: 'include', headers: headers(type), body: new Blob([bytes.slice().buffer], { type }) });

        if (!response.ok) return { ok: false, message: refusal(await readCode(response)) };

        refreshOwnProfile();

        return { ok: true };
    } catch {
        return { ok: false, message: refusal('') };
    }
};

/** Takes the uploaded picture of one place off the profile. */
export const removeProfileImage = async (kind: ProfileImageKind): Promise<boolean> => {
    try {
        const response = await fetch(endpoint(kind), { method: 'DELETE', credentials: 'include', headers: headers() });

        refreshOwnProfile();

        return response.ok;
    } catch {
        return false;
    }
};

/** For each customiser category, the ids the hotel lists: '' when the user may pick it, else why not ('hc', 'rank', 'ambassador'). */
export interface ProfileOptions {
    enforced: boolean;
    categories: Partial<Record<'background' | 'stand' | 'overlay' | 'card' | 'border' | 'banner' | 'accent', Record<string, string>>>;
}

const optionsUrl = (): string => {
    const upload = interpolate(GetConfiguration().getValue<string>('profile.images.endpoint', '${api.url}/profile-images/upload'));

    return upload.replace(/\/upload(\?.*)?$/, '/options');
};

/** What the signed-in user may pick; null when the server cannot say, and then every choice stays open. */
export const loadProfileOptions = async (): Promise<ProfileOptions | null> => {
    try {
        const response = await fetch(optionsUrl(), { method: 'GET', credentials: 'include', headers: headers() });

        if (!response.ok) return null;

        const body = (await response.json()) as { enforced?: unknown; categories?: unknown };

        return { enforced: body.enforced === true, categories: (body.categories ?? {}) as ProfileOptions['categories'] };
    } catch {
        return null;
    }
};

/** Whether a choice shows, and its lock: hidden when the hotel does not list it, locked with a reason when the user may not pick it. */
export const profileOptionState = (options: ProfileOptions | null, category: keyof ProfileOptions['categories'], id: number): { hidden: boolean; lock: string | null } => {
    if (!options?.enforced || id === 0) return { hidden: false, lock: null };

    const listed = options.categories[category];

    if (!listed) return { hidden: false, lock: null };
    if (!(String(id) in listed)) return { hidden: true, lock: null };

    const reason = listed[String(id)];

    return { hidden: false, lock: reason && reason !== 'offline' ? reason : null };
};
