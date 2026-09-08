import { describe, expect, it } from 'vitest';
import { resolveCanCreateRoomOutcome } from './useNavigatorStore';

describe('CanCreateRoom outcome (class_1873.onCanCreateRoom)', () => {
    it('opens the creator on a positive answer whoever asks', () => {
        expect(resolveCanCreateRoomOutcome(0, false)).toBe('open');
        expect(resolveCanCreateRoomOutcome(0, true)).toBe('open');
    });

    it('tells a club member the limit without the upsell', () => {
        expect(resolveCanCreateRoomOutcome(1, true)).toBe('limit');
    });

    it('tells everyone else the limit with the HC promo', () => {
        expect(resolveCanCreateRoomOutcome(1, false)).toBe('limit-promo');
    });
});
