/** The key the official Vimeo handler (`class_3348.VIDEO_ID_KEY`) reads from the furni's map stuff data. */
export const VIMEO_VIDEO_ID_KEY = 'videoId';

/** The server keeps at most this many digits (`InteractionVimeo.MAX_VIDEO_ID_DIGITS`). */
export const VIMEO_MAX_VIDEO_ID_DIGITS = 12;

/**
 * `Number(map.getValue('videoId') ?? 0)`, kept finite and non-negative. The model's
 * FURNITURE_DATA of a map-stuff-data furni is a plain key/value object.
 */
export const readVimeoVideoId = (data: unknown): number => {
    if (!data || typeof data !== 'object') return 0;

    const value = Number((data as Record<string, unknown>)[VIMEO_VIDEO_ID_KEY] ?? 0);

    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
};

/** The id editor's `restrict="0123456789"`, capped to what the server stores. */
export const sanitizeVimeoVideoIdInput = (value: string): string => (value ?? '').replace(/[^0-9]/g, '').slice(0, VIMEO_MAX_VIDEO_ID_DIGITS);

/** The Vimeo player embed for an id, or null when the furni has none. */
export const vimeoPlayerUrl = (videoId: number): string | null => (videoId > 0 ? `https://player.vimeo.com/video/${videoId}?autoplay=1` : null);
