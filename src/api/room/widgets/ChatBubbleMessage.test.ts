import { describe, expect, it } from 'vitest';
import { ChatBubbleMessage } from './ChatBubbleMessage';

const bubble = () => {
    const chat = new ChatBubbleMessage();

    // Only the element's inline style is written; no page is needed.
    chat.elementRef = { style: { left: '', top: '' } } as unknown as HTMLDivElement;

    return chat;
};

describe('chat bubble placement', () => {
    it('writes a position at once through the setters', () => {
        const chat = bubble();

        chat.left = 12;
        chat.top = 34;

        expect(chat.elementRef.style.left).toBe('12px');
        expect(chat.elementRef.style.top).toBe('34px');
    });

    it('keeps the placements of one turn back and writes them together', async () => {
        const first = bubble();
        const second = bubble();

        first.placeLater(10, 20);
        second.placeLater(30, 40);

        // Known to the layout at once, not written yet: the next bubble can measure without a new page layout.
        expect(first.left).toBe(10);
        expect(second.top).toBe(40);
        expect(first.elementRef.style.left).toBe('');
        expect(second.elementRef.style.top).toBe('');

        await Promise.resolve();

        expect(first.elementRef.style.left).toBe('10px');
        expect(first.elementRef.style.top).toBe('20px');
        expect(second.elementRef.style.left).toBe('30px');
        expect(second.elementRef.style.top).toBe('40px');
    });

    it('writes the latest position when a bubble moved again before the write', async () => {
        const chat = bubble();

        chat.placeLater(10, 20);
        chat.top = 5;

        await Promise.resolve();

        expect(chat.elementRef.style.left).toBe('10px');
        expect(chat.elementRef.style.top).toBe('5px');
    });

    it('leaves a bubble that lost its element alone', async () => {
        const chat = bubble();

        chat.placeLater(10, 20);
        chat.elementRef = null;

        await Promise.resolve();

        expect(chat.left).toBe(10);
    });
});
