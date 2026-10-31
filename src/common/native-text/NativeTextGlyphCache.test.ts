import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { NativeTextRenderer, prepareNativeBundle } from './NativeTextRenderer';
import { NativeRenderOptions, RasterCache } from './NativeTextTypes';

const font = prepareNativeBundle(JSON.parse(readFileSync(resolve(__dirname, '../../assets/native-fonts/ubuntu_regular.json'), 'utf8')));
const options: NativeRenderOptions = {
    size: 12,
    color: 0x333333,
    antiAliasType: 'advanced',
    gridFitType: 'pixel',
    thickness: -15,
    sharpness: 80,
    kerning: true,
    stageQuality: 'high',
    renderingPipeline: 'habbo-retained'
};

describe('native text glyph cache', () => {
    it('draws exactly the same pixels from cached glyph occurrences', () => {
        const renderer = new NativeTextRenderer(font);
        const rasterCache: RasterCache = { entries: new Map(), bytes: 0 };
        const texts = ['Camwijs - Ontvangstruimte', 'Kamer nummer 10', 'Camwijs - Hotel', 'Ontvangstruimte'];

        for (const text of texts) {
            const plain = renderer.render(text, options);
            const first = renderer.render(text, { ...options, rasterCache });
            const second = renderer.render(text, { ...options, rasterCache });

            expect(Array.from(first.pixels)).toEqual(Array.from(plain.pixels));
            expect(Array.from(second.pixels)).toEqual(Array.from(plain.pixels));
        }

        expect(rasterCache.entries.size).toBeGreaterThan(0);
    });
});
