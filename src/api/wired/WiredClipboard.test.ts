import { describe, expect, it, vi } from 'vitest';

vi.mock('@octane/renderer', () => {
    class Triggerable {
        _intParams: number[] = [];
        _stringParam = '';
        _stuffIds: number[] = [];
        _stuffIds2: number[] = [];
        _furniSourceTypes: number[] = [];
        _userSourceTypes: number[] = [];
        _defaultIntParams: number[] = [];
        _inputSourcesConf: unknown = null;
        _id = 0;
        get defaultIntParams() {
            return this._defaultIntParams;
        }
        get inputSourcesConf() {
            return this._inputSourcesConf;
        }
        get furniSourceTypes() {
            return this._furniSourceTypes;
        }
        get userSourceTypes() {
            return this._userSourceTypes;
        }
        get selectedItems2() {
            return this._stuffIds2;
        }
        get id() {
            return this._id;
        }
        get intData() {
            return this._intParams;
        }
        get stringData() {
            return this._stringParam;
        }
        get selectedItems() {
            return this._stuffIds;
        }
        get code() {
            return 0;
        }
    }
    class WiredActionDefinition extends Triggerable {
        _type = 0;
        _delayInPulses = 0;
        get code() {
            return this._type;
        }
        get delayInPulses() {
            return this._delayInPulses;
        }
    }
    class TriggerDefinition extends Triggerable {
        _triggerConf = 0;
        get code() {
            return this._triggerConf;
        }
    }
    class ConditionDefinition extends Triggerable {
        _type = 0;
        _quantifierCode = 0;
        get code() {
            return this._type;
        }
        get quantifierCode() {
            return this._quantifierCode;
        }
    }

    class WiredAddonDefinition extends Triggerable {}
    class WiredSelectorDefinition extends Triggerable {}
    class WiredVariableDefinition extends Triggerable {}

    return { Triggerable, WiredActionDefinition, TriggerDefinition, ConditionDefinition, WiredAddonDefinition, WiredSelectorDefinition, WiredVariableDefinition };
});

import { ConditionDefinition, TriggerDefinition, WiredActionDefinition } from '@octane/renderer';
import { pasteTriggerableData, removeFurniFromWiredPicks, resetTriggerableData, wiredClipboardKeyOf, withServerDefaultIntParams, withTriggerableData } from './WiredClipboard';

const action = (code: number) => {
    const box = new (WiredActionDefinition as any)() as any;
    box._id = 77;
    box._type = code;
    box._intParams = [5, 200];
    box._stringParam = 'hello';
    box._stuffIds = [900, 901];
    box._delayInPulses = 4;

    return box as WiredActionDefinition;
};

describe('WiredClipboard', () => {
    it('keys a slot by holder and code', () => {
        expect(wiredClipboardKeyOf(action(7))).toBe('action:7');
        const trigger = new (TriggerDefinition as any)() as any;
        trigger._triggerConf = 4;
        expect(wiredClipboardKeyOf(trigger)).toBe('trigger:4');
        const condition = new (ConditionDefinition as any)() as any;
        condition._type = 9;
        expect(wiredClipboardKeyOf(condition)).toBe('condition:9');
    });

    it('replaces the data on a copy that is still the same kind of box', () => {
        const box = action(7);
        const copy = withTriggerableData(box, { intParams: [1], stringParam: 'x', furniIds: [1], delayInPulses: 9 });

        expect(copy).not.toBe(box);
        expect(copy instanceof WiredActionDefinition).toBe(true);
        expect(copy.id).toBe(77);
        expect(copy.code).toBe(7);
        expect(copy.intData).toEqual([1]);
        expect(copy.stringData).toBe('x');
        expect(copy.selectedItems).toEqual([1]);
        expect(copy.delayInPulses).toBe(9);
        // the original is untouched
        expect(box.intData).toEqual([5, 200]);
        expect(box.delayInPulses).toBe(4);
    });

    it('resets a box to the catalog defaults', () => {
        const fresh = resetTriggerableData(action(7));

        expect(fresh.intData).toEqual([]);
        expect(fresh.stringData).toBe('');
        expect(fresh.selectedItems).toEqual([]);
        expect(fresh.delayInPulses).toBe(0);
    });

    it('resets to the server defaults: int params, sources, no second picks, quantifier all', () => {
        const box = new (ConditionDefinition as any)() as any;
        box._intParams = [5];
        box._stuffIds2 = [3];
        box._furniSourceTypes = [201, 201];
        box._userSourceTypes = [11];
        box._quantifierCode = 1;
        box._defaultIntParams = [10, 0, 1];
        box._inputSourcesConf = { furniAllowed: [[0, 100], [0, 100]], userAllowed: [[0]], furniDefaults: [0, 100], userDefaults: [0] };

        const fresh = resetTriggerableData(box) as any;

        expect(fresh.intData).toEqual([10, 0, 1]);
        expect(fresh.selectedItems2).toEqual([]);
        expect(fresh.furniSourceTypes).toEqual([0, 100]);
        expect(fresh.userSourceTypes).toEqual([0]);
        expect(fresh.quantifierCode).toBe(0);
        // the server's defaults are copied, not shared
        expect(fresh.intData).not.toBe(box._defaultIntParams);
    });

    it('opens a box without int params on the server defaults', () => {
        const box = action(7) as any;
        box._intParams = [];
        box._defaultIntParams = [0, -1, 0];

        expect(withServerDefaultIntParams(box).intData).toEqual([0, -1, 0]);

        const saved = action(7) as any;
        saved._defaultIntParams = [0, -1, 0];

        expect(withServerDefaultIntParams(saved)).toBe(saved);
    });

    it('paste takes everything, paste-into keeps the picks and the delay', () => {
        const entry = { key: 'action:7', intParams: [3], stringParam: 'copied', furniIds: [42], delayInPulses: 2, variableIds: ['user:5'] };

        const pasted = pasteTriggerableData(action(7), entry, false);
        expect(pasted.intData).toEqual([3]);
        expect(pasted.selectedItems).toEqual([42]);
        expect(pasted.delayInPulses).toBe(2);

        const merged = pasteTriggerableData(action(7), entry, true);
        expect(merged.intData).toEqual([3]);
        expect(merged.stringData).toBe('copied');
        // The variables are settings too: they travel in the variable ids.
        expect((merged as unknown as { _variableIds: string[] })._variableIds).toEqual(['user:5']);
        expect(merged.selectedItems).toEqual([900, 901]);
        expect(merged.delayInPulses).toBe(4);
    });

    it('paste restores the second picks, sources, variable ids and quantifier too (official ClipboardWiredEntry)', () => {
        const condition = new (ConditionDefinition as any)() as any;
        condition._type = 9;
        condition._stuffIds2 = [1];
        condition._quantifierCode = 0;

        const entry = {
            key: 'condition:9',
            intParams: [2],
            stringParam: '',
            furniIds: [10],
            delayInPulses: 0,
            furniIds2: [11, 12],
            furniSourceTypes: [100, 101],
            userSourceTypes: [0],
            variableIds: ['v1'],
            quantifierCode: 1
        };
        const pasted = pasteTriggerableData(condition, entry, false) as any;

        expect(pasted.selectedItems).toEqual([10]);
        expect(pasted.selectedItems2).toEqual([11, 12]);
        expect(pasted.furniSourceTypes).toEqual([100, 101]);
        expect(pasted.userSourceTypes).toEqual([0]);
        expect(pasted._variableIds).toEqual(['v1']);
        expect(pasted.quantifierCode).toBe(1);
        // copied, not shared
        expect(pasted.selectedItems2).not.toBe(entry.furniIds2);
    });

    it('a removed furni closes the editor when it is the open box, else leaves both pick lists', () => {
        expect(removeFurniFromWiredPicks(77, [1, 2], [3], 77).closesEditor).toBe(true);

        const dropped = removeFurniFromWiredPicks(77, [1, 2], [2, 3], 2);
        expect(dropped).toEqual({ closesEditor: false, furniIds: [1], furniIds2: [3], changed: true });

        const untouched = removeFurniFromWiredPicks(77, [1], [3], 9);
        expect(untouched.changed).toBe(false);
        expect(untouched.furniIds).toEqual([1]);
    });
});
