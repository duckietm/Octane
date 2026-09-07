import { GetConfiguration } from '@octane/renderer';

export interface PetDefinition {
    id: number;
    lib: string;
    name?: string;
    description?: string;
}

export interface PetDisplayData {
    name: string;
    description: string;
}

export interface DerivedPetConfig {
    'pet.types': string[];
    'pet.data': Record<number, PetDisplayData>;
}

export const derivePetConfig = (definitions: PetDefinition[]): DerivedPetConfig | null => {
    if (!Array.isArray(definitions) || !definitions.length) return null;

    let maxId = -1;

    for (const definition of definitions) {
        if (definition && typeof definition.id === 'number' && definition.id > maxId) maxId = definition.id;
    }

    if (maxId < 0) return null;

    const libNames: string[] = new Array(maxId + 1).fill('');
    const dataById: Record<number, PetDisplayData> = {};

    for (const definition of definitions) {
        if (!definition || typeof definition.id !== 'number' || definition.id < 0) continue;

        libNames[definition.id] = typeof definition.lib === 'string' ? definition.lib : '';
        dataById[definition.id] = {
            name: definition.name ?? '',
            description: definition.description ?? ''
        };
    }

    return { 'pet.types': libNames, 'pet.data': dataById };
};

export const GetPetDefinition = (petIndex: number): PetDisplayData | null => {
    if (!(petIndex >= 0)) return null;

    const data = GetConfiguration().getValue<Record<number, PetDisplayData>>('pet.data', null);

    if (!data) return null;

    return data[petIndex] ?? null;
};

export const GetPetName = (petIndex: number): string => GetPetDefinition(petIndex)?.name ?? '';

export const GetPetDescription = (petIndex: number): string => GetPetDefinition(petIndex)?.description ?? '';
