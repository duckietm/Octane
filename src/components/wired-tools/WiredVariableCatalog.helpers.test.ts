import { describe, expect, it, vi } from 'vitest';

vi.mock('../../api', () => ({ localizeWithFallback: (_key: string, fallback: string) => fallback }));

import { wiredVariablePropertyRows, wiredVariableToDefinition } from './WiredVariableCatalog.helpers';

const variable = {
    variableId: 'user:12',
    variableType: 0,
    variableName: 'score',
    availabilityType: 10,
    variableTarget: 1,
    alwaysAvailable: false,
    canCreateAndDelete: true,
    hasValue: true,
    canWriteValue: false,
    canInterceptChanges: true,
    isInvisible: false,
    requiresExecutionContext: false,
    canReadCreationTime: true,
    canReadLastUpdateTime: false,
    textConnector: [ { key: 1, value: 'one' } ],
    textConnectorFallback: null
} as any;

describe('WiredVariableCatalog.helpers', () => {
    it('takes every flag of a picker row from the server', () => {
        const definition = wiredVariableToDefinition(variable);

        expect(definition).toMatchObject({
            key: 'score',
            variableId: 'user:12',
            itemId: 12,
            target: 'User',
            type: 'Custom',
            canWriteTo: false,
            isReadOnly: true,
            canCreateDelete: true,
            canIntercept: true,
            hasCreationTime: true,
            hasUpdateTime: false,
            isTextConnected: true,
            textConnector: [ { value: '1', text: 'one' } ]
        });
        expect(wiredVariableToDefinition({ ...variable, variableId: '-125', variableType: 1 }).itemId).toBeUndefined();
    });

    it('lists AIR\'s property rows with the server values', () => {
        const rows = wiredVariablePropertyRows(wiredVariableToDefinition(variable));

        expect(rows.map((row) => row.key)).toEqual([
            'Name', 'Type', 'Target', 'Availability', 'Has value', 'Can write to', 'Can create/delete', 'Can intercept',
            'Is always available', 'Has creation time', 'Has update time', 'Is text connected'
        ]);
        expect(rows.find((row) => row.key === 'Can write to')?.value).toBe('No');
        expect(rows.find((row) => row.key === 'Target')?.value).toBe('Users');
        expect(wiredVariablePropertyRows(null)).toEqual([]);
    });
});
