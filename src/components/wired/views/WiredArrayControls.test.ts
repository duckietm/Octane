import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    ArrayVariableSelect,
    ARRAY_REFERENCE_CONSTANT,
    ARRAY_REFERENCE_VARIABLE,
    ARRAY_VARIABLE_ROOM,
    ARRAY_VARIABLE_USER,
    arrayFieldIsTextConnected,
    collectWiredArrayDefinitions,
    createArrayAddress,
    createArrayReference,
    definitionsForType,
    parseVariableDefinition,
    serializeVariableDefinition,
    validAddress,
    validReference,
    WiredArrayDefinitionMetadata
} from './WiredArrayControls';

afterEach(cleanup);

const definition = (patch: Partial<WiredArrayDefinitionMetadata> = {}): WiredArrayDefinitionMetadata => ({
    itemId: 10,
    name: 'Inventory',
    variableType: ARRAY_VARIABLE_ROOM,
    valueShape: 'array',
    arrayFormat: 'record',
    arrayMode: 'list',
    maxEntries: 16,
    fields: [{ id: 4, name: 'ItemID', order: 0 }],
    permanent: true,
    hasValue: true,
    ...patch
});

describe('Wired array editor contracts', () => {
    it('keeps stable field ids while bounding and normalizing editor metadata', () => {
        const fields = Array.from({ length: 10 }, (_, index) => ({ id: index + 4, name: `Field ${index + 1}`, order: index }));
        const parsed = parseVariableDefinition(
            JSON.stringify({
                name: 'Player Inventory',
                valueShape: 'array',
                arrayFormat: 'record',
                arrayMode: 'slots',
                maxEntries: 64,
                nextFieldId: 2,
                fields
            })
        );

        expect(parsed.name).toBe('Player_Inventory');
        expect(parsed.fields).toHaveLength(8);
        expect(parsed.fields[0]).toEqual({ id: 4, name: 'Field_1', order: 0 });
        expect(parsed.nextFieldId).toBe(12);
        expect(parsed.arrayMode).toBe('slots');
    });

    it('serializes simple arrays without stale record fields', () => {
        const serialized = serializeVariableDefinition({
            ...parseVariableDefinition('Inventory'),
            valueShape: 'array',
            arrayFormat: 'simple',
            fields: [{ id: 8, name: 'Stale', order: 0 }]
        });

        expect(JSON.parse(serialized)).toMatchObject({ name: 'Inventory', valueShape: 'array', arrayFormat: 'simple', fields: [] });
    });

    it('accepts only signed 64-bit constants and bounded capture paths', () => {
        expect(validReference({ ...createArrayReference(), value: '9223372036854775807' }, [])).toBe(true);
        expect(validReference({ ...createArrayReference(), value: '9223372036854775808' }, [])).toBe(false);
        expect(validReference({ ...createArrayReference(), mode: ARRAY_REFERENCE_VARIABLE, capturePath: '@array.inventory.ItemID' }, [])).toBe(true);
        expect(validReference({ ...createArrayReference(), mode: ARRAY_REFERENCE_VARIABLE, capturePath: `@array.${'a'.repeat(41)}.value` }, [])).toBe(false);
    });

    it('rejects tag-only scalars and out-of-range indexes', () => {
        const scalar = definition({ itemId: 20, valueShape: 'single', fields: [], hasValue: false });
        const variable = { ...createArrayReference(), mode: ARRAY_REFERENCE_VARIABLE, variableItemId: 20 };
        const array = definition();

        expect(definitionsForType([scalar], ARRAY_VARIABLE_ROOM, false)).toEqual([]);
        expect(validReference(variable, [scalar])).toBe(false);
        expect(validAddress({ ...createArrayAddress(), mode: ARRAY_REFERENCE_CONSTANT, value: 15 }, array, [])).toBe(true);
        expect(validAddress({ ...createArrayAddress(), mode: ARRAY_REFERENCE_CONSTANT, value: 16 }, array, [])).toBe(false);
    });

    it('drops definitions whose stored schema the server could not parse', () => {
        const usable = { itemId: 10, name: 'Inventory', valueShape: 'array' as const, maxEntries: 16, hasValue: true };
        const broken = { itemId: 11, name: 'Broken', valueShape: 'array_unavailable' as const, maxEntries: 0, hasValue: false };

        const collected = collectWiredArrayDefinitions([], [usable, broken], [], []);

        expect(collected.map((entry) => entry.itemId)).toEqual([10]);
        expect(definitionsForType(collected, ARRAY_VARIABLE_ROOM, true).map((entry) => entry.itemId)).toEqual([10]);
        expect(definitionsForType(collected, ARRAY_VARIABLE_ROOM, false)).toEqual([]);
    });
});

describe('array reference and text metadata parity', () => {
    it('accepts internal scalar operands and legacy/custom references, excluding missing or array definitions', () => {
        const scalar = definition({ itemId: 20, valueShape: 'single' });
        const reference = { ...createArrayReference(), mode: ARRAY_REFERENCE_VARIABLE };

        expect(validReference({ ...reference, variableType: ARRAY_VARIABLE_USER, variableToken: 'internal:@user_id' }, [])).toBe(true);
        expect(validReference({ ...reference, variableToken: 'custom:20' }, [scalar])).toBe(true);
        expect(validReference({ ...reference, variableItemId: 20 }, [scalar])).toBe(true);
        expect(validReference({ ...reference, variableToken: 'internal:@made_up' }, [])).toBe(false);
        expect(validReference({ ...reference, variableToken: 'custom:10' }, [definition()])).toBe(false);
        expect(validReference({ ...reference, variableToken: 'custom:21' }, [scalar])).toBe(false);
        expect(
            validAddress(
                { ...createArrayAddress(), mode: ARRAY_REFERENCE_VARIABLE, variableType: ARRAY_VARIABLE_USER, variableToken: 'internal:@user_id' },
                definition(),
                []
            )
        ).toBe(true);
    });

    it('uses the selected record field connector rather than a scalar connector on the same variable', () => {
        const array = definition({
            fields: [
                { id: 4, name: 'Kind', order: 0, textConnected: true },
                { id: 9, name: 'Count', order: 1 }
            ]
        });

        expect(arrayFieldIsTextConnected(array, 4, false)).toBe(true);
        expect(arrayFieldIsTextConnected(array, 9, true)).toBe(false);
        expect(arrayFieldIsTextConnected(undefined, 0, true)).toBe(true);
    });
});

it('hides read-only arrays from mutation destinations while keeping them available to readers', () => {
    const definitions = [definition({ writable: false, name: 'SharedInventory' })];
    const props = { definitions, variableType: ARRAY_VARIABLE_ROOM, itemId: 0, array: true, onTypeChange: vi.fn(), onItemChange: vi.fn() };
    const { rerender } = render(createElement(ArrayVariableSelect, { ...props, writableOnly: true }));

    expect(screen.queryByRole('option', { name: 'SharedInventory' })).not.toBeInTheDocument();
    rerender(createElement(ArrayVariableSelect, props));
    expect(screen.getByRole('option', { name: 'SharedInventory' })).toBeInTheDocument();
});
