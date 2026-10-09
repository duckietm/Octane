import { describe, expect, it } from 'vitest';
import {
    buildWiredVariablePickerEntries,
    filterWiredVariablePickerEntriesByMode,
    flattenWiredVariablePickerEntries,
    isSmartVariableKey
} from './WiredVariablePickerData';

describe('Wired variable picker internal furniture variables', () => {
    it('offers gravity as both a reference and destination without changing custom variables', () => {
        const references = flattenWiredVariablePickerEntries(buildWiredVariablePickerEntries('furni', 'change-reference', []));
        const destinations = flattenWiredVariablePickerEntries(buildWiredVariablePickerEntries('furni', 'change-destination', []));

        expect(references.find((entry) => entry.label === '@gravity')?.selectable).toBe(true);
        expect(destinations.find((entry) => entry.label === '@gravity')?.selectable).toBe(true);
    });
});

describe('Wired variable picker smart variables', () => {
    const furni = () => buildWiredVariablePickerEntries('furni', 'change-reference', []);
    const labels = (entries: ReturnType<typeof furni>) => flattenWiredVariablePickerEntries(entries).map((entry) => entry.label);

    it('marks the variables named with a leading ~ as smart and leaves the @ ones alone', () => {
        const flat = flattenWiredVariablePickerEntries(furni());

        expect(isSmartVariableKey('~teleport.target_id')).toBe(true);
        expect(isSmartVariableKey('@id')).toBe(false);
        expect(flat.find((entry) => entry.label === '~teleport.target_id')?.smart).toBe(true);
        expect(flat.find((entry) => entry.label === '@id')?.smart).toBe(false);
    });

    it('lists them under Smart and keeps them out of Internal', () => {
        const smart = labels(filterWiredVariablePickerEntriesByMode(furni(), 'smart', []));
        const internal = labels(filterWiredVariablePickerEntriesByMode(furni(), 'internal', []));

        expect(smart).toContain('~teleport.target_id');
        expect(smart).not.toContain('@id');
        expect(internal).toContain('@id');
        expect(internal).not.toContain('~teleport.target_id');
    });

    it('still lists everything under All and Search', () => {
        for (const mode of ['all', 'search'] as const) {
            const all = labels(filterWiredVariablePickerEntriesByMode(furni(), mode, []));

            expect(all).toContain('~teleport.target_id');
            expect(all).toContain('@id');
        }
    });

    it('shows nothing under Smart when no variable is smart', () => {
        const entries = buildWiredVariablePickerEntries('user', 'change-reference', []);

        expect(flattenWiredVariablePickerEntries(entries).some((entry) => entry.smart)).toBe(false);
        expect(filterWiredVariablePickerEntriesByMode(entries, 'smart', [])).toEqual([]);
    });

    it('keeps the Recent and User made tabs as they were', () => {
        const recent = filterWiredVariablePickerEntriesByMode(furni(), 'recent', ['internal:~teleport.target_id']);
        const custom = [{ itemId: 7, name: 'score', hasValue: true, availability: 0 }];
        const userMade = filterWiredVariablePickerEntriesByMode(buildWiredVariablePickerEntries('furni', 'change-reference', custom), 'usermade', []);

        expect(recent.map((entry) => entry.label)).toEqual(['~teleport.target_id']);
        expect(userMade.map((entry) => entry.label)).toEqual(['score']);
    });
});
