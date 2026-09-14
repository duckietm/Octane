import { describe, expect, it } from 'vitest';
import { resolveNuxGiftOptionName, resolveNuxGiftSeparator, resolveNuxGiftTitle, selectNuxGiftOption, shouldOfferNoobLobby } from './nuxGifts';

const texts: Record<string, string> = {
    'nux.gift.selection.separator': '%20+%20',
    'nux.gift.dog': 'Dog',
    product_credits_name: 'Credits'
};
const lookup = (key: string) => texts[key] ?? key;

describe('resolveNuxGiftOptionName', () => {
    it('names the products by their key, the product text or the code', () => {
        const gift = {
            thumbnailUrl: null,
            productOfferList: [
                { itemName: 'pet_dog', extraInfo: 'nux.gift.dog' },
                { itemName: 'credits', extraInfo: null },
                { itemName: 'tv_youtube', extraInfo: null }
            ]
        };

        expect(resolveNuxGiftOptionName(gift, lookup, ' + ')).toBe('Dog + Credits + tv_youtube');
    });
});

describe('resolveNuxGiftSeparator', () => {
    it('decodes the URI encoded separator and falls back to a comma', () => {
        expect(resolveNuxGiftSeparator(lookup)).toBe(' + ');
        expect(resolveNuxGiftSeparator(() => '')).toBe(', ');
    });
});

describe('resolveNuxGiftTitle', () => {
    it('counts the steps only when there is more than one', () => {
        expect(resolveNuxGiftTitle('Choose gift option', 0, 1)).toBe('Choose gift option');
        expect(resolveNuxGiftTitle('Choose gift option', 1, 3)).toBe('Choose gift option 2/3');
    });
});

describe('selectNuxGiftOption', () => {
    const steps = [
        {
            dayIndex: 1,
            stepIndex: 0,
            options: [
                { thumbnailUrl: null, productOfferList: [] },
                { thumbnailUrl: null, productOfferList: [] }
            ]
        },
        { dayIndex: 1, stepIndex: 1, options: [{ thumbnailUrl: null, productOfferList: [] }] }
    ];

    it('records the choice and completes after the last step', () => {
        const first = selectNuxGiftOption(steps, [], 0, 1);

        expect(first).toEqual({ selections: [{ dayIndex: 1, stepIndex: 0, giftIndex: 1 }], nextStep: 1, complete: false });

        const second = selectNuxGiftOption(steps, first.selections, 1, 0);

        expect(second.complete).toBe(true);
        expect(second.selections).toHaveLength(2);
    });

    it('ignores an option outside the step', () => {
        expect(selectNuxGiftOption(steps, [], 0, 5)).toEqual({ selections: [], nextStep: 0, complete: false });
    });
});

describe('shouldOfferNoobLobby', () => {
    it('only fires for a real newbie entering the home room with lobbies enabled', () => {
        expect(shouldOfferNoobLobby({ lobbiesEnabled: true, isRealNoob: true, roomId: 5, homeRoomId: 5 })).toBe(true);
        expect(shouldOfferNoobLobby({ lobbiesEnabled: false, isRealNoob: true, roomId: 5, homeRoomId: 5 })).toBe(false);
        expect(shouldOfferNoobLobby({ lobbiesEnabled: true, isRealNoob: false, roomId: 5, homeRoomId: 5 })).toBe(false);
        expect(shouldOfferNoobLobby({ lobbiesEnabled: true, isRealNoob: true, roomId: 6, homeRoomId: 5 })).toBe(false);
    });
});
