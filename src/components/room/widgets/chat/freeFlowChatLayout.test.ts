import { describe, expect, it } from 'vitest';
import { followFreeFlowAnchor, getChatViewerHeight, resolveFreeFlowLayout, resolveLineByLineLayout } from './freeFlowChatLayout';

describe('resolveFreeFlowLayout', () => {
    it('separates a shallow horizontal collision before stacking bubbles vertically', () => {
        const result = resolveFreeFlowLayout([
            { id: 1, left: 0, top: 100, width: 240, height: 26, anchorX: 120 },
            { id: 2, left: 230, top: 100, width: 240, height: 26, anchorX: 350 }
        ]);

        expect(result).toEqual([
            { id: 1, left: -5, top: 100, pointerX: 125 },
            { id: 2, left: 236, top: 100, pointerX: 114 }
        ]);
    });

    it('keeps the pointer inside the bubble margins when collision movement shifts the bubble away from its avatar', () => {
        const [result] = resolveFreeFlowLayout([{ id: 1, left: 100, top: 100, width: 120, height: 26, anchorX: 90 }]);

        expect(result.pointerX).toBe(28);
    });

    it('clears the older bubble completely when horizontal separation is too large', () => {
        const result = resolveFreeFlowLayout([
            { id: 1, left: 0, top: 100, width: 240, height: 26, anchorX: 120 },
            { id: 2, left: 0, top: 100, width: 240, height: 26, anchorX: 120 }
        ]);

        expect(result.map(({ id, top }) => ({ id, top }))).toEqual([
            { id: 1, top: 73 },
            { id: 2, top: 100 }
        ]);
    });

    it('keeps the artwork painted outside the bubble box clear of the bubble below it', () => {
        const result = resolveFreeFlowLayout([
            { id: 1, left: 0, top: 100, width: 240, height: 30, anchorX: 120, overflowTop: 2, overflowBottom: 5 },
            { id: 2, left: 0, top: 136, width: 240, height: 30, anchorX: 120, overflowTop: 2, overflowBottom: 5 }
        ]);

        expect(result.map(({ id, top }) => ({ id, top }))).toEqual([
            { id: 1, top: 98 },
            { id: 2, top: 136 }
        ]);
    });

    it('leaves bubbles alone once the painted artwork no longer overlaps', () => {
        const result = resolveFreeFlowLayout([
            { id: 1, left: 0, top: 100, width: 240, height: 30, anchorX: 120, overflowTop: 2, overflowBottom: 5 },
            { id: 2, left: 0, top: 138, width: 240, height: 30, anchorX: 120, overflowTop: 2, overflowBottom: 5 }
        ]);

        expect(result.map(({ id, top }) => ({ id, top }))).toEqual([
            { id: 1, top: 100 },
            { id: 2, top: 138 }
        ]);
    });

    it('keeps a taller new message below the shorter older one it spawns behind', () => {

        const result = resolveFreeFlowLayout([
            { id: 1, left: 0, top: 180, width: 240, height: 20, anchorX: 120 },
            { id: 2, left: 0, top: 160, width: 240, height: 40, anchorX: 120 }
        ]);
        const byId = new Map(result.map((bubble) => [bubble.id, bubble]));

        expect(byId.get(2).top).toBe(160);
        expect(byId.get(1).top + 20).toBeLessThanOrEqual(byId.get(2).top);
    });

    it('stacks a burst of bubbles from a single speaker without any of them overlapping', () => {
        const bubbles = Array.from({ length: 8 }, (unused, index) => ({
            id: index + 1,
            left: 0,
            top: 200,
            width: 240,
            height: 30,
            anchorX: 120,
            overflowTop: 2,
            overflowBottom: 5
        }));

        const result = resolveFreeFlowLayout(bubbles).sort((first, second) => first.top - second.top);

        result.forEach((bubble, index) => {
            if (!index) return;

            expect(bubble.top).toBeGreaterThanOrEqual(result[index - 1].top + 30 + 5 + 2);
        });

        // Top to bottom must read oldest to newest.
        expect(result.map(({ id }) => id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });
});

describe('getChatViewerHeight', () => {
    it('uses one quarter of the viewport when no valid override is configured', () => {
        expect(getChatViewerHeight(800)).toBe(200);
        expect(getChatViewerHeight(800, Number.NaN)).toBe(200);
    });

    it('preserves an explicit room-chat height override', () => {
        expect(getChatViewerHeight(800, 0.4)).toBe(320);
    });
});

describe('followFreeFlowAnchor', () => {
    it('moves a bubble by the avatar delta without discarding its collision offset', () => {
        expect(followFreeFlowAnchor(80, 100, 125)).toBe(105);
    });
});

describe('resolveLineByLineLayout', () => {
    it('gives every bubble its own row even when they are far apart sideways', () => {
        const result = resolveLineByLineLayout([
            { id: 1, left: 0, top: 100, width: 100, height: 26, anchorX: 50 },
            { id: 2, left: 900, top: 100, width: 100, height: 26, anchorX: 950 },
            { id: 3, left: 400, top: 100, width: 100, height: 26, anchorX: 450 }
        ]);

        expect(result.map(({ id, left, top }) => ({ id, left, top }))).toEqual([
            { id: 1, left: 0, top: 46 },
            { id: 2, left: 900, top: 73 },
            { id: 3, left: 400, top: 100 }
        ]);
    });

    it('leaves bubbles that already sit above each other alone', () => {
        const result = resolveLineByLineLayout([
            { id: 1, left: 0, top: 20, width: 100, height: 26, anchorX: 50 },
            { id: 2, left: 0, top: 100, width: 100, height: 26, anchorX: 50 }
        ]);

        expect(result.map(({ top }) => top)).toEqual([20, 100]);
    });
});
