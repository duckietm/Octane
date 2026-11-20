import { describe, expect, it } from 'vitest';
import { hasActiveWiredClickSettings, resolveWiredClickSettingsUpdate } from './wiredClickSettingsStore';

const base = { userOption: 0, furniOption: 0, ignored: false, canWrite: false };

describe('resolveWiredClickSettingsUpdate', () => {
    it('does nothing for an unchanged packet', () => {
        expect(resolveWiredClickSettingsUpdate({ ...base, userOption: 2 }, { userOption: 2, furniOption: 0 })).toEqual({
            ignored: false,
            apply: false,
            notice: 'none'
        });
    });

    it('applies and announces a change to a visitor', () => {
        expect(resolveWiredClickSettingsUpdate(base, { userOption: 2, furniOption: 1 })).toEqual({ ignored: false, apply: true, notice: 'changed' });
    });

    it('gives an editor the staying switch instead of a bubble while settings are active', () => {
        expect(resolveWiredClickSettingsUpdate({ ...base, canWrite: true }, { userOption: 0, furniOption: 1 })).toEqual({
            ignored: false,
            apply: true,
            notice: 'none'
        });
    });

    it('announces the return to the default settings to an editor', () => {
        expect(resolveWiredClickSettingsUpdate({ ...base, canWrite: true, furniOption: 1 }, { userOption: 0, furniOption: 0 })).toEqual({
            ignored: false,
            apply: true,
            notice: 'changed'
        });
    });

    it('keeps ignoring a change and says so', () => {
        expect(resolveWiredClickSettingsUpdate({ ...base, canWrite: true, ignored: true, userOption: 1 }, { userOption: 2, furniOption: 0 })).toEqual({
            ignored: true,
            apply: false,
            notice: 'changed_ignored'
        });
    });

    it('stops ignoring once the room is back on the default settings', () => {
        expect(resolveWiredClickSettingsUpdate({ ...base, canWrite: true, ignored: true, userOption: 1 }, { userOption: 0, furniOption: 0 })).toEqual({
            ignored: false,
            apply: true,
            notice: 'changed'
        });
    });

    it('stops ignoring for an editor who lost the right, even on an unchanged packet', () => {
        expect(resolveWiredClickSettingsUpdate({ ...base, ignored: true, userOption: 2 }, { userOption: 2, furniOption: 0 })).toEqual({
            ignored: false,
            apply: true,
            notice: 'changed'
        });
    });
});

describe('hasActiveWiredClickSettings', () => {
    it('is true for anything but the defaults', () => {
        expect(hasActiveWiredClickSettings({ userOption: 0, furniOption: 0 })).toBe(false);
        expect(hasActiveWiredClickSettings({ userOption: 1, furniOption: 0 })).toBe(true);
        expect(hasActiveWiredClickSettings({ userOption: 0, furniOption: 1 })).toBe(true);
    });
});
