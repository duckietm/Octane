import { describe, expect, it } from 'vitest';
import { getHelpBubbleModalStrips, parseHelpBubbleLink, placeHelpBubble, resolveHelpBubbleElementName } from './uiHelpBubbles.helpers';

describe('helpBubble link protocol (UiHelpBubblesWidget.linkReceived)', () => {
    it('queues name/text pairs from helpBubble/add and resolves enum names to element ids', () => {
        expect(parseHelpBubbleLink('helpBubble/add/BOTTOM_BAR_NAVIGATOR/nux.bubble.navigator/chat_input/nux.bubble.chat')).toEqual({
            type: 'add',
            items: [
                { name: 'HTIE_ICON_NAVIGATOR', textKey: 'nux.bubble.navigator' },
                { name: 'chat_input', textKey: 'nux.bubble.chat' }
            ]
        });
    });

    it('drops a bubble with helpBubble/remove and ignores short links', () => {
        expect(parseHelpBubbleLink('helpBubble/remove/CAMERA_BUTTON')).toEqual({ type: 'remove', name: 'button_camera' });
        expect(parseHelpBubbleLink('helpBubble/add')).toBeNull();
        expect(parseHelpBubbleLink('helpBubble/other/x')).toBeNull();
    });

    it('keeps raw element ids that are not enum constants', () => {
        expect(resolveHelpBubbleElementName('button_like')).toBe('button_like');
        expect(resolveHelpBubbleElementName('LIKE_ROOM_BUTTON')).toBe('button_like');
    });
});

describe('help bubble placement (UiHelpBubblesWidget.checkElementPosition)', () => {
    it('hangs the bubble 15px above the element, centred, with the arrow pointing down', () => {
        const placement = placeHelpBubble({ x: 400, y: 600, width: 40, height: 40 }, 90, 1000);

        expect(placement).toEqual({ left: 330, top: 495, direction: 'down', arrowOffset: 0 });
    });

    it('drops below the element when there is no room above', () => {
        const placement = placeHelpBubble({ x: 400, y: 20, width: 40, height: 40 }, 90, 1000);

        expect(placement.direction).toBe('up');
        expect(placement.top).toBe(70);
    });

    it('pushes the bubble back on screen and shifts the arrow towards the element', () => {
        const left = placeHelpBubble({ x: 0, y: 600, width: 20, height: 20 }, 90, 1000);
        const right = placeHelpBubble({ x: 990, y: 600, width: 20, height: 20 }, 90, 1000);

        expect(left.left).toBe(10);
        expect(left.arrowOffset).toBeLessThan(0);
        expect(right.left + 180).toBe(1000);
        expect(right.arrowOffset).toBeGreaterThan(0);
    });

    it('covers the desktop with four strips around the element', () => {
        const strips = getHelpBubbleModalStrips({ x: 100, y: 200, width: 50, height: 30 }, 800, 600);

        expect(strips).toEqual([
            { x: 0, y: 0, width: 800, height: 200 },
            { x: 0, y: 230, width: 800, height: 370 },
            { x: 0, y: 200, width: 100, height: 30 },
            { x: 150, y: 200, width: 650, height: 30 }
        ]);
    });
});
