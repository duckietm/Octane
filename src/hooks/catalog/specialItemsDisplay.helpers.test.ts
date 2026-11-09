import { describe, expect, it } from 'vitest';
import {
    carouselElementLayout,
    claimButtonFor,
    claimStateAfterAllVisited,
    claimStateAfterResponse,
    initialCarousel,
    initialClaimState,
    initialRotation,
    navigateCarousel,
    nextCarousel,
    parseSpecialItems,
    parseSpecialItemsLink,
    plaqueFor,
    previousCarousel,
    SpecialItemsClaimState,
    specialItemsRotationReducer,
    spotlightBlendFor,
    stepCarousel
} from './specialItemsDisplay.helpers';

const furni: Record<string, { id: number; name: string }> = {
    wf_storage_furni1: { id: 11, name: 'Furni Chest' },
    wf_storage_coins1: { id: 12, name: 'Credit Chest' }
};

const lookup = (className: string) => furni[className] ?? null;

const settle = (count: number, state = initialCarousel(), steps = 2000) => {
    let current = state;

    for (let i = 0; i < steps && current.animating; i++) current = stepCarousel(current, count, 16);

    return current;
};

describe('special items link and configuration', () => {
    it('reads the showcase key from special_items_display/<key>', () => {
        expect(parseSpecialItemsLink('special_items_display/chests')).toBe('chests');
        expect(parseSpecialItemsLink('special_items_display/')).toBe('');
        expect(parseSpecialItemsLink('special_items_display')).toBeNull();
    });

    it('keeps only furni entries the furnidata knows, indexed among the valid ones', () => {
        const items = parseSpecialItems('a,furni,wf_storage_furni1;b,furni,missing;c,badge,wf_storage_coins1;d,furni,wf_storage_coins1;broken', lookup);

        expect(items).toEqual([
            { index: 0, itemKey: 'a', classId: 11, furniName: 'Furni Chest' },
            { index: 1, itemKey: 'd', classId: 12, furniName: 'Credit Chest' }
        ]);
        expect(parseSpecialItems('', lookup)).toEqual([]);
    });
});

describe('free claim states', () => {
    it('fetches only when the showcase names a claim', () => {
        expect(initialClaimState('')).toBe(SpecialItemsClaimState.NOT_APPLICABLE);
        expect(initialClaimState('chests_starter')).toBe(SpecialItemsClaimState.FETCHING);
    });

    it('takes the has-claimed answer for its own claim while fetching', () => {
        expect(claimStateAfterResponse(SpecialItemsClaimState.FETCHING, 'x', 'x', false)).toBe(SpecialItemsClaimState.BROWSING);
        expect(claimStateAfterResponse(SpecialItemsClaimState.FETCHING, 'x', 'x', true)).toBe(SpecialItemsClaimState.CLAIMED);
        expect(claimStateAfterResponse(SpecialItemsClaimState.FETCHING, 'x', 'y', true)).toBe(SpecialItemsClaimState.FETCHING);
        expect(claimStateAfterResponse(SpecialItemsClaimState.CLAIMABLE, 'x', 'x', true)).toBe(SpecialItemsClaimState.CLAIMABLE);
    });

    it('becomes claimable once every item was seen while browsing', () => {
        expect(claimStateAfterAllVisited(SpecialItemsClaimState.BROWSING, 'x')).toBe(SpecialItemsClaimState.CLAIMABLE);
        expect(claimStateAfterAllVisited(SpecialItemsClaimState.FETCHING, 'x')).toBe(SpecialItemsClaimState.FETCHING);
        expect(claimStateAfterAllVisited(SpecialItemsClaimState.BROWSING, '')).toBe(SpecialItemsClaimState.BROWSING);
    });

    it('shows the official claim button per state', () => {
        expect(claimButtonFor(SpecialItemsClaimState.NOT_APPLICABLE).visible).toBe(false);
        expect(claimButtonFor(SpecialItemsClaimState.BROWSING)).toEqual({ visible: true, enabled: false, captionKey: 'special_items.claim' });
        expect(claimButtonFor(SpecialItemsClaimState.CLAIMABLE)).toEqual({ visible: true, enabled: true, captionKey: 'special_items.claim' });
        expect(claimButtonFor(SpecialItemsClaimState.CLAIMED)).toEqual({ visible: true, enabled: false, captionKey: 'special_items.claimed' });
    });
});

describe('carousel', () => {
    it('puts the centred item at the product template spot, fully focused', () => {
        const layout = carouselElementLayout(0, 0, 4);

        expect(layout.x).toBeCloseTo(70);
        expect(layout.y).toBeCloseTo(-40);
        expect(layout.focus).toBe(1);
        expect(layout.blend).toBe(1);
    });

    it('sends the other items round the back, taking the short way', () => {
        const back = carouselElementLayout(2, 0, 4);
        const wrapped = carouselElementLayout(3, 0, 4);

        expect(back.y).toBeCloseTo(-113);
        expect(back.focus).toBe(0);
        expect(back.blend).toBe(0.25);
        expect(wrapped.x).toBeCloseTo(-38);
        expect(carouselElementLayout(1, 0, 4).x).toBeCloseTo(178);
    });

    it('turns to the next item and settles exactly on it', () => {
        const moving = nextCarousel(initialCarousel(), 4);

        expect(moving).toMatchObject({ target: 1, animating: true, backwards: false });

        const settled = settle(4, moving);

        expect(settled).toMatchObject({ target: 1, position: 1, animating: false, extraCycles: 0 });
    });

    it('wraps backwards from the first item to the last', () => {
        const settled = settle(4, previousCarousel(initialCarousel(), 4));

        expect(settled).toMatchObject({ target: 3, position: 3, animating: false });
    });

    it('a page dot turns the short way round', () => {
        expect(navigateCarousel({ ...initialCarousel(), position: 3, target: 3 }, 0).backwards).toBe(true);
        expect(settle(4, navigateCarousel(initialCarousel(), 2))).toMatchObject({ position: 2, animating: false });
    });

    it('fades the plaque while the platform turns and restores it on arrival', () => {
        const moving = stepCarousel(nextCarousel(initialCarousel(), 4), 4, 16);

        expect(plaqueFor(moving, 0, 4).blend).toBeLessThan(1);
        expect(plaqueFor(settle(4, moving), 0, 4)).toEqual({ displayed: 1, blend: 1 });
        expect(spotlightBlendFor(1)).toBeCloseTo(1);
        expect(spotlightBlendFor(0.5)).toBe(0.4);
    });
});

describe('rotation reducer', () => {
    it('remembers every visited item and the plaque item', () => {
        let state = initialRotation();

        state = specialItemsRotationReducer(state, { type: 'next', count: 3 });
        for (let i = 0; i < 2000 && state.carousel.animating; i++) state = specialItemsRotationReducer(state, { type: 'tick', count: 3, deltaMs: 16 });

        expect([...state.visited].sort()).toEqual([0, 1]);
        expect(state.shown).toBe(1);
        expect(state.blend).toBe(1);

        state = specialItemsRotationReducer(state, { type: 'navigate', index: 2 });
        expect(state.visited.has(2)).toBe(true);
        expect(specialItemsRotationReducer(state, { type: 'reset' }).visited.size).toBe(1);
    });
});
