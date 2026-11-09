import { VariableFxVisualizer } from '@octane/renderer';
import { describe, expect, it, vi } from 'vitest';
import { WIRED_FX_CATEGORY, WIRED_FX_RENDERER } from './WiredVariableFx';
import { IWiredVariableFxPainter, WiredVariableFxVisualizer } from './WiredVariableFxVisualizer';

const config = () => ({
    category: WIRED_FX_CATEGORY.PROGRESS_BAR,
    styleId: 0,
    colorId: 1,
    widthId: 2,
    rendererId: WIRED_FX_RENDERER.PLAIN,
    showMode: 0,
    showDurationMs: 3000,
    defaultMinValue: 0,
    defaultMaxValue: 100,
    extra: {} as Record<string, string>
});

const status = (value: number, initialize = false) => ({ value, initialize, overrideMinValue: null, overrideMaxValue: null, extra: {} as Record<string, string> });

const fakePainter = (): IWiredVariableFxPainter => ({
    frame: { source: null, width: 61, height: 13, anchorX: 0, anchorY: 0, updateId: 1 },
    updateData: vi.fn(),
    needsUpdate: vi.fn(() => true),
    update: vi.fn(() => true)
});

describe('WiredVariableFxVisualizer', () => {
    it("paints with the renderer's port of AIR's painters by default", () => {
        const visualizer = new WiredVariableFxVisualizer();
        const first = config();

        visualizer.setData(first, status(10), false, 1000);

        expect(visualizer.painter).toBeInstanceOf(VariableFxVisualizer);
        expect((visualizer.painter as unknown as VariableFxVisualizer).config).toBe(first);
    });

    it('keeps the painter for new values of the same config and makes a new one for a new config', () => {
        const painters: IWiredVariableFxPainter[] = [];
        const create = vi.fn(() => {
            const painter = fakePainter();

            painters.push(painter);

            return painter;
        });
        const visualizer = new WiredVariableFxVisualizer(create);
        const first = config();

        expect(visualizer.needsUpdate(0)).toBe(false);
        expect(visualizer.frame).toBeNull();

        visualizer.setData(first, status(10), false, 1000);
        visualizer.setData(first, status(40), false, 1100);

        expect(create).toHaveBeenCalledTimes(1);
        expect(create).toHaveBeenCalledWith(first, expect.objectContaining({ value: 10 }), false, 1000);
        expect(painters[0].updateData).toHaveBeenCalledWith(expect.objectContaining({ value: 40, isInitialize: false }), 1100);

        visualizer.setData(config(), status(40), false, 1200);

        expect(create).toHaveBeenCalledTimes(2);
        expect(visualizer.painter).toBe(painters[1]);
        expect(visualizer.needsUpdate(1200)).toBe(true);
        expect(visualizer.update(1200)).toBe(true);
        expect(visualizer.frame.width).toBe(61);
    });

    it('draws an initialize value, or one that arrives while the fx is hidden, without animating', () => {
        const painter = fakePainter();
        const create = vi.fn(() => painter);
        const visualizer = new WiredVariableFxVisualizer(create);
        const first = config();

        visualizer.setData(first, status(10, true), false, 1000);
        expect(create).toHaveBeenCalledWith(first, expect.anything(), true, 1000);

        visualizer.setData(first, status(30), true, 1100);
        expect(painter.updateData).toHaveBeenLastCalledWith(expect.objectContaining({ value: 30, isInitialize: true }), 1100);

        visualizer.setData(first, status(50), false, 1200);
        expect(painter.updateData).toHaveBeenLastCalledWith(expect.objectContaining({ value: 50, isInitialize: false }), 1200);
    });

    it('draws nothing when the renderer has no painter for it', () => {
        const visualizer = new WiredVariableFxVisualizer(() => null);

        visualizer.setData(config(), status(10), false, 1000);

        expect(visualizer.frame).toBeNull();
        expect(visualizer.needsUpdate(1000)).toBe(false);
        expect(visualizer.update(1000)).toBe(false);
    });
});
