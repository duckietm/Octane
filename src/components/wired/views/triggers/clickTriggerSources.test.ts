import { describe, expect, it } from 'vitest';
import { clickTriggerFurniSources, normalizeClickTriggerFurniSource } from './clickTriggerSources';

describe('click trigger furni sources', () => {
    it('offers only the picks and the selector to a box', () => {
        expect(clickTriggerFurniSources(100).map((option) => option.value)).toEqual([100, 200]);
        expect(clickTriggerFurniSources(200).map((option) => option.value)).toEqual([100, 200]);
    });

    it('keeps a stored triggering-furni source shown for that box', () => {
        expect(normalizeClickTriggerFurniSource(0)).toBe(0);
        expect(clickTriggerFurniSources(0).map((option) => option.value)).toEqual([100, 200, 0]);
    });

    it('maps unknown sources to the picks', () => {
        expect(normalizeClickTriggerFurniSource(201)).toBe(100);
    });
});
