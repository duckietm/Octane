/**
 * Pure parts of the special items display, ported from the official client's
 * `SpecialItemsController` / `SpecialItemsView` / `SpecialItemElementView`
 * (`com/sulake/habbo/catalog/special_items_display`).
 */

/** `special_items_display/<key>`: the link that opens a showcase. */
export const SPECIAL_ITEMS_LINK_PREFIX = 'special_items_display/';

/** The only item type the official controller builds (`FurniSpecialItem`). */
export const SPECIAL_ITEM_TYPE_FURNI = 'furni';

export const SpecialItemsClaimState = {
    NOT_APPLICABLE: 0,
    FETCHING: 1,
    BROWSING: 2,
    CLAIMABLE: 3,
    CLAIMED: 4
} as const;

export type SpecialItemsClaimStateValue = (typeof SpecialItemsClaimState)[keyof typeof SpecialItemsClaimState];

export interface SpecialItem {
    /** Position in the showcase (only valid items count). */
    index: number;
    /** `special_items.<set>.body.<itemKey>.title|desc` */
    itemKey: string;
    /** Floor furni type id (`FurnitureData.id`). */
    classId: number;
    /** The furni's own name, used when the showcase has no title for the item. */
    furniName: string;
}

export interface SpecialItemsFurniLookup {
    (className: string): { id: number; name?: string } | null | undefined;
}

/** `special_items_display/<key>` -> `<key>`; null for anything else. */
export const parseSpecialItemsLink = (link: string): string | null => {
    if (!link) return null;

    const parts = link.split('/');

    if (parts.length < 2) return null;

    return parts[1] ?? '';
};

/**
 * `special_items.<key>.items`: `itemKey,type,furniClassName` entries separated by `;`.
 * Only `furni` entries whose class name is in the furnidata count, as in the official
 * `parseSpecialItems`; their index is their position among the valid ones.
 */
export const parseSpecialItems = (raw: string, findFloorFurni: SpecialItemsFurniLookup): SpecialItem[] => {
    const items: SpecialItem[] = [];

    if (!raw) return items;

    for (const entry of raw.split(';')) {
        const [itemKey = '', type = '', className = ''] = entry.split(',', 3).map((part) => part.trim());

        if (type !== SPECIAL_ITEM_TYPE_FURNI || !className) continue;

        const furni = findFloorFurni(className);

        if (!furni || furni.id === undefined || furni.id === null || furni.id === -1) continue;

        items.push({ index: items.length, itemKey, classId: furni.id, furniName: furni.name ?? '' });
    }

    return items;
};

/** The state a fresh showcase starts in: fetching when it names a free claim. */
export const initialClaimState = (freeClaim: string): SpecialItemsClaimStateValue =>
    freeClaim && freeClaim.length > 0 ? SpecialItemsClaimState.FETCHING : SpecialItemsClaimState.NOT_APPLICABLE;

/** `onHasClaimedProductResponse`: only the answer for our claim, and only while fetching. */
export const claimStateAfterResponse = (
    state: SpecialItemsClaimStateValue,
    freeClaim: string,
    claimId: string,
    claimed: boolean
): SpecialItemsClaimStateValue => {
    if (claimId !== freeClaim || state !== SpecialItemsClaimState.FETCHING) return state;

    return claimed ? SpecialItemsClaimState.CLAIMED : SpecialItemsClaimState.BROWSING;
};

/** Every item has been looked at: a browsing showcase becomes claimable. */
export const claimStateAfterAllVisited = (state: SpecialItemsClaimStateValue, freeClaim: string): SpecialItemsClaimStateValue =>
    freeClaim && state === SpecialItemsClaimState.BROWSING ? SpecialItemsClaimState.CLAIMABLE : state;

/** The claim button's caption key and whether it can be pressed. */
export const claimButtonFor = (state: SpecialItemsClaimStateValue): { visible: boolean; enabled: boolean; captionKey: string } => {
    switch (state) {
        case SpecialItemsClaimState.NOT_APPLICABLE:
            return { visible: false, enabled: false, captionKey: 'special_items.claim' };
        case SpecialItemsClaimState.CLAIMABLE:
            return { visible: true, enabled: true, captionKey: 'special_items.claim' };
        case SpecialItemsClaimState.CLAIMED:
            return { visible: true, enabled: false, captionKey: 'special_items.claimed' };
        default:
            return { visible: true, enabled: false, captionKey: 'special_items.claim' };
    }
};

/* ---------------------------------------------------------------- carousel */

export interface CarouselState {
    /** The item navigated to (`var_300`). */
    target: number;
    /** The rotation, a fractional item index in [0, count] (`var_187`). */
    position: number;
    /** Current rotation speed in items per second (`var_961`). */
    speed: number;
    backwards: boolean;
    /** Whole extra turns still to make when next/previous was pressed mid-rotation. */
    extraCycles: number;
    animating: boolean;
}

export const initialCarousel = (): CarouselState => ({ target: 0, position: 0, speed: 0, backwards: false, extraCycles: 0, animating: false });

/** `SpecialItemsView.navigateTo`. */
export const navigateCarousel = (state: CarouselState, index: number, keepCycles: boolean = false, backwards: boolean = false): CarouselState => {
    const next = { ...state, target: index };

    if (!keepCycles) {
        next.extraCycles = 0;
        backwards = state.position > index;
    }

    next.backwards = backwards;

    if (!state.animating) {
        next.speed = 0;
        next.animating = true;
    }

    return next;
};

/** The next button. */
export const nextCarousel = (state: CarouselState, count: number): CarouselState => {
    if (count <= 0) return state;

    const wasForward = state.animating && !state.backwards;
    const next = navigateCarousel(state, (state.target + 1) % count, true, false);

    next.extraCycles = Math.max(0, next.extraCycles);

    if (wasForward && ((next.position > next.target - 1 && next.position < next.target) || (next.position > count - 1 && next.target === 0)))
        next.extraCycles += 1;

    return next;
};

/** The previous button. */
export const previousCarousel = (state: CarouselState, count: number): CarouselState => {
    if (count <= 0) return state;

    const wasBackwards = state.animating && state.backwards;
    const next = navigateCarousel(state, (state.target - 1 + count) % count, true, true);

    next.extraCycles = Math.min(0, next.extraCycles);

    if (wasBackwards && next.position > next.target && next.position < next.target + 1) next.extraCycles -= 1;

    return next;
};

/** `SpecialItemsView.update`: one animation step of `deltaMs`. */
export const stepCarousel = (state: CarouselState, count: number, deltaMs: number): CarouselState => {
    if (!state.animating) return state;

    if (count <= 0) return { ...state, animating: false };

    const framesPerSecond = 1000 / Math.max(deltaMs, 1);
    const next = { ...state };
    let distance = next.target - next.position;

    if (distance > 0 && next.backwards) distance -= count;
    else if (distance < 0 && !next.backwards) distance += count;

    if ((!next.backwards && next.extraCycles > 0) || (next.backwards && next.extraCycles < 0)) distance += next.extraCycles * count;

    let speed = Math.abs(distance) * 2;

    speed = speed > next.speed ? next.speed * 0.95 + speed * 0.05 : next.speed * 0.85 + speed * 0.15;
    speed = Math.max(0.05, speed);

    let move = speed / framesPerSecond;

    if (next.backwards) move *= -1;

    next.speed = speed;

    if ((!next.backwards && move > distance) || (next.backwards && move < distance)) {
        next.animating = false;
        next.position = next.target;
        next.extraCycles = 0;

        return next;
    }

    next.position += move;

    if (next.extraCycles !== 0) {
        const rest = distance % count;

        if (next.extraCycles > 0 && !next.backwards && move > rest) next.extraCycles -= 1;
        else if (next.extraCycles < 0 && next.backwards && move < rest) next.extraCycles += 1;
    }

    if (next.position > count) next.position -= count;
    else if (next.position < 0) next.position += count;

    return next;
};

export interface CarouselElementLayout {
    /** Left of the 200x200 product box inside `item_rotation`. */
    x: number;
    /** Top of the 200x200 product box inside `item_rotation`. */
    y: number;
    /** 0..1, how far forward the item is (front = 1). Drives the stacking order. */
    depth: number;
    /** The product image's alpha. */
    blend: number;
    /** 1 when the item is centred, falling to 0 half an item away. */
    focus: number;
}

/** `SpecialItemElementView`: where an item sits on the rotating platform. */
export const carouselElementLayout = (index: number, position: number, count: number): CarouselElementLayout => {
    let offset = index - position;
    const forward = offset + count;
    const backward = offset - count;

    if (Math.abs(forward) < Math.abs(offset)) offset = forward;
    else if (Math.abs(backward) < Math.abs(offset)) offset = backward;

    const focus = Math.abs(offset) < 0.5 ? 1 - Math.abs(offset) * 2 : 0;
    const degrees = Math.min(Math.max(180 + 90 * offset, 0), 360);
    const radians = (degrees * Math.PI) / 180;
    const px = 0.5 - 0.5 * Math.sin(radians);
    const py = 0.5 - 0.5 * Math.cos(radians);

    let blend = py;

    if (count <= 4) blend = Math.max(0.25, blend);
    else if (blend < 0.05) blend = 0;

    blend = Math.min(blend, 1);

    return { x: px * 216 - 80 + 42, y: py * 73 - 113, depth: py, blend, focus };
};

/** `updatePlaqueAndSpotlight`: which item the plaque shows and how visible it is. */
export const plaqueFor = (state: CarouselState, displayed: number, count: number): { displayed: number; blend: number } => {
    if (!state.animating) return { displayed: state.target, blend: 1 };

    let blend = displayed !== -1 && displayed < count ? carouselElementLayout(displayed, state.position, count).focus : 0;

    if (displayed !== state.target && displayed !== -1 && blend === 0) displayed = -1;

    if (displayed !== state.target && state.extraCycles === 0 && state.speed < Math.min(2, count - 1)) {
        const focus = carouselElementLayout(state.target, state.position, count).focus;

        if (focus > blend) {
            blend = focus;
            displayed = state.target;
        }
    }

    return { displayed, blend };
};

/** The spotlight dims to 0.4 unless an item stands (nearly) centred. */
export const spotlightBlendFor = (plaqueBlend: number): number => (plaqueBlend > 0.8 ? 0.4 + ((plaqueBlend - 0.8) / 0.2) * 0.6 : 0.4);

/* ---------------------------------------------------------------- rotation */

export interface SpecialItemsRotation {
    carousel: CarouselState;
    /** The item the plaque points at (-1 while it fades between items). */
    displayed: number;
    /** The item whose title and description the plaque holds. */
    shown: number;
    /** Plaque (and product icon) alpha. */
    blend: number;
    /** Indices viewed at least once; all of them makes the free claim claimable. */
    visited: ReadonlySet<number>;
}

export type SpecialItemsRotationAction =
    | { type: 'reset' }
    | { type: 'navigate'; index: number }
    | { type: 'next'; count: number }
    | { type: 'previous'; count: number }
    | { type: 'tick'; count: number; deltaMs: number };

export const initialRotation = (): SpecialItemsRotation => ({ carousel: initialCarousel(), displayed: 0, shown: 0, blend: 1, visited: new Set([0]) });

const visit = (visited: ReadonlySet<number>, index: number): ReadonlySet<number> => {
    if (visited.has(index)) return visited;

    const next = new Set(visited);

    next.add(index);

    return next;
};

export const specialItemsRotationReducer = (state: SpecialItemsRotation, action: SpecialItemsRotationAction): SpecialItemsRotation => {
    switch (action.type) {
        case 'reset':
            return initialRotation();
        case 'navigate': {
            const carousel = navigateCarousel(state.carousel, action.index);

            return { ...state, carousel, visited: visit(state.visited, carousel.target) };
        }
        case 'next':
        case 'previous': {
            if (action.count <= 0) return state;

            const carousel = action.type === 'next' ? nextCarousel(state.carousel, action.count) : previousCarousel(state.carousel, action.count);

            return { ...state, carousel, visited: visit(state.visited, carousel.target) };
        }
        case 'tick': {
            if (!state.carousel.animating) return state;

            const carousel = stepCarousel(state.carousel, action.count, action.deltaMs);
            const plaque = plaqueFor(carousel, state.displayed, action.count);

            return { ...state, carousel, displayed: plaque.displayed, shown: plaque.displayed !== -1 ? plaque.displayed : state.shown, blend: plaque.blend };
        }
    }

    return state;
};
