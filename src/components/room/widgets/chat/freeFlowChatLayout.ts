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

// ---------------------------------------------------------------------------
// Bubble rules mirrored from the official PooledChatBubble.
// ---------------------------------------------------------------------------

// On desktop a bubble never sits under the left toolbar column nor under the
// right-hand panels, whatever its speaker's position.
export const DESKTOP_MARGIN_LEFT = 85;
export const DESKTOP_MARGIN_RIGHT = 190;

// Below this viewport width the client shows the phone layout, where the
// official client skips the desktop margins altogether.
export const DESKTOP_STAGE_MIN_WIDTH = 640;

// A bubble taller than this (scaled by the chat font size) still shows in
// full, but only this much of it takes part in the collisions.
export const BUBBLE_MAX_HEIGHT = 108;

// A bubble glides to a new position in 150 ms and stays hidden for its first
// 150 ms so the reader never sees it jump into place.
export const BUBBLE_GLIDE_DURATION_MS = 150;
export const BUBBLE_REVEAL_DELAY_MS = 150;

const HIGHLIGHT_LINK_PREFIX = 'highlight/';
const BASE_CHAT_TEXT_SIZE_PIXELS = 14;

export const isDesktopChatStage = (stageWidth: number): boolean => stageWidth >= DESKTOP_STAGE_MIN_WIDTH;

export const clampBubbleLeftToDesktopMargins = (left: number, width: number, stageWidth: number): number => {
    if (!isDesktopChatStage(stageWidth)) return left;

    let clamped = left;

    const maxLeft = stageWidth - DESKTOP_MARGIN_RIGHT - width;

    if (clamped > maxLeft) clamped = maxLeft;

    // The left margin wins when the stage is too narrow for both.
    if (clamped < DESKTOP_MARGIN_LEFT) clamped = DESKTOP_MARGIN_LEFT;

    return clamped;
};

/**
 * The official chat font scale is 1 for the default size and grows with the
 * larger sizes; a size smaller than the default keeps the base collision box.
 */
export const getChatFontSizeScale = (textSizePixels: number): number =>
    Number.isFinite(textSizePixels) && textSizePixels > BASE_CHAT_TEXT_SIZE_PIXELS ? textSizePixels / BASE_CHAT_TEXT_SIZE_PIXELS : 1;

export const getBubbleMaxHeight = (fontSizeScale: number): number => Math.floor(BUBBLE_MAX_HEIGHT * fontSizeScale);

export const getBubbleCollisionHeight = (height: number, fontSizeScale: number): number => Math.min(height, getBubbleMaxHeight(fontSizeScale));

/**
 * A "highlight/<text>" link in a bubble is not a destination: the official
 * client shows the text as a hint next to the pointer and never navigates.
 * Returns the hint text, or null for any other link.
 */
export const getHighlightHint = (href: string): string | null => {
    const index = (href || '').indexOf(HIGHLIGHT_LINK_PREFIX);

    if (index < 0) return null;

    const raw = href.slice(index + HIGHLIGHT_LINK_PREFIX.length);

    let text = raw;

    try {
        text = decodeURIComponent(raw);
    } catch {
        // A malformed escape shows as typed rather than crashing the click.
    }

    return text.toLocaleUpperCase();
};

/**
 * Line-by-line mode: every bubble collides with every other one across the
 * whole width, so each line gets its own row. The newest stays where it was
 * born, older lines are pushed up; each keeps its speaker's horizontal spot.
 */
export const resolveLineByLineLayout = (bubbles: readonly FreeFlowLayoutBubble[]): FreeFlowLayoutPosition[] => {
    const ordered = [...bubbles].sort((a, b) => a.id - b.id);
    const tops = new Map<number, number>();

    for (let index = ordered.length - 1; index >= 0; index--) {
        const bubble = ordered[index];
        const newer = ordered[index + 1];

        if (!newer) {
            tops.set(bubble.id, bubble.top);
            continue;
        }

        const newerTop = tops.get(newer.id) - (newer.overflowTop || 0);
        const clearance = newerTop - bubble.height - (bubble.overflowBottom || 0) - VERTICAL_GAP;

        tops.set(bubble.id, Math.min(bubble.top, clearance));
    }

    return bubbles.map((bubble) => ({
        id: bubble.id,
        left: bubble.left,
        top: tops.get(bubble.id),
        pointerX: Math.max(POINTER_LEFT_MARGIN, Math.min(bubble.width - POINTER_RIGHT_MARGIN, bubble.anchorX - bubble.left))
    }));
};
