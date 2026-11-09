/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { relocateLeaderboard } from './WiredLeaderboardPanelView';

describe('relocateLeaderboard', () => {
    it('moves within the tile while the offset fits', () => {
        expect(relocateLeaderboard({ tileX: 3, tileY: 4, offsetX: 0, altitude: 10 }, 20, -5)).toEqual({ tileX: 3, tileY: 4, offsetX: 20, altitude: 15 });
    });

    it('steps to the next tile when the offset passes 32', () => {
        expect(relocateLeaderboard({ tileX: 3, tileY: 4, offsetX: 0, altitude: 0 }, 40, 0)).toEqual({ tileX: 4, tileY: 4, offsetX: 8, altitude: 16 });
        expect(relocateLeaderboard({ tileX: 3, tileY: 4, offsetX: 0, altitude: 0 }, -40, 0)).toEqual({ tileX: 3, tileY: 5, offsetX: -8, altitude: 16 });
    });
});
