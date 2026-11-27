import { describe, expect, it } from 'vitest';
import { HandheldEnvironment, parseHandheldForce, resolveHandheldLayout, resolveKeyboardInset } from './handheldLayout';

const phone = (overrides: Partial<HandheldEnvironment> = {}): HandheldEnvironment => ({
    width: 390,
    height: 844,
    coarsePointer: true,
    finePointerAttached: false,
    enabled: true,
    forced: null,
    ...overrides
});

describe('resolveHandheldLayout', () => {
    it('takes a phone-sized touch screen for a phone, in both orientations', () => {
        expect(resolveHandheldLayout(phone())).toEqual({ active: true, orientation: 'portrait' });
        expect(resolveHandheldLayout(phone({ width: 844, height: 390 }))).toEqual({ active: true, orientation: 'landscape' });
    });

    it('keeps the desktop layout for a mouse, also in a narrow browser window', () => {
        expect(resolveHandheldLayout(phone({ coarsePointer: false, width: 400, height: 700 })).active).toBe(false);
    });

    it('keeps the desktop layout for a touch screen with a mouse attached', () => {
        expect(resolveHandheldLayout(phone({ finePointerAttached: true })).active).toBe(false);
    });

    it('keeps the desktop layout on tablets and touch laptops', () => {
        expect(resolveHandheldLayout(phone({ width: 820, height: 1180 })).active).toBe(false);
        expect(resolveHandheldLayout(phone({ width: 1366, height: 500 })).active).toBe(false);
    });

    it('is off for the whole hotel when the configuration key is false, even when forced on', () => {
        expect(resolveHandheldLayout(phone({ enabled: false })).active).toBe(false);
        expect(resolveHandheldLayout(phone({ enabled: false, forced: 'on' })).active).toBe(false);
    });

    it('follows a forced choice over the measurement', () => {
        expect(resolveHandheldLayout(phone({ forced: 'off' })).active).toBe(false);
        expect(resolveHandheldLayout(phone({ coarsePointer: false, width: 1920, height: 1080, forced: 'on' }))).toEqual({ active: true, orientation: 'landscape' });
    });

    it('does not take an unmeasured (0 x 0) window for a phone', () => {
        expect(resolveHandheldLayout(phone({ width: 0, height: 0 })).active).toBe(false);
    });
});

describe('parseHandheldForce', () => {
    it('reads on / off / auto and ignores anything else', () => {
        expect(parseHandheldForce('on')).toBe('on');
        expect(parseHandheldForce(' OFF ')).toBe('off');
        expect(parseHandheldForce('1')).toBe('on');
        expect(parseHandheldForce('auto')).toBe('auto');
        expect(parseHandheldForce('phone')).toBeUndefined();
        expect(parseHandheldForce(null)).toBeUndefined();
    });
});

describe('resolveKeyboardInset', () => {
    it('measures the covered part while a text field has the focus', () => {
        expect(resolveKeyboardInset({ layoutHeight: 844, visualHeight: 500, visualOffsetTop: 0, textFieldFocused: true })).toBe(344);
        expect(resolveKeyboardInset({ layoutHeight: 844, visualHeight: 500, visualOffsetTop: 40, textFieldFocused: true })).toBe(304);
    });

    it('ignores browser chrome moving and a shrunk viewport without a focused field', () => {
        expect(resolveKeyboardInset({ layoutHeight: 844, visualHeight: 790, visualOffsetTop: 0, textFieldFocused: true })).toBe(0);
        expect(resolveKeyboardInset({ layoutHeight: 844, visualHeight: 500, visualOffsetTop: 0, textFieldFocused: false })).toBe(0);
    });
});
