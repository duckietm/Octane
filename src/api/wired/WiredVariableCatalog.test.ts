import { describe, expect, it } from 'vitest';
import {
    applyWiredVariableCatalogDiff,
    isPersistedWiredVariable,
    wiredVariableBoxId,
    wiredVariableCatalogHashes,
    wiredVariablePickerRows,
    wiredVariableTextValues
} from './WiredVariableCatalog';

const variable = (variableId: string, variableName: string, flags: Record<string, unknown> = {}) => ({
    variableId,
    variableType: 0,
    variableName,
    availabilityType: 0,
    variableTarget: 1,
    alwaysAvailable: false,
    canCreateAndDelete: false,
    hasValue: true,
    canWriteValue: true,
    canInterceptChanges: false,
    isInvisible: false,
    requiresExecutionContext: false,
    canReadCreationTime: false,
    canReadLastUpdateTime: false,
    textConnector: null,
    textConnectorFallback: null,
    ...flags
}) as any;

describe('WiredVariableCatalog', () => {
    it('applies the removals first, then the added or updated variables', () => {
        const first = applyWiredVariableCatalogDiff(new Map(), [], [ { hash: 1, variable: variable('user:1', 'a') }, { hash: 2, variable: variable('user:2', 'b') } ]);
        const next = applyWiredVariableCatalogDiff(first, [ 'user:1' ], [ { hash: 3, variable: variable('user:2', 'b2') } ]);

        expect([ ...next.keys() ]).toEqual([ 'user:2' ]);
        expect(next.get('user:2').variable.variableName).toBe('b2');
        expect(wiredVariableCatalogHashes(next)).toEqual([ { variableId: 'user:2', hash: 3 } ]);
        expect(first.size).toBe(2);
    });

    it('lists one target without invisible rows, by name, internal variables last by id from high to low', () => {
        const catalog = applyWiredVariableCatalogDiff(new Map(), [], [
            { hash: 0, variable: variable('-125', '@b', { variableType: 1 }) },
            { hash: 0, variable: variable('-10', '@a', { variableType: 1 }) },
            { hash: 0, variable: variable('user:2', 'zeta') },
            { hash: 0, variable: variable('user:3', 'alpha') },
            { hash: 0, variable: variable('~133', '~smart', { variableType: 3, isInvisible: true }) },
            { hash: 0, variable: variable('furni:4', 'furni', { variableTarget: 0 }) }
        ]);

        expect(wiredVariablePickerRows(catalog, 1).map(row => row.variableName)).toEqual([ 'alpha', 'zeta', '@a', '@b' ]);
        expect(wiredVariablePickerRows(catalog, 0).map(row => row.variableName)).toEqual([ 'furni' ]);
    });

    it('reads the definition box id out of a created variable id only', () => {
        expect(wiredVariableBoxId('user:12')).toBe(12);
        expect(wiredVariableBoxId('furni:3')).toBe(3);
        expect(wiredVariableBoxId('room:5')).toBe(5);
        expect(wiredVariableBoxId('ctx:9')).toBe(9);
        expect(wiredVariableBoxId('-125')).toBeNull();
        expect(wiredVariableBoxId('~133')).toBeNull();
        expect(wiredVariableBoxId('user:0')).toBeNull();
    });

    it('counts availability 10, 11 and 20 as persisted', () => {
        expect([ 0, 1, 10, 11, 20, 21 ].map(availabilityType => isPersistedWiredVariable({ availabilityType }))).toEqual([ false, false, true, true, true, false ]);
    });

    it('lists the text connector by key, then the fallback as "_"', () => {
        expect(wiredVariableTextValues(variable('user:1', 'a'))).toEqual([]);
        expect(wiredVariableTextValues(variable('user:1', 'a', {
            textConnector: [ { key: 10, value: 'ten' }, { key: 2, value: 'two' } ],
            textConnectorFallback: 'other'
        }))).toEqual([ { value: '2', text: 'two' }, { value: '10', text: 'ten' }, { value: '_', text: 'other' } ]);
    });

    it('shows only the fallback past 400 entries', () => {
        const textConnector = Array.from({ length: 401 }, (_, key) => ({ key, value: `v${ key }` }));

        expect(wiredVariableTextValues(variable('user:1', 'a', { textConnector, textConnectorFallback: 'x' }))).toEqual([ { value: '_', text: 'x' } ]);
        expect(wiredVariableTextValues(variable('user:1', 'a', { textConnector: textConnector.slice(0, 400) }))).toHaveLength(400);
    });
});
