export interface FreeFlowLayoutBubble {
    id: number;
    left: number;
    top: number;
    width: number;
    height: number;
    anchorX: number;
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
    colliderWidth: number;
}

const refreshCollider = (bubble: LayoutBubble) => {
    bubble.colliderWidth = Math.max(MINIMUM_COLLIDER_WIDTH, bubble.width);
    bubble.colliderHeight = Math.max(1, bubble.height);
    bubble.colliderLeft = bubble.left - (bubble.colliderWidth - bubble.width) / 2;
};

const intersects = (first: LayoutBubble, second: LayoutBubble) => {
    const overlapsHorizontally =
        first.colliderLeft < second.colliderLeft + second.colliderWidth && first.colliderLeft + first.colliderWidth > second.colliderLeft;
    const overlapsVertically = first.top < second.top + second.colliderHeight && first.top + first.colliderHeight > second.top;

    return overlapsHorizontally && overlapsVertically;
};

export const resolveFreeFlowLayout = (bubbles: readonly FreeFlowLayoutBubble[]): FreeFlowLayoutPosition[] => {
    const resolved: LayoutBubble[] = bubbles.map((bubble) => {
        const layoutBubble: LayoutBubble = { ...bubble, colliderHeight: 0, colliderLeft: 0, colliderWidth: 0 };

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
                    if (Math.trunc(first.top) === Math.trunc(second.top)) {
                        const older = first.id < second.id ? first : second;

                        older.top -= Math.min(8, older.colliderHeight);
                    } else {
                        const top = first.top < second.top ? first : second;
                        const bottom = top === first ? second : first;
                        const verticalOverlap = top.top + top.colliderHeight - bottom.top + 1;

                        top.top -= Math.min(8, verticalOverlap);
                    }
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
