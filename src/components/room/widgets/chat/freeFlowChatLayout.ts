export interface FreeFlowLayoutBubble {
    id: number;
    left: number;
    top: number;
    width: number;
    height: number;
    anchorX: number;
    overflowTop?: number;
    overflowBottom?: number;
}

export interface FreeFlowLayoutPosition {
    id: number;
    left: number;
    top: number;
    pointerX: number;
}

const MINIMUM_COLLIDER_WIDTH = 240;
const MAX_COLLISION_SIDEWAYS_IMPULSE = 15;
const MAX_ITERATIONS = 20;
const VERTICAL_GAP = 1;
const POINTER_LEFT_MARGIN = 28;
const POINTER_RIGHT_MARGIN = 15;
const DEFAULT_VIEWPORT_HEIGHT_PERCENTAGE = 0.25;

export const getChatViewerHeight = (viewportHeight: number, configuredPercentage?: number): number => {
    const percentage =
        Number.isFinite(configuredPercentage) && configuredPercentage > 0 && configuredPercentage <= 1
            ? configuredPercentage
            : DEFAULT_VIEWPORT_HEIGHT_PERCENTAGE;

    return Math.round(viewportHeight * percentage);
};

export const followFreeFlowAnchor = (bubbleLeft: number, previousAnchorX: number, nextAnchorX: number): number => bubbleLeft + (nextAnchorX - previousAnchorX);

interface LayoutBubble extends FreeFlowLayoutBubble {
    colliderHeight: number;
    colliderLeft: number;
    colliderTop: number;
    colliderWidth: number;
}

const refreshCollider = (bubble: LayoutBubble) => {
    const overflowTop = bubble.overflowTop || 0;
    const overflowBottom = bubble.overflowBottom || 0;

    bubble.colliderWidth = Math.max(MINIMUM_COLLIDER_WIDTH, bubble.width);
    bubble.colliderTop = bubble.top - overflowTop;
    bubble.colliderHeight = Math.max(1, bubble.height + overflowTop + overflowBottom);
    bubble.colliderLeft = bubble.left - (bubble.colliderWidth - bubble.width) / 2;
};

const intersects = (first: LayoutBubble, second: LayoutBubble) => {
    const overlapsHorizontally =
        first.colliderLeft < second.colliderLeft + second.colliderWidth && first.colliderLeft + first.colliderWidth > second.colliderLeft;
    const overlapsVertically =
        first.colliderTop < second.colliderTop + second.colliderHeight && first.colliderTop + first.colliderHeight > second.colliderTop;

    return overlapsHorizontally && overlapsVertically;
};

export const resolveFreeFlowLayout = (bubbles: readonly FreeFlowLayoutBubble[]): FreeFlowLayoutPosition[] => {
    const resolved: LayoutBubble[] = bubbles.map((bubble) => {
        const layoutBubble: LayoutBubble = { ...bubble, colliderHeight: 0, colliderLeft: 0, colliderTop: 0, colliderWidth: 0 };

        refreshCollider(layoutBubble);

        return layoutBubble;
    });

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        let moved = false;

        for (let firstIndex = 0; firstIndex < resolved.length; firstIndex++) {
            for (let secondIndex = firstIndex + 1; secondIndex < resolved.length; secondIndex++) {
                const first = resolved[firstIndex];
                const second = resolved[secondIndex];

                if (!intersects(first, second)) continue;

                const left = first.left < second.left ? first : second;
                const right = left === first ? second : first;
                const horizontalOverlap = Math.abs(left.colliderLeft + left.colliderWidth - right.colliderLeft) / 2;

                if (horizontalOverlap <= MAX_COLLISION_SIDEWAYS_IMPULSE) {
                    left.left -= horizontalOverlap;
                    right.left += horizontalOverlap + 1;
                    refreshCollider(left);
                    refreshCollider(right);
                    moved = true;
                } else {
                    const older = first.id < second.id ? first : second;
                    const newer = older === first ? second : first;
                    const amount = Math.max(VERTICAL_GAP, older.colliderTop + older.colliderHeight - newer.colliderTop + VERTICAL_GAP);

                    older.top -= amount;
                    refreshCollider(older);
                    moved = true;
                }
            }
        }

        if (!moved) break;
    }

    return resolved.map((bubble) => ({
        id: bubble.id,
        left: bubble.left,
        top: bubble.top,
        pointerX: Math.max(POINTER_LEFT_MARGIN, Math.min(bubble.width - POINTER_RIGHT_MARGIN, bubble.anchorX - bubble.left))
    }));
};

/**
 * Line-by-line mode: every bubble collides with every other one across the whole width, so each
 * gets its own row. Bubbles keep their x; older ones are pushed up above newer ones.
 */
export const resolveLineByLineLayout = (bubbles: readonly FreeFlowLayoutBubble[]): FreeFlowLayoutPosition[] => {
    const newestFirst = [...bubbles].sort((first, second) => second.id - first.id);
    const tops = new Map<number, number>();
    let limit = Number.POSITIVE_INFINITY;

    for (const bubble of newestFirst) {
        const overflowTop = bubble.overflowTop || 0;
        const overflowBottom = bubble.overflowBottom || 0;
        let top = bubble.top;

        if (top + bubble.height + overflowBottom > limit) top = limit - bubble.height - overflowBottom;

        tops.set(bubble.id, top);
        limit = top - overflowTop - VERTICAL_GAP;
    }

    return bubbles.map((bubble) => ({
        id: bubble.id,
        left: bubble.left,
        top: tops.get(bubble.id),
        pointerX: Math.max(POINTER_LEFT_MARGIN, Math.min(bubble.width - POINTER_RIGHT_MARGIN, bubble.anchorX - bubble.left))
    }));
};
