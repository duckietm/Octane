import { describe, expect, it } from 'vitest';
import { buildWiredVariablePickerEntries, flattenWiredVariablePickerEntries } from './WiredVariablePickerData';

describe('Wired variable picker internal furniture variables', () => {
    it('offers gravity as both a reference and destination without changing custom variables', () => {
        const references = flattenWiredVariablePickerEntries(buildWiredVariablePickerEntries('furni', 'change-reference', []));
        const destinations = flattenWiredVariablePickerEntries(buildWiredVariablePickerEntries('furni', 'change-destination', []));

        expect(references.find((entry) => entry.label === '@gravity')?.selectable).toBe(true);
        expect(destinations.find((entry) => entry.label === '@gravity')?.selectable).toBe(true);
    });
});
