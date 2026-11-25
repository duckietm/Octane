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

// Rows first: in a full chat area most pairs of bubbles sit on different rows, and that settles it at once.
const intersects = (first: LayoutBubble, second: LayoutBubble) =>
    first.colliderTop < second.colliderTop + second.colliderHeight &&
    first.colliderTop + first.colliderHeight > second.colliderTop &&
    first.colliderLeft < second.colliderLeft + second.colliderWidth &&
    first.colliderLeft + first.colliderWidth > second.colliderLeft;

/**
 * Layout passes one frame may run. A pass already repeats until the bubbles stop moving (up to its own limit), so
 * more passes only matter when that limit was hit; in a crowd, where a dozen bubbles ask for room in the same frame,
 * a pass per request tested every pair of 250 bubbles hundreds of times a frame.
 */
export const MAX_LAYOUT_PASSES_PER_FRAME = 2;

/** The passes for a frame in which `requests` bubbles asked for room: one more than the requests, up to the limit. */
export const layoutPassesFor = (requests: number): number => Math.max(1, Math.min(requests + 1, MAX_LAYOUT_PASSES_PER_FRAME));

export const resolveFreeFlowLayout = (bubbles: readonly FreeFlowLayoutBubble[]): FreeFlowLayoutPosition[] => {
    const resolved: LayoutBubble[] = bubbles.map((bubble) => {
        const layoutBubble: LayoutBubble = { ...bubble, colliderHeight: 0, colliderLeft: 0, colliderTop: 0, colliderWidth: 0 };

        refreshCollider(layoutBubble);

        return layoutBubble;
    });

    // A pair that did not touch in the last round and of which neither bubble moved since cannot touch now, so
    // from the second round on only pairs with a moved bubble are looked at. The order of the pairs is unchanged.
    let movedBefore: boolean[] = null;

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        let moved = false;
        const movedNow: boolean[] = new Array(resolved.length).fill(false);

        for (let firstIndex = 0; firstIndex < resolved.length; firstIndex++) {
            // Read per pair: an earlier pair of this round may have moved this bubble.
            for (let secondIndex = firstIndex + 1; secondIndex < resolved.length; secondIndex++) {
                if (movedBefore && !movedBefore[firstIndex] && !movedBefore[secondIndex] && !movedNow[firstIndex] && !movedNow[secondIndex]) continue;

                const first = resolved[firstIndex];
                const second = resolved[secondIndex];

                if (!intersects(first, second)) continue;

                movedNow[firstIndex] = true;
                movedNow[secondIndex] = true;

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

        movedBefore = movedNow;
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

/**
 * Runs a layout pass until the bubbles stop moving, at most `maxPasses` times, each pass starting where the last
 * one left the bubbles. Every collision moves a bubble by at least a pixel, so a pass that moves nothing means no
 * bubble overlaps and any further pass would change nothing: the result equals `maxPasses` chained passes.
 */
export const resolveUntilSettled = <TBubble extends FreeFlowLayoutBubble>(
    bubbles: readonly TBubble[],
    resolver: (bubbles: readonly FreeFlowLayoutBubble[]) => FreeFlowLayoutPosition[],
    maxPasses: number
): { positions: FreeFlowLayoutPosition[]; passes: number } => {
    let current: FreeFlowLayoutBubble[] = bubbles.map((bubble) => ({ ...bubble }));
    let positions: FreeFlowLayoutPosition[] = [];
    let passes = 0;

    while (passes < Math.max(1, maxPasses)) {
        positions = resolver(current);
        passes++;

        const byId = new Map(positions.map((position) => [position.id, position]));
        let moved = false;

        current = current.map((bubble) => {
            const position = byId.get(bubble.id);

            if (!position || (position.left === bubble.left && position.top === bubble.top)) return bubble;

            moved = true;

            return { ...bubble, left: position.left, top: position.top };
        });

        if (!moved) break;
    }

    return { positions, passes };
};

/** One animation frame for any number of layout requests: requests are counted and flushed together. */
export const createLayoutBatcher = (
    flush: (pending: number) => void,
    schedule: (callback: () => void) => number = (callback) => window.requestAnimationFrame(callback),
    cancel: (handle: number) => void = (handle) => window.cancelAnimationFrame(handle)
) => {
    let pending = 0;
    let handle: number = null;

    const run = () => {
        if (handle !== null) cancel(handle);

        handle = null;

        const count = pending;

        pending = 0;

        if (count > 0) flush(count);
    };

    return {
        request: () => {
            pending++;

            if (handle === null) handle = schedule(() => {
                handle = null;
                run();
            });
        },
        /** Flushes now what is pending, so a pass that follows starts from the settled layout. */
        flushNow: run,
        dispose: () => {
            if (handle !== null) cancel(handle);

            handle = null;
            pending = 0;
        }
    };
};
