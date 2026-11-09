import { describe, expect, it } from 'vitest';
import {
    parseWiredArrayCapturePayload,
    parseWiredCheckArrayPayload,
    parseWiredModifyArrayPayload,
    serializeWiredArrayCapturePayload,
    serializeWiredCheckArrayPayload,
    serializeWiredModifyArrayPayload,
    WIRED_ARRAY_COMPARISON_EQUALS,
    WIRED_ARRAY_MODE_VARIABLE,
    WIRED_ARRAY_OPERATION_APPEND,
    WIRED_ARRAY_OPERATION_CLEAR_SLOT,
    WIRED_ARRAY_OPERATION_SET_ENTRY,
    WIRED_ARRAY_OPERATION_SWAP,
    WIRED_ARRAY_SIMPLE_FIELD_ID,
    WIRED_ARRAY_TYPE_USER,
    wiredArrayCaptureIntParams,
    wiredArrayFieldsOf,
    wiredArrayOperationsFor,
    wiredCheckArrayIntParams,
    wiredModifyArrayIntParams
} from './WiredArrays';

/**
 * These payloads are read by Gson straight onto the emulator's own classes, so the property names
 * are the contract. A rename on either side silently drops the setting to its default instead of
 * failing, which is exactly the kind of break worth a test.
 */

const MODIFY_FROM_SERVER = JSON.stringify({
    delay: 4,
    fieldInputs: {
        '1': { address: {}, capturePath: '', mode: 0, value: '7', variableItemId: 0, variableSource: 0, variableToken: '', variableType: 1 }
    },
    firstIndex: { capturePath: '', fieldId: 1, mode: 0, value: 3, variableItemId: 0, variableSource: 0, variableToken: '', variableType: 1 },
    itemIds: [11, 12],
    maxOwnersPerExecution: 50,
    metadataVersion: 1,
    operation: WIRED_ARRAY_OPERATION_SET_ENTRY,
    ownerSource: 100,
    secondIndex: { capturePath: '', fieldId: 1, mode: 0, value: 0, variableItemId: 0, variableSource: 0, variableToken: '', variableType: 1 },
    variableDefinitions: [
        {
            arrayFormat: 'record',
            arrayMode: 'slots',
            fields: [
                { id: 2, name: 'score', order: 1, textConnected: false },
                { id: 1, name: 'name', order: 0, textConnected: true }
            ],
            hasValue: true,
            itemId: 900,
            maxEntries: 16,
            name: 'leaderboard',
            permanent: true,
            valueShape: 'array',
            variableType: WIRED_ARRAY_TYPE_USER,
            writable: true
        }
    ],
    variableItemId: 900,
    variableType: WIRED_ARRAY_TYPE_USER
});

describe('wired array payloads', () => {
    it('reads a Modify Array box the emulator sent', () => {
        const payload = parseWiredModifyArrayPayload(MODIFY_FROM_SERVER);

        expect(payload.variableItemId).toBe(900);
        expect(payload.operation).toBe(WIRED_ARRAY_OPERATION_SET_ENTRY);
        expect(payload.firstIndex.value).toBe(3);
        expect(payload.fieldInputs.get(1)?.value).toBe('7');
        expect(payload.variableDefinitions[0].fields).toHaveLength(2);
    });

    it('sends back every field the emulator reads, and no definitions', () => {
        const sent = JSON.parse(serializeWiredModifyArrayPayload(parseWiredModifyArrayPayload(MODIFY_FROM_SERVER)));

        expect(Object.keys(sent).sort()).toEqual([
            'delay',
            'fieldInputs',
            'firstIndex',
            'itemIds',
            'metadataVersion',
            'operation',
            'ownerSource',
            'secondIndex',
            'variableItemId',
            'variableType'
        ]);
        // Gson reads the map back keyed by field id, so the keys stay numeric strings.
        expect(sent.fieldInputs['1'].value).toBe('7');
        // The room's array list is the server's to send, not the client's to echo.
        expect(sent.variableDefinitions).toBeUndefined();
    });

    it('puts the int params in the order each box reads them', () => {
        const modify = parseWiredModifyArrayPayload(MODIFY_FROM_SERVER);

        expect(wiredModifyArrayIntParams(modify)).toEqual([WIRED_ARRAY_TYPE_USER, WIRED_ARRAY_OPERATION_SET_ENTRY, 100]);

        const check = parseWiredCheckArrayPayload('{"conditionMode":1,"stateCheck":3,"quantifier":1,"variableType":2,"ownerSource":11}');
        const checkParams = wiredCheckArrayIntParams(check);

        // The owners' all / any choice goes in the save packet's quantifier slot, not in the ints.
        expect(checkParams).toHaveLength(9);
        expect(checkParams[2]).toBe(1);
        expect(checkParams[7]).toBe(3);
        // Slot 6 is the legacy comparison the box no longer reads, but the count has to line up.
        expect(checkParams[6]).toBe(WIRED_ARRAY_COMPARISON_EQUALS);

        const capture = parseWiredArrayCapturePayload('{"captureMode":1,"findDirection":2,"criteriaMode":1,"variableType":0}');

        expect(wiredArrayCaptureIntParams(capture)).toEqual([0, 0, 1, 2, 1]);
    });

    it('falls back to defaults rather than throwing on a payload it cannot read', () => {
        for (const raw of ['', 'not json', '{"variableItemId":']) {
            expect(parseWiredModifyArrayPayload(raw).operation).toBe(WIRED_ARRAY_OPERATION_APPEND);
            expect(parseWiredCheckArrayPayload(raw).criteria).toEqual([]);
            expect(parseWiredArrayCapturePayload(raw).contextVariableItemId).toBe(0);
        }
    });

    it('offers only the operations the array mode supports', () => {
        const slots = wiredArrayOperationsFor('slots').map((operation) => operation.code);
        const list = wiredArrayOperationsFor('list').map((operation) => operation.code);

        // Emptying one slot is meaningless on a list, and appending is meaningless on fixed slots.
        expect(slots).toContain(WIRED_ARRAY_OPERATION_CLEAR_SLOT);
        expect(slots).not.toContain(WIRED_ARRAY_OPERATION_APPEND);
        expect(list).toContain(WIRED_ARRAY_OPERATION_APPEND);
        expect(list).not.toContain(WIRED_ARRAY_OPERATION_CLEAR_SLOT);
        // Swapping two entries works either way, and is the one that needs a second index.
        expect(slots).toContain(WIRED_ARRAY_OPERATION_SWAP);
        expect(list).toContain(WIRED_ARRAY_OPERATION_SWAP);
    });

    it('gives a simple array one unnamed field and a record array its own, in order', () => {
        const record = parseWiredModifyArrayPayload(MODIFY_FROM_SERVER).variableDefinitions[0];

        expect(wiredArrayFieldsOf(record).map((field) => field.name)).toEqual(['name', 'score']);
        expect(wiredArrayFieldsOf({ ...record, arrayFormat: 'simple' }).map((field) => field.id)).toEqual([WIRED_ARRAY_SIMPLE_FIELD_ID]);
        expect(wiredArrayFieldsOf(null)).toEqual([]);
    });

    it('keeps a reference value as text so a long survives the round trip', () => {
        // WiredArrayReference.value is a String on the Java side precisely because an array value is
        // a long: quoted, it survives; as a JSON number it would already have been rounded by the
        // time JSON.parse handed it over.
        const payload = parseWiredCheckArrayPayload(
            '{"criteria":[{"comparison":0,"fieldId":1,"reference":{"mode":1,"value":"9007199254740993","variableToken":"custom:4"}}]}'
        );

        expect(payload.criteria[0].reference.mode).toBe(WIRED_ARRAY_MODE_VARIABLE);
        expect(payload.criteria[0].reference.value).toBe('9007199254740993');

        const sent = JSON.parse(serializeWiredCheckArrayPayload(payload));

        expect(sent.criteria[0].reference.value).toBe('9007199254740993');
        expect(sent.criteria[0].reference.variableToken).toBe('custom:4');
    });

    it('keeps the capture target and its criteria', () => {
        const payload = parseWiredArrayCapturePayload('{"contextVariableItemId":42,"criteria":[{"fieldId":2,"comparison":5}]}');
        const sent = JSON.parse(serializeWiredArrayCapturePayload(payload));

        expect(sent.contextVariableItemId).toBe(42);
        expect(sent.criteria[0].comparison).toBe(5);
        expect(sent.variableDefinitions).toBeUndefined();
    });
});
