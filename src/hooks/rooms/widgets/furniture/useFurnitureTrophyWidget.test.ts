/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { TROPHY_VIEW_NIKO_GOLD, TROPHY_VIEW_NIKO_SILVER, resolveTrophyView } from './useFurnitureTrophyWidget';

describe('resolveTrophyView (official TrophyFurniWidgetHandler)', () => {
    it('switches to the Niko views for extra 10 and 20', () => {
        expect(resolveTrophyView('10')).toBe(TROPHY_VIEW_NIKO_SILVER);
        expect(resolveTrophyView('20')).toBe(TROPHY_VIEW_NIKO_GOLD);
    });

    it('keeps the plain trophy for every other extra', () => {
        expect(resolveTrophyView('0')).toBe(0);
        expect(resolveTrophyView('1')).toBe(0);
        expect(resolveTrophyView(null)).toBe(0);
        expect(resolveTrophyView('abc')).toBe(0);
    });
});
