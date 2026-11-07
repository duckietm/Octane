import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getTransformedRasterScale, getTransformedSpacedScale } from './NativeTextScale';
import {
    combineNativeTextTransformScale,
    measureNativeTextTransformScale,
    NativeTextTransformScale,
    nativeTextTransformScaleAt,
    useNativeTextTransform
} from './NativeTextTransformScale';

const Probe = () => <span>{useNativeTextTransform().scale}</span>;

describe('native text under a CSS transform scale', () => {
    it('draws the raster at the size the label is shown', () => {
        expect(getTransformedRasterScale(1, 1)).toBe(1);
        expect(getTransformedRasterScale(2, 1)).toBe(2);
        expect(getTransformedRasterScale(1, 0.87)).toBe(0.87);
        expect(getTransformedRasterScale(1.25, 1.3)).toBe(1.63);
        expect(getTransformedRasterScale(1, 0.01)).toBe(0.25);
        expect(getTransformedRasterScale(2, 0)).toBe(2);
        expect(getTransformedRasterScale(2, Number.NaN)).toBe(2);
    });

    it('keeps the letter-spaced path on a whole scale', () => {
        expect(getTransformedSpacedScale(1, 1)).toBe(1);
        expect(getTransformedSpacedScale(1, 1.3)).toBe(2);
        expect(getTransformedSpacedScale(2, 0.8)).toBe(2);
        expect(getTransformedSpacedScale(1, 0.5)).toBe(1);
    });

    it('multiplies nested scales, in hundredths', () => {
        expect(combineNativeTextTransformScale(1, 0.873)).toBe(0.87);
        expect(combineNativeTextTransformScale(1.2, 1 / 1.2)).toBe(1);
        expect(combineNativeTextTransformScale(1.2, 0)).toBe(1.2);

        const { container } = render(
            <NativeTextTransformScale scale={1.5}>
                <NativeTextTransformScale scale={0.5}>
                    <Probe />
                </NativeTextTransformScale>
            </NativeTextTransformScale>
        );

        expect(container.textContent).toBe('0.75');
    });

    it('is 1 outside any scaled stage', () => {
        const { container } = render(<Probe />);

        expect(container.textContent).toBe('1');
    });

    it('zooms only labels inside the stage, not those in a portal', () => {
        const stage = document.createElement('div');
        const inside = stage.appendChild(document.createElement('span'));
        const portal = document.createElement('span');
        const transform = { scale: 1.3, stage: { current: stage } };

        expect(nativeTextTransformScaleAt(transform, inside)).toBe(1.3);
        expect(nativeTextTransformScaleAt(transform, portal)).toBe(1);
        expect(nativeTextTransformScaleAt(transform, null)).toBe(1);
        expect(nativeTextTransformScaleAt({ scale: 1.3, stage: { current: null } }, inside)).toBe(1);
    });

    it('measures the zoom a label is really shown at', () => {
        const label = document.body.appendChild(document.createElement('span'));
        label.style.width = '56.8627px';
        label.getBoundingClientRect = () => ({ width: 56.8627 * 1.3 }) as DOMRect;

        expect(measureNativeTextTransformScale(label)).toBe(1.3);

        label.getBoundingClientRect = () => ({ width: 56.8627 }) as DOMRect;
        expect(measureNativeTextTransformScale(label), 'a dropdown list in a portal').toBe(1);

        label.getBoundingClientRect = () => ({ width: 0 }) as DOMRect;
        expect(measureNativeTextTransformScale(label), 'not laid out').toBeNull();

        label.remove();
        expect(measureNativeTextTransformScale(label), 'not in the page').toBeNull();
        expect(measureNativeTextTransformScale(null)).toBeNull();
    });
});
