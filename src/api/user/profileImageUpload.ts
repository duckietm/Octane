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

const endpoint = (kind: ProfileImageKind): string => {
    const base = interpolate(GetConfiguration().getValue<string>('profile.images.endpoint', '${api.url}/profile-images/upload'));

    return `${base}${base.includes('?') ? '&' : '?'}kind=${kind}`;
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

/** Sends a cropped picture; the server checks and re-encodes it, then the own profile is asked for again. */
export const uploadProfileImage = async (kind: ProfileImageKind, bytes: Uint8Array): Promise<ProfileImageUploadResult> => {
    try {
        const response = await fetch(endpoint(kind), { method: 'POST', credentials: 'include', headers: headers('image/jpeg'), body: new Blob([bytes.slice().buffer], { type: 'image/jpeg' }) });

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
