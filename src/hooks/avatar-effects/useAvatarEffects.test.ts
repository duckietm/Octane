/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { mergeAddedEffect, needsActivation, OwnedAvatarEffect } from './useAvatarEffects';

const effect = (overrides: Partial<OwnedAvatarEffect> = {}): OwnedAvatarEffect => ({
    type: 10,
    subType: 0,
    duration: 3600,
    inactiveCount: 1,
    secondsLeft: 0,
    isPermanent: false,
    ...overrides
});

describe('mergeAddedEffect', () => {
    it('adds an effect the user does not own', () => {
        expect(mergeAddedEffect([], effect())).toEqual([effect()]);
    });

    it('adds a timed copy to the stock and keeps the running time', () => {
        const merged = mergeAddedEffect([effect({ inactiveCount: 2, secondsLeft: 120 })], effect());

        expect(merged[0]).toMatchObject({ inactiveCount: 3, secondsLeft: 120, isPermanent: false });
    });

    it('makes an owned timed effect permanent', () => {
        const merged = mergeAddedEffect([effect({ secondsLeft: 120 })], effect({ isPermanent: true, duration: 2147483647 }));

        expect(merged[0]).toMatchObject({ isPermanent: true, secondsLeft: 120, inactiveCount: 1 });
    });
});

describe('needsActivation', () => {
    it('starts the timer of a timed effect that is not running', () => {
        expect(needsActivation(effect({ secondsLeft: 0 }))).toBe(true);
    });

    it('leaves a running timed effect alone, so choosing it again does not refill its time', () => {
        expect(needsActivation(effect({ secondsLeft: 1200 }))).toBe(false);
    });

    it('still activates a permanent effect and an effect the list does not know yet', () => {
        expect(needsActivation(effect({ isPermanent: true, secondsLeft: 1200 }))).toBe(true);
        expect(needsActivation(undefined)).toBe(true);
    });
});
