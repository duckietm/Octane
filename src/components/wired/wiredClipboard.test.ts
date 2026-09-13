import { Triggerable } from '@octane/renderer';
import { describe, expect, it } from 'vitest';
import { copyWiredConfig, hasWiredConfig, readWiredConfig, wiredClipboardKey } from './wiredClipboard';

class TriggerDefinition {
    constructor(public code: number) {}
}

class WiredActionDefinition {
    constructor(public code: number) {}
}

const box = (instance: object) => instance as unknown as Triggerable;

const seed = (value: number) => ({ intParams: [value], stringParam: `s${value}`, furniIds: [value], variableIds: [] });

describe('wired clipboard', () => {
    // The official client keys its clipboard by holder and code, which is why a configuration
    // can only ever be pasted back into a box of the same type.
    it('keys an entry by box kind and code', () => {
        expect(wiredClipboardKey(box(new TriggerDefinition(6)))).toBe('TriggerDefinition-6');
        expect(wiredClipboardKey(box(new WiredActionDefinition(6)))).toBe('WiredActionDefinition-6');
        expect(wiredClipboardKey(null)).toBe('');
    });

    it('offers a copy back only to a box of the same kind and code', () => {
        copyWiredConfig(box(new TriggerDefinition(11)), seed(1));

        expect(hasWiredConfig(box(new TriggerDefinition(11)))).toBe(true);
        expect(hasWiredConfig(box(new TriggerDefinition(12)))).toBe(false);
        expect(hasWiredConfig(box(new WiredActionDefinition(11)))).toBe(false);
        expect(readWiredConfig(box(new WiredActionDefinition(11)))).toBeNull();
    });

    it('stores a detached copy, so editing the box afterwards cannot change it', () => {
        const original = seed(3);

        copyWiredConfig(box(new TriggerDefinition(21)), original);
        original.intParams.push(99);
        original.furniIds.push(99);

        const stored = readWiredConfig(box(new TriggerDefinition(21)));

        expect(stored.intParams).toEqual([3]);
        expect(stored.furniIds).toEqual([3]);
        expect(stored.stringParam).toBe('s3');
    });

    it('replaces the entry when the same box is copied again', () => {
        copyWiredConfig(box(new TriggerDefinition(31)), seed(4));
        copyWiredConfig(box(new TriggerDefinition(31)), seed(5));

        expect(readWiredConfig(box(new TriggerDefinition(31))).intParams).toEqual([5]);
    });
});
