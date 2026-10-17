import { describe, expect, it, vi } from 'vitest';

vi.mock('@octane/renderer', () => {
    class Triggerable {
        _intParams: number[] = [];
        _stringParam = '';
        _stuffIds: number[] = [];
        _id = 0;
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
        get code() {
            return this._type;
        }
    }

    class WiredAddonDefinition extends Triggerable {}
    class WiredSelectorDefinition extends Triggerable {}
    class WiredVariableDefinition extends Triggerable {}

    return { Triggerable, WiredActionDefinition, TriggerDefinition, ConditionDefinition, WiredAddonDefinition, WiredSelectorDefinition, WiredVariableDefinition };
});

import { ConditionDefinition, TriggerDefinition, WiredActionDefinition } from '@octane/renderer';
import { pasteTriggerableData, resetTriggerableData, wiredClipboardKeyOf, withTriggerableData } from './WiredClipboard';

const action = (code: number) => {
    const box = new (WiredActionDefinition as any)();
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
        const trigger = new (TriggerDefinition as any)();
        trigger._triggerConf = 4;
        expect(wiredClipboardKeyOf(trigger)).toBe('trigger:4');
        const condition = new (ConditionDefinition as any)();
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

    it('paste takes everything, paste-into keeps the picks and the delay', () => {
        const entry = { key: 'action:7', intParams: [3], stringParam: 'copied', furniIds: [42], delayInPulses: 2 };

        const pasted = pasteTriggerableData(action(7), entry, false);
        expect(pasted.intData).toEqual([3]);
        expect(pasted.selectedItems).toEqual([42]);
        expect(pasted.delayInPulses).toBe(2);

        const merged = pasteTriggerableData(action(7), entry, true);
        expect(merged.intData).toEqual([3]);
        expect(merged.stringData).toBe('copied');
        expect(merged.selectedItems).toEqual([900, 901]);
        expect(merged.delayInPulses).toBe(4);
    });
});
