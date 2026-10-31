import { describe, expect, it } from 'vitest';
import { layoutNativeRuns } from './layoutNativeRuns';

// Style 0 is two pixels a character (bold name), style 1 one pixel (message).
const measure = (style: number, text: string) => text.length * (style === 0 ? 2 : 1);
const lineTexts = (layout: ReturnType<typeof layoutNativeRuns>) => layout.lines.map((line) => line.map((run) => `${run.style}@${run.x}:${run.text}`));

describe('layoutNativeRuns', () => {
    it('keeps everything on one line when it fits, runs placed one after the other', () => {
        const layout = layoutNativeRuns(
            [
                { text: 'Bob: ', style: 0 },
                { text: 'hallo daar', style: 1 }
            ],
            Infinity,
            measure
        );

        expect(lineTexts(layout)).toEqual([['0@0:Bob: ', '1@10:hallo daar']]);
        expect(layout.width).toBe(20);
    });

    it('breaks at the last space that fits, across the name run, and measures without trailing spaces', () => {
        const layout = layoutNativeRuns(
            [
                { text: 'Bob: ', style: 0 },
                { text: 'een twee drie vier', style: 1 }
            ],
            20,
            measure
        );

        expect(lineTexts(layout)).toEqual([['0@0:Bob: ', '1@10:een twee '], ['1@0:drie vier']]);
        expect(layout.width).toBe(18);
    });

    it('splits a word longer than a line by characters', () => {
        const layout = layoutNativeRuns([{ text: 'ab abcdefghij', style: 1 }], 5, measure);

        expect(lineTexts(layout)).toEqual([['1@0:ab ab'], ['1@0:cdefg'], ['1@0:hij']]);
    });
});
