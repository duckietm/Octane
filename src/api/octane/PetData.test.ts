import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, unknown>();

vi.mock('@octane/renderer', () => ({
    GetConfiguration: () => ({
        getValue: (key: string, fallback: unknown = null) => (store.has(key) ? store.get(key) : fallback),
        setValue: (key: string, value: unknown) => {
            store.set(key, value);
        }
    })
}));

import { derivePetConfig, GetPetDefinition, GetPetDescription, GetPetName } from './PetData';

beforeEach(() => store.clear());

describe('derivePetConfig', () => {
    it('derives a pet.types array indexed by id (gaps filled) and a pet.data map', () => {
        const derived = derivePetConfig([
            { id: 0, lib: 'dog', name: 'Dog', description: 'woof' },
            { id: 2, lib: 'croco', name: 'Crocodile' }
        ]);

        expect(derived).not.toBeNull();
        expect(derived!['pet.types']).toEqual(['dog', '', 'croco']);
        expect(derived!['pet.data']).toEqual({
            0: { name: 'Dog', description: 'woof' },
            2: { name: 'Crocodile', description: '' }
        });
    });

    it('returns null on empty or invalid input so the static pet.types config survives', () => {
        expect(derivePetConfig([])).toBeNull();
        expect(derivePetConfig(null as unknown as [])).toBeNull();
    });
});

describe('pet display helpers', () => {
    it('read name/description from the pet.data config map', () => {
        store.set('pet.data', { 33: { name: 'Pterodactyl', description: 'A flying lizard' } });

        expect(GetPetName(33)).toBe('Pterodactyl');
        expect(GetPetDescription(33)).toBe('A flying lizard');
        expect(GetPetDefinition(33)).toEqual({ name: 'Pterodactyl', description: 'A flying lizard' });
    });

    it('return null/empty for unknown or negative indices and when no map is configured', () => {
        expect(GetPetDefinition(5)).toBeNull();
        expect(GetPetName(5)).toBe('');

        store.set('pet.data', { 0: { name: 'Dog', description: '' } });
        expect(GetPetDefinition(-1)).toBeNull();
        expect(GetPetDefinition(9)).toBeNull();
    });
});
