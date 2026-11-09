import { GetConfigurationValue } from '../../api';
import { SoundboardManifest } from './soundboardManifest';

const DEFAULT_ASSET_TEMPLATE = 'nitro-assets/sounds/soundboard/%file%';

const applyBase = (url: string): string => {
    if (!url) return '';

    // Explicit schemes remain untouched so the renderer can enforce its URL policy.
    if (/^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith('//') || url.startsWith('/')) return url;

    const base = (GetConfigurationValue<string>('soundboard.url.prefix') || GetConfigurationValue<string>('asset.url') || '').replace(/\/+$/, '');

    return base ? `${base}/${url.replace(/^\/+/, '')}` : url;
};

/**
 * Resolve a pad to a playable URL.
 *
 * A classname is the normal case: the asset manifest owns which file the pad
 * is, and `soundboard.asset.url` says where that folder lives — the same
 * split furniture uses (`furni.asset.url` + `FurnitureData.json`).
 *
 * The explicit `url` is the fallback, kept for clips hosted outside the asset
 * tree and for servers that predate asset-backed sounds.
 */
export const resolveSoundboardSoundUrl = (
    sound: { classname?: string; url?: string },
    manifest: SoundboardManifest
): string => {
    const classname = sound.classname?.trim().toLowerCase();
    const entry = classname ? manifest.byClassname.get(classname) : null;

    if (entry) {
        const template = GetConfigurationValue<string>('soundboard.asset.url') || DEFAULT_ASSET_TEMPLATE;

        return applyBase(template.replace('%file%', entry.file));
    }

    return applyBase(sound.url ?? '');
};

/** Legacy single-string form, still used where only a URL is in hand. */
export const resolveSoundboardUrl = (url: string): string => applyBase(url);
