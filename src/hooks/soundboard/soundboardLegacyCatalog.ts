import { ISoundboardSound } from '@octane/renderer';

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export const normalizeLegacySoundboardCatalog = (input: unknown): ISoundboardSound[] => {
    if (!isRecord(input) || !Array.isArray(input.sounds)) return [];

    const ids = new Set<number>();
    const sounds: ISoundboardSound[] = [];

    for (const candidate of input.sounds) {
        if (!isRecord(candidate)) continue;

        const id = candidate.id;
        const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
        const url = typeof candidate.url === 'string' ? candidate.url.trim() : '';
        if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0 || ids.has(id) || !name || !url) continue;

        ids.add(id);
        sounds.push({ id, name, url });
    }

    return sounds;
};
