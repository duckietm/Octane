import { GetOptionalConfigurationValue } from '../octane/GetConfigurationValue';
import { isSafeExternalUrl } from '../utils/isSafeExternalUrl';

// Stored photos are `<userId>_<timestamp>.png` (plus a `_small` thumbnail) in the hotel's camera folder.
const CAMERA_PHOTO_FILE = /^(\d+)_\d+(?:_small)?\.png$/;

const getUrlFileName = (url: string): string => {
    try {
        const path = new URL(url).pathname;

        return path.substring(path.lastIndexOf('/') + 1);
    } catch {
        return '';
    }
};

/**
 * The photo URL to load, or '' when it is not one of the hotel's camera photos. With configured
 * bases the URL must sit directly under one of them; without any, any http(s) URL with a photo file
 * name is accepted. A bare file name is resolved against the first base, as the official client does.
 */
export const getCameraPhotoUrl = (url: string, bases: readonly string[]): string => {
    if (!url || typeof url !== 'string') return '';

    const allowedBases = (bases ?? [])
        .filter((base) => typeof base === 'string' && /^https?:\/\//i.test(base))
        .map((base) => (base.endsWith('/') ? base : `${base}/`));
    let photoUrl = url.trim();

    if (!/^https?:\/\//i.test(photoUrl)) {
        if (!allowedBases.length || photoUrl.includes('/')) return '';

        photoUrl = allowedBases[0] + (photoUrl.endsWith('.png') ? photoUrl : `${photoUrl}.png`);
    }

    if (!allowedBases.length) return CAMERA_PHOTO_FILE.test(getUrlFileName(photoUrl)) ? photoUrl : '';

    for (const base of allowedBases) {
        if (!photoUrl.toLowerCase().startsWith(base.toLowerCase())) continue;

        if (CAMERA_PHOTO_FILE.test(photoUrl.substring(base.length))) return photoUrl;
    }

    return '';
};

/** getCameraPhotoUrl against the hotel's configured photo folders (`camera.url`, `stories.image_url_base`). */
export const GetAllowedCameraPhotoUrl = (url: string): string =>
    getCameraPhotoUrl(url, [GetOptionalConfigurationValue<string>('camera.url', ''), GetOptionalConfigurationValue<string>('stories.image_url_base', '')]);

/**
 * The link to a published photo. The server answers with an id (the hotel's photo page is built from it) or,
 * on some hotels, a full address or a rooted path: a full address is used only when it is http(s), and a rooted
 * path is resolved against the origin of `camera.url` when one is configured. A protocol-relative address
 * (`//host`, `/\host`) would leave the hotel, so it gives no link.
 */
export const getPublishedPhotoUrl = (publishId: string, cameraUrl: string, userName: string): string => {
    const id = typeof publishId === 'string' ? publishId.trim() : '';

    if (!id) return '';

    if (/^[a-z][a-z\d+.-]*:/i.test(id)) return isSafeExternalUrl(id) ? id : '';

    if (id.startsWith('/')) {
        if (id.startsWith('//') || id.includes('\\')) return '';

        if (!isSafeExternalUrl(cameraUrl)) return id;

        const resolved = new URL(id, cameraUrl).href;

        return isSafeExternalUrl(resolved) ? resolved : '';
    }

    return `/profile/${encodeURIComponent(userName ?? '')}/photo/${encodeURIComponent(id)}`;
};

/** The photographer's user id from a stored photo file name (`<userId>_<timestamp>.png`), or 0. */
export const getCameraPhotoCreatorId = (url: string): number => {
    const match = CAMERA_PHOTO_FILE.exec(getUrlFileName(url ?? ''));

    return match ? Number(match[1]) : 0;
};

/** Official photo date `d-m-yyyy`. Takes seconds (our server) or milliseconds (official data). */
export const formatCameraPhotoDate = (time: number): string => {
    const value = Number(time);

    if (!Number.isFinite(value) || value <= 0) return '';

    const date = new Date(value < 100000000000 ? value * 1000 : value);

    return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
};
