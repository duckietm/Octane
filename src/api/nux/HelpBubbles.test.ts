import { describe, expect, it } from 'vitest';
import { HELP_BUBBLE_ANCHORS, HELP_BUBBLE_ICON_ENUM, isLastHelpBubble, parseHelpBubbleLink, placeHelpBubble } from './HelpBubbles';
import { decodeNuxGiftSeparator, getNuxGiftCaption, getNuxGiftOptionName, getNuxGiftThumbnailUrl, selectNuxGift } from './NuxGifts';

describe('HelpBubbles', () => {
    it('parses the server step links into key/text pairs', () => {
        expect(parseHelpBubbleLink('helpBubble/add/BOTTOM_BAR_NAVIGATOR/Open the navigator')).toEqual({
            action: 'add',
            items: [{ name: 'NAVIGATOR', text: 'Open the navigator' }]
        });
        expect(parseHelpBubbleLink('helpBubble/add/CHAT_INPUT/a/CREDITS_BUTTON/b')).toEqual({
            action: 'add',
            items: [
                { name: 'chat_input', text: 'a' },
                { name: 'credit_count_button', text: 'b' }
            ]
        });
        expect(parseHelpBubbleLink('helpBubble/remove/CHAT_INPUT')).toEqual({ action: 'remove', name: 'chat_input' });
        expect(parseHelpBubbleLink('helpBubble/add')).toBeNull();
        expect(parseHelpBubbleLink('helpBubble/add/custom_key/text')).toEqual({ action: 'add', items: [{ name: 'custom_key', text: 'text' }] });
    });

    it('has an element for every key the server sends', () => {
        for (const key of ['BOTTOM_BAR_RECEPTION', 'BOTTOM_BAR_NAVIGATOR', 'CHAT_INPUT', 'CHAT_HISTORY_BUTTON', 'MEMENU_CLOTHES', 'BOTTOM_BAR_CATALOGUE', 'CREDITS_BUTTON', 'DUCKETS_BUTTON', 'DIAMONDS_BUTTON', 'FRIENDS_BAR_ALL_FRIENDS']) {
            expect(HELP_BUBBLE_ANCHORS[HELP_BUBBLE_ICON_ENUM[key]]?.length).toBeGreaterThan(0);
        }
    });

    it('puts the bubble above its element and below it near the top', () => {
        const above = placeHelpBubble({ x: 100, y: 700, width: 40, height: 40 }, 180, 120, 1000);

        expect(above).toEqual({ x: 30, y: 565, direction: 'down', arrowX: 90 });

        const below = placeHelpBubble({ x: 900, y: 20, width: 40, height: 20 }, 180, 120, 1000);

        expect(below.direction).toBe('up');
        expect(below.y).toBe(50);
        expect(below.x).toBe(810);
        expect(below.arrowX).toBe(110);
    });

    it('marks the last bubble of the queue', () => {
        expect(isLastHelpBubble(2, 0)).toBe(false);
        expect(isLastHelpBubble(2, 1)).toBe(true);
    });
});

describe('NuxGifts', () => {
    const option = { thumbnailUrl: 'nux/cat.png', products: [{ itemName: 'pet0', extraInfo: null }, { itemName: 'food', extraInfo: 'nux.gift.cat' }] };

    it('names and pictures an option', () => {
        expect(decodeNuxGiftSeparator('%20+%20')).toBe(' + ');
        expect(getNuxGiftOptionName(option, (product) => product.extraInfo ?? product.itemName, ' + ')).toBe('pet0 + nux.gift.cat');
        expect(getNuxGiftThumbnailUrl('lib/', option)).toBe('lib/nux/cat.png');
        expect(getNuxGiftThumbnailUrl('lib/', { ...option, thumbnailUrl: null })).toBeNull();
        expect(getNuxGiftCaption('Pick', 0, 2)).toBe('Pick 1/2');
        expect(getNuxGiftCaption('Pick', 0, 1)).toBe('Pick');
    });

    it('collects one choice per step', () => {
        const steps = [
            { dayIndex: 1, stepIndex: 3, options: [option] },
            { dayIndex: 2, stepIndex: 1, options: [option] }
        ];
        const first = selectNuxGift(steps, 0, [], 2);

        expect(first).toEqual({ current: 1, selections: [{ dayIndex: 1, stepIndex: 3, giftIndex: 2 }], done: false });
        expect(selectNuxGift(steps, 1, first.selections, 0).done).toBe(true);
    });
});
