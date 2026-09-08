import { describe, expect, it } from 'vitest';
import { WiredActionLayoutCode, WiredConditionlayout, WiredTriggerLayout } from '../../../api';
import { WiredActionLayoutView } from './actions/WiredActionLayoutView';
import { WiredConditionLayoutView } from './conditions/WiredConditionLayoutView';
import { WiredTriggerLayoutView } from './triggers/WiredTriggerLayoutView';

/**
 * Every layout code the client declares must open a window. A code that maps to nothing lets a box
 * open an empty dialog with no save button and no explanation, which is worse than not declaring
 * the code at all: the server never sends it, so nothing is lost by dropping it.
 */
const declaredCodes = (registry: object): number[] => Object.values(registry).filter((value): value is number => typeof value === 'number');

const missingWindows = (registry: object, layoutView: (code: number) => unknown): number[] =>
    declaredCodes(registry).filter((code) => layoutView(code) === null || layoutView(code) === undefined);

describe('wired layout registries', () => {
    it('declares codes for every family', () => {
        expect(declaredCodes(WiredTriggerLayout).length).toBeGreaterThan(20);
        expect(declaredCodes(WiredConditionlayout).length).toBeGreaterThan(40);
        expect(declaredCodes(WiredActionLayoutCode).length).toBeGreaterThan(100);
    });

    it('opens a window for every trigger code', () => {
        expect(missingWindows(WiredTriggerLayout, WiredTriggerLayoutView)).toEqual([]);
    });

    it('opens a window for every condition code', () => {
        expect(missingWindows(WiredConditionlayout, WiredConditionLayoutView)).toEqual([]);
    });

    it('opens a window for every action, selector and extra code', () => {
        expect(missingWindows(WiredActionLayoutCode, WiredActionLayoutView)).toEqual([]);
    });
});
