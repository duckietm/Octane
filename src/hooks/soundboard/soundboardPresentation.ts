import { ISoundboardSound } from '@octane/renderer';
import { EMPTY_SOUNDBOARD_MANIFEST, SoundboardManifest } from './soundboardManifest';

export const SOUNDBOARD_TONES = ['blue', 'green', 'gold', 'purple'] as const;

export type SoundboardTone = (typeof SOUNDBOARD_TONES)[number];

export interface SoundboardCategory {
    id: string;
    label: string;
}

export interface SoundboardPresentationEntry {
    id: number;
    categoryId: string | null;
    tone: SoundboardTone;
    keywords: string[];
}

export interface SoundboardLayout {
    categories: SoundboardCategory[];
    sounds: SoundboardPresentationEntry[];
}

export interface DisplaySoundboardSound extends ISoundboardSound {
    classname: string;
    categoryId: string | null;
    tone: SoundboardTone;
    keywords: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

const normalizeText = (value: string): string => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const normalizeSoundboardLayout = (input: unknown): SoundboardLayout => {
    const source = isRecord(input) ? input : {};
    const categories: SoundboardCategory[] = [];
    const categoryIds = new Set<string>();

    if (Array.isArray(source.categories)) {
        for (const candidate of source.categories) {
            if (!isRecord(candidate) || typeof candidate.id !== 'string' || typeof candidate.label !== 'string') continue;

            const id = candidate.id.trim();
            const label = candidate.label.trim();
            if (!id || !label || id === 'all' || id === 'recent' || categoryIds.has(id)) continue;

            categoryIds.add(id);
            categories.push({ id, label });
        }
    }

    const sounds: SoundboardPresentationEntry[] = [];
    const soundIds = new Set<number>();

    if (Array.isArray(source.sounds)) {
        for (const candidate of source.sounds) {
            if (!isRecord(candidate) || typeof candidate.id !== 'number' || !Number.isInteger(candidate.id) || candidate.id <= 0 || soundIds.has(candidate.id)) continue;

            soundIds.add(candidate.id);
            const rawCategory = typeof candidate.category === 'string' ? candidate.category.trim() : '';
            const tone = typeof candidate.tone === 'string' && (SOUNDBOARD_TONES as readonly string[]).includes(candidate.tone)
                ? candidate.tone as SoundboardTone
                : 'blue';
            const keywords = Array.isArray(candidate.keywords)
                ? [...new Set(candidate.keywords
                    .filter((keyword): keyword is string => typeof keyword === 'string')
                    .map((keyword) => keyword.trim())
                    .filter(Boolean)
                    .filter((keyword, index, values) => values.findIndex((value) => normalizeText(value) === normalizeText(keyword)) === index))]
                : [];

            sounds.push({
                id: candidate.id,
                categoryId: categoryIds.has(rawCategory) ? rawCategory : null,
                tone,
                keywords
            });
        }
    }

    return { categories, sounds };
};

/**
 * Presentation comes from two places, in this order:
 *
 * 1. the asset manifest, keyed by classname — the pad's own metadata, which
 *    travels with the file and survives a database reseed;
 * 2. `soundboard-layout.jsonc`, keyed by the numeric database id — the hotel's
 *    explicit override, which therefore wins.
 *
 * Keeping the id-keyed layout working is deliberate: existing installs have
 * one, and their ids are whatever their emulator assigned.
 */
export const mergeSoundboardPresentation = (
    serverSounds: ISoundboardSound[],
    layout: SoundboardLayout,
    manifest: SoundboardManifest = EMPTY_SOUNDBOARD_MANIFEST
): DisplaySoundboardSound[] => {
    const presentationById = new Map(layout.sounds.map((sound) => [sound.id, sound]));

    return serverSounds.map((sound) => {
        const override = presentationById.get(sound.id);
        const classname = sound.classname?.trim().toLowerCase() ?? '';
        const asset = classname ? manifest.byClassname.get(classname) : null;

        return {
            id: sound.id,
            name: sound.name || asset?.name || '',
            url: sound.url,
            classname,
            categoryId: override?.categoryId ?? asset?.categoryId ?? null,
            tone: override?.tone ?? asset?.tone ?? 'blue',
            keywords: override?.keywords?.length ? override.keywords : (asset?.keywords ?? [])
        };
    });
};

export const filterSoundboardSounds = (
    sounds: DisplaySoundboardSound[],
    query: string,
    categoryId: string,
    recentIds: number[]
): DisplaySoundboardSound[] => {
    const normalizedQuery = normalizeText(query.trim());
    const matchesQuery = (sound: DisplaySoundboardSound) => !normalizedQuery ||
        normalizeText([sound.name, ...sound.keywords].join(' ')).includes(normalizedQuery);

    if (categoryId === 'recent') {
        const soundsById = new Map(sounds.map((sound) => [sound.id, sound]));
        return recentIds.map((id) => soundsById.get(id)).filter((sound): sound is DisplaySoundboardSound => !!sound && matchesQuery(sound));
    }

    return sounds.filter((sound) => (categoryId === 'all' || sound.categoryId === categoryId) && matchesQuery(sound));
};

export const pushRecentSound = (recentIds: number[], soundId: number, limit = 10): number[] => {
    if (!Number.isInteger(soundId) || soundId <= 0 || limit <= 0) return recentIds.slice(0, Math.max(0, limit));

    return [soundId, ...recentIds.filter((id) => id !== soundId)].slice(0, limit);
};
