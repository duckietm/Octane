import { describe, expect, it } from 'vitest';
import { followFreeFlowAnchor, getChatViewerHeight, resolveFreeFlowLayout } from './freeFlowChatLayout';

const countOverlaps = (
    bubbles: Array<{ id: number; left: number; top: number; width: number; height: number }>,
    positions: ReturnType<typeof resolveFreeFlowLayout>
) => {
    const positioned = bubbles.map((bubble) => ({ ...bubble, ...positions.find((position) => position.id === bubble.id) }));
    let overlaps = 0;

    for (let firstIndex = 0; firstIndex < positioned.length; firstIndex++) {
        for (let secondIndex = firstIndex + 1; secondIndex < positioned.length; secondIndex++) {
            const first = positioned[firstIndex];
            const second = positioned[secondIndex];
            const firstWidth = Math.max(240, first.width);
            const secondWidth = Math.max(240, second.width);
            const firstLeft = first.left - (firstWidth - first.width) / 2;
            const secondLeft = second.left - (secondWidth - second.width) / 2;
            const overlapsHorizontally = firstLeft < secondLeft + secondWidth && firstLeft + firstWidth > secondLeft;
            const overlapsVertically = first.top < second.top + second.height && first.top + first.height > second.top;

            if (overlapsHorizontally && overlapsVertically) overlaps++;
        }
    }

    return overlaps;
};
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

    it('separates the full visible height when two bubbles start at the same position', () => {
        const result = resolveFreeFlowLayout([
            { id: 1, left: 0, top: 100, width: 240, height: 26, anchorX: 120 },
            { id: 2, left: 0, top: 100, width: 240, height: 26, anchorX: 120 }
        ]);

        expect(result.map(({ id, top }) => ({ id, top }))).toEqual([
            { id: 1, top: 73 },
            { id: 2, top: 100 }
        ]);
    });

    it('removes visible overlap when the DOM measurement excludes the absolute pointer', () => {
        const result = resolveFreeFlowLayout([
            { id: 1, left: 0, top: 100, width: 240, height: 30, anchorX: 120 },
            { id: 2, left: 0, top: 120, width: 240, height: 30, anchorX: 120 }
        ]);

        expect(result.map(({ id, top }) => ({ id, top }))).toEqual([
            { id: 1, top: 89 },
            { id: 2, top: 120 }
        ]);
    });

    it('fully separates tall bubbles without relying on a fixed iteration budget', () => {
        const bubbles = [
            { id: 1, left: 0, top: 100, width: 240, height: 200, anchorX: 120 },
            { id: 2, left: 0, top: 100, width: 240, height: 200, anchorX: 120 }
        ];

        expect(countOverlaps(bubbles, resolveFreeFlowLayout(bubbles))).toBe(0);
    });

    it('leaves no overlaps after a dense burst of chat bubbles', () => {
        const bubbles = Array.from({ length: 25 }, (_, index) => ({
            id: index + 1,
            left: 0,
            top: 100,
            width: 240,
            height: 26,
            anchorX: 120
        }));

        expect(countOverlaps(bubbles, resolveFreeFlowLayout(bubbles))).toBe(0);
    });

    it('rechecks mixed bubbles in their final vertical order', () => {
        const bubbles = [
            { id: 1, left: 548, top: 246, width: 231, height: 38, anchorX: 466 },
            { id: 2, left: -61, top: 264, width: 102, height: 132, anchorX: 53 },
            { id: 3, left: 4, top: 210, width: 500, height: 111, anchorX: 210 },
            { id: 4, left: 154, top: -100, width: 107, height: 128, anchorX: 260 },
            { id: 5, left: -128, top: 118, width: 164, height: 212, anchorX: 574 },
            { id: 6, left: 307, top: 255, width: 304, height: 200, anchorX: 92 },
            { id: 7, left: -44, top: 96, width: 210, height: 38, anchorX: 303 },
            { id: 8, left: 53, top: -26, width: 443, height: 54, anchorX: 593 },
            { id: 9, left: 143, top: -37, width: 130, height: 65, anchorX: 375 },
            { id: 10, left: 569, top: -94, width: 175, height: 176, anchorX: 332 },
            { id: 11, left: 254, top: 290, width: 127, height: 152, anchorX: 700 },
            { id: 12, left: -89, top: 31, width: 503, height: 224, anchorX: 251 },
            { id: 13, left: -32, top: -28, width: 572, height: 30, anchorX: 687 },
            { id: 14, left: 461, top: 16, width: 507, height: 202, anchorX: 663 },
            { id: 15, left: 484, top: 214, width: 281, height: 102, anchorX: 59 },
            { id: 16, left: -147, top: 116, width: 298, height: 109, anchorX: 550 },
            { id: 17, left: 50, top: 190, width: 316, height: 231, anchorX: 610 },
            { id: 18, left: -84, top: -21, width: 292, height: 131, anchorX: 169 }
        ];

        expect(countOverlaps(bubbles, resolveFreeFlowLayout(bubbles))).toBe(0);
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
