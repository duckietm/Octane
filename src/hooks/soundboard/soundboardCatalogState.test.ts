import { describe, expect, it } from 'vitest';
import { filterCatalogSounds, reorderCatalog, validateCatalogDraft } from './soundboardCatalogState';

const sounds = [
    { id: 7, name: 'Campanella', classname: '', url: '/bell.mp3', enabled: true, sortOrder: 10, minRank: 1 },
    { id: 12, name: 'Applauso', classname: '', url: 'https://cdn.example/clap.mp3', enabled: false, sortOrder: 20, minRank: 5 }
];

describe('Soundboard catalog state', () => {
    it('filters by ID, name, and enabled state', () => {
        expect(filterCatalogSounds(sounds, '12', 'all').map((sound) => sound.id)).toEqual([12]);
        expect(filterCatalogSounds(sounds, 'camp', 'all').map((sound) => sound.id)).toEqual([7]);
        expect(filterCatalogSounds(sounds, '', 'enabled').map((sound) => sound.id)).toEqual([7]);
        expect(filterCatalogSounds(sounds, '', 'disabled').map((sound) => sound.id)).toEqual([12]);
    });

    it('validates server-compatible names, URLs, and ranks', () => {
        expect(validateCatalogDraft({ id: 0, name: 'Bell', classname: '', url: '/sounds/bell.mp3', minRank: 1, enabled: true, cooldownSeconds: 0 }).valid).toBe(true);
        expect(validateCatalogDraft({ id: 0, name: '', classname: '', url: 'javascript:alert(1)', minRank: 0, enabled: true, cooldownSeconds: 0 }).errors).toEqual({
            name: 'invalid_name',
            url: 'invalid_url',
            minRank: 'invalid_rank'
        });
        expect(validateCatalogDraft({ id: 0, name: 'Bell', classname: '', url: 'https://cdn.example/bell.mp3', minRank: 2.5, enabled: true, cooldownSeconds: 0 }).valid).toBe(false);
    });

    it('accepts a pad cooldown from none to one hour and nothing else', () => {
        const draft = { id: 0, name: 'Bell', classname: 'bell', url: '', minRank: 1, enabled: true };

        expect(validateCatalogDraft({ ...draft, cooldownSeconds: 0 }).valid).toBe(true);
        expect(validateCatalogDraft({ ...draft, cooldownSeconds: 3600 }).valid).toBe(true);
        expect(validateCatalogDraft({ ...draft, cooldownSeconds: 3601 }).errors).toEqual({ cooldownSeconds: 'invalid_cooldown' });
        expect(validateCatalogDraft({ ...draft, cooldownSeconds: -1 }).valid).toBe(false);
        expect(validateCatalogDraft({ ...draft, cooldownSeconds: 1.5 }).valid).toBe(false);
    });

    it('reorders without mutating the source and removes duplicate IDs', () => {
        const source = [7, 12, 9, 12];
        const result = reorderCatalog(source, 9, 7);

        expect(result).toEqual([9, 7, 12]);
        expect(source).toEqual([7, 12, 9, 12]);
        expect(new Set(result).size).toBe(result.length);
    });
});
