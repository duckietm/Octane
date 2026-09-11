import { describe, expect, it } from 'vitest';
import { buildWiredVariablePickerEntries, flattenWiredVariablePickerEntries } from './WiredVariablePickerData';

describe('Wired variable picker internal furniture variables', () => {
    it('offers gravity as both a reference and destination without changing custom variables', () => {
        const references = flattenWiredVariablePickerEntries(buildWiredVariablePickerEntries('furni', 'change-reference', []));
        const destinations = flattenWiredVariablePickerEntries(buildWiredVariablePickerEntries('furni', 'change-destination', []));

        expect(references.find((entry) => entry.label === '@gravity')?.selectable).toBe(true);
        expect(destinations.find((entry) => entry.label === '@gravity')?.selectable).toBe(true);
    });

    it('exposes generated array capture projections as read-only context references', () => {
        const definition = {
            itemId: -1,
            name: 'inventory.quantity',
            hasValue: true,
            availability: 0,
            isReadOnly: true
        };
        const references = flattenWiredVariablePickerEntries(buildWiredVariablePickerEntries('context', 'change-reference', [definition]));
        const destinations = flattenWiredVariablePickerEntries(buildWiredVariablePickerEntries('context', 'change-destination', [definition]));

        expect(references.find((entry) => entry.token === 'internal:inventory.quantity')?.selectable).toBe(true);
        expect(destinations.find((entry) => entry.token === 'internal:inventory.quantity')?.selectable).toBe(false);
    });

    it('never offers a definition whose stored schema the server could not parse', () => {
        const broken = { itemId: 11, name: 'Broken', hasValue: false, availability: 0, unavailable: true };

        for (const usage of ['condition', 'filter-main', 'change-reference', 'change-destination', 'give', 'remove'] as const) {
            const entries = flattenWiredVariablePickerEntries(buildWiredVariablePickerEntries('global', usage, [broken]));

            expect(entries.find((entry) => entry.token === 'custom:11')?.selectable, usage).toBe(false);
        }
    });
});
