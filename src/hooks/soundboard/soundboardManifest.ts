import { SOUNDBOARD_TONES, SoundboardCategory, SoundboardTone } from './soundboardPresentation';

/**
 * One entry of `gamedata/SoundData.json`.
 *
 * The manifest is the asset pipeline's view of a pad — which file it is, what
 * it is called, how it presents — exactly as `FurnitureData.json` is for
 * furniture. The database only decides whether a pad is enabled, who may press
 * it and in what order it appears.
 */
export interface SoundboardManifestEntry {
    classname: string;
    name: string;
    file: string;
    categoryId: string | null;
    tone: SoundboardTone;
    keywords: string[];
    /** Pads of one group cut each other off while they sound; empty means no group. */
    group: string;
    /** Level relative to the player's soundboard volume, above 0 and at most 1. */
    gain: number;
}

export interface SoundboardManifest {
    categories: SoundboardCategory[];
    byClassname: Map<string, SoundboardManifestEntry>;
}

export const EMPTY_SOUNDBOARD_MANIFEST: SoundboardManifest = { categories: [], byClassname: new Map() };

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

const readKeywords = (value: unknown): string[] =>
    Array.isArray(value)
        ? [...new Set(value.filter((keyword): keyword is string => typeof keyword === 'string').map((keyword) => keyword.trim()).filter(Boolean))]
        : [];

const readGroup = (value: unknown): string => {
    const group = typeof value === 'string' ? value.trim().toLowerCase() : '';

    return GROUP_PATTERN.test(group) ? group : '';
};

const readGain = (value: unknown): number => (typeof value === 'number' && value > 0 && value <= 1 ? value : 1);

/**
 * The classname reaches the DOM as a URL path segment, so the same narrow
 * alphabet the emulator enforces is re-checked here rather than trusted.
 */
const CLASSNAME_PATTERN = /^[a-z0-9_-]{1,64}$/;
const GROUP_PATTERN = /^[a-z0-9_-]{1,32}$/;

export const normalizeSoundboardManifest = (input: unknown): SoundboardManifest => {
    if (!isRecord(input)) return EMPTY_SOUNDBOARD_MANIFEST;

    const categories: SoundboardCategory[] = [];
    const categoryIds = new Set<string>();

    if (Array.isArray(input.categories)) {
        for (const candidate of input.categories) {
            if (!isRecord(candidate) || typeof candidate.id !== 'string' || typeof candidate.label !== 'string') continue;

            const id = candidate.id.trim();
            const label = candidate.label.trim();

            // `all` and `recent` are the two built-in tabs; a manifest may not shadow them.
            if (!id || !label || id === 'all' || id === 'recent' || categoryIds.has(id)) continue;

            categoryIds.add(id);
            categories.push({ id, label });
        }
    }

    const byClassname = new Map<string, SoundboardManifestEntry>();

    if (Array.isArray(input.soundboard)) {
        for (const candidate of input.soundboard) {
            if (!isRecord(candidate)) continue;

            const classname = typeof candidate.classname === 'string' ? candidate.classname.trim().toLowerCase() : '';
            const file = typeof candidate.file === 'string' ? candidate.file.trim() : '';

            if (!CLASSNAME_PATTERN.test(classname) || !file || file.includes('/') || file.includes('\\') || byClassname.has(classname)) continue;

            const rawCategory = typeof candidate.category === 'string' ? candidate.category.trim() : '';
            const tone = typeof candidate.tone === 'string' && (SOUNDBOARD_TONES as readonly string[]).includes(candidate.tone)
                ? (candidate.tone as SoundboardTone)
                : 'blue';

            byClassname.set(classname, {
                classname,
                name: typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name.trim() : classname,
                file,
                categoryId: categoryIds.has(rawCategory) ? rawCategory : null,
                tone,
                keywords: readKeywords(candidate.keywords),
                group: readGroup(candidate.group),
                gain: readGain(candidate.gain)
            });
        }
    }

    return { categories, byClassname };
};
