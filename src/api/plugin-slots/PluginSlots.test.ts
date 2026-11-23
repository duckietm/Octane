import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPluginSlotEntries, isValidPluginSlot, registerPluginSlot, resetPluginSlots, subscribePluginSlots } from './PluginSlots';

describe('plugin slots', () => {
    afterEach(() => resetPluginSlots());

    it('lists what is registered in a slot, in order, and takes each one out on its own', () => {
        const first = vi.fn();
        const second = vi.fn();
        const removeFirst = registerPluginSlot('mod-tools.start-panel', first);
        registerPluginSlot('mod-tools.start-panel', second);

        expect(getPluginSlotEntries('mod-tools.start-panel').map((entry) => entry.mount)).toEqual([first, second]);

        removeFirst();
        removeFirst();

        expect(getPluginSlotEntries('mod-tools.start-panel').map((entry) => entry.mount)).toEqual([second]);
    });

    it('keeps the same list until the slot changes', () => {
        registerPluginSlot('a', () => undefined);
        const before = getPluginSlotEntries('a');

        registerPluginSlot('b', () => undefined);
        expect(getPluginSlotEntries('a')).toBe(before);
        expect(getPluginSlotEntries('empty')).toBe(getPluginSlotEntries('also-empty'));
    });

    it('tells its listeners about every change', () => {
        const heard = vi.fn();
        const stop = subscribePluginSlots(heard);
        const remove = registerPluginSlot('a', () => undefined);
        remove();
        stop();
        registerPluginSlot('a', () => undefined);

        expect(heard).toHaveBeenCalledTimes(2);
    });

    it('refuses a bad slot name or something that is not a function', () => {
        expect(isValidPluginSlot('Mod Tools')).toBe(false);
        expect(isValidPluginSlot('x'.repeat(65))).toBe(false);

        registerPluginSlot('Mod Tools', () => undefined);
        registerPluginSlot('ok', 'not a function' as never);

        expect(getPluginSlotEntries('Mod Tools')).toHaveLength(0);
        expect(getPluginSlotEntries('ok')).toHaveLength(0);
    });
});
