import { describe, expect, it, vi } from 'vitest';
import { WiredVariableFxVisualizer } from '../../api/wired/WiredVariableFxVisualizer';
import { groupWiredVariableFxStatuses, WiredVariableFxRoomDrawing } from './wiredVariableFxRoomDrawing';

const config = (configId: number, category: number, extra: Record<string, string> = {}) => ({
    configId,
    userFx: true,
    showMode: 0,
    updateMask: 0,
    showOnMouseHover: false,
    showDurationMs: 3000,
    category,
    styleId: 0,
    colorId: -1,
    widthId: 2,
    rendererId: 0,
    defaultMinValue: 0,
    defaultMaxValue: 100,
    extra
});

const entry = (configId: number, userEntity: boolean, entityId: number, variableId = 'user:20', createdAt = 0) => {
    const key = `${configId}|${variableId}|${userEntity ? 'u' : 'f'}|${entityId}`;

    return [
        key,
        {
            key,
            status: { configId, variableId, initialize: false, userEntity, entityId, value: 1, overrideMinValue: null, overrideMaxValue: null, extra: {} },
            createdAt,
            shownAt: null,
            previousValue: null
        }
    ] as const;
};

describe('wiredVariableFxRoomDrawing grouping', () => {
    it('piles statuses per avatar or furni, boss bars included, and skips unknown configs', () => {
        const configs = { 7: config(7, 1), 8: config(8, 0), 9: config(9, 4) };
        const statuses = Object.fromEntries([entry(8, true, 100), entry(7, true, 100), entry(7, false, 500), entry(9, true, 100), entry(42, true, 100)]);

        const groups = groupWiredVariableFxStatuses(configs, statuses);

        expect(groups.map((group) => group.entityKey)).toEqual(['f:500', 'u:100']);
        expect(groups[1].drawn.map((drawn) => drawn.config.configId)).toEqual([7, 8, 9]);
        expect(groups[0].userEntity).toBe(false);
        expect(groups[0].entityId).toBe(500);
    });

    it("stacks as AIR does: higher stack order lowest, then the older fx, then the config id", () => {
        const configs = { 7: config(7, 1), 8: config(8, 1, { stack_order: '5' }), 9: config(9, 1), 10: config(10, 1, { stack_order: '-1' }) };
        const statuses = Object.fromEntries([entry(7, true, 100, 'user:20', 300), entry(8, true, 100, 'user:20', 900), entry(9, true, 100, 'user:20', 100), entry(10, true, 100)]);

        expect(groupWiredVariableFxStatuses(configs, statuses)[0].drawn.map((drawn) => drawn.config.configId)).toEqual([8, 9, 7, 10]);
    });
});

const config2 = (configId: number, overrides: Record<string, unknown> = {}) => ({ ...config(configId, 1), ...overrides });

const status2 = (configId: number, userEntity: boolean, entityId: number, value: number, shownAt: number | null = null, createdAt = 0, previousValue: number | null = null) => {
    const key = `${configId}|user:20|${userEntity ? 'u' : 'f'}|${entityId}`;

    return {
        key,
        status: { configId, variableId: 'user:20', initialize: false, userEntity, entityId, value, overrideMinValue: null, overrideMaxValue: null, extra: {} },
        createdAt,
        shownAt,
        previousValue
    };
};

const setup = () => {
    const calls: { roomId: number; objectId: number; category: number; entries: { key: string; visible: boolean; layer: number; visualizer: unknown }[] }[] = [];
    const present = new Set<string>(['20:100', '10:500']);
    const target = {
        setRoomObjectVariableFx: vi.fn((roomId: number, objectId: number, category: number, entries) => {
            calls.push({ roomId, objectId, category, entries });

            return present.has(`${category}:${objectId}`);
        })
    };
    const visualizers: WiredVariableFxVisualizer[] = [];
    const drawing = new WiredVariableFxRoomDrawing(target, { unit: 20, floor: 10 }, () => {
        const visualizer = new WiredVariableFxVisualizer(() => null);

        vi.spyOn(visualizer, 'setData');
        visualizers.push(visualizer);

        return visualizer;
    });

    return { calls, target, drawing, visualizers, present };
};

describe('WiredVariableFxRoomDrawing', () => {
    it('sends each holder its stack in AIR order, with one visualizer per value', () => {
        const { calls, drawing, visualizers } = setup();
        const configs = { 7: config2(7), 8: config2(8, { extra: { stack_order: '5' } }), 9: config2(9) };
        const user7 = status2(7, true, 100, 10);
        const user8 = status2(8, true, 100, 20);
        const furni9 = status2(9, false, 500, 30);

        expect(drawing.sync(1, configs, { [user7.key]: user7, [user8.key]: user8, [furni9.key]: furni9 }, null, 1000)).toBeNull();

        expect(calls.map((call) => [call.objectId, call.category, call.entries.map((entry) => entry.key)])).toEqual([
            [500, 10, [furni9.key]],
            [100, 20, [user8.key, user7.key]]
        ]);
        expect(calls[1].entries.map((entry) => entry.layer)).toEqual([-5, 0]);
        expect(visualizers).toHaveLength(3);
        expect(calls[1].entries[0].visualizer).toBe(drawing.getVisualizer(user8.key));
    });

    it('only sends a holder again when its stack changed, keeping the visualizer of a value', () => {
        const { calls, drawing } = setup();
        const configs = { 7: config2(7) };
        const first = status2(7, true, 100, 10);

        drawing.sync(1, configs, { [first.key]: first }, null, 1000);
        drawing.sync(1, configs, { [first.key]: first }, 'f:500', 1100);

        expect(calls).toHaveLength(1);

        const visualizer = drawing.getVisualizer(first.key);
        const next = status2(7, true, 100, 40, null, 0, 10);

        drawing.sync(1, configs, { [next.key]: next }, null, 1200);

        expect(drawing.getVisualizer(first.key)).toBe(visualizer);
        expect(visualizer.setData).toHaveBeenLastCalledWith(configs[7], next.status, false, 1200);
        // Same keys, flags and visualizer: the renderer keeps what it draws and the visualizer redraws.
        expect(calls).toHaveLength(1);
    });

    it('marks hidden values invisible and wakes up when a "when it changes" value is due to hide', () => {
        const { calls, drawing } = setup();
        const configs = { 7: config2(7, { showMode: 1, showDurationMs: 2000 }), 8: config2(8, { showMode: 2, showOnMouseHover: true }) };
        const changing = status2(7, true, 100, 10, 1000);
        const hoverOnly = status2(8, true, 100, 10);
        const statuses = { [changing.key]: changing, [hoverOnly.key]: hoverOnly };

        expect(drawing.sync(1, configs, statuses, null, 1500)).toBe(3000);
        expect(calls[0].entries.map((entry) => entry.visible)).toEqual([true, false]);

        drawing.sync(1, configs, statuses, 'u:100', 1600);
        expect(calls[1].entries.map((entry) => entry.visible)).toEqual([true, true]);

        expect(drawing.sync(1, configs, statuses, null, 3000)).toBeNull();
        expect(calls[2].entries.map((entry) => entry.visible)).toEqual([false, false]);
    });

    it('sends an empty stack to a holder that lost every value, so the renderer fades them out', () => {
        const { calls, drawing } = setup();
        const configs = { 7: config2(7) };
        const value = status2(7, false, 500, 10);

        drawing.sync(1, configs, { [value.key]: value }, null, 1000);
        drawing.sync(1, configs, {}, null, 1100);

        expect(calls[1]).toMatchObject({ objectId: 500, category: 10, entries: [] });
        expect(drawing.getVisualizer(value.key)).toBeNull();
    });

    it('gives an object that enters later the stack it holds, and clears the room', () => {
        const { calls, drawing } = setup();
        const configs = { 7: config2(7) };
        const value = status2(7, true, 300, 10);

        drawing.sync(1, configs, { [value.key]: value }, null, 1000);
        drawing.reapply(1, true, 300);
        drawing.reapply(1, true, 999);

        expect(calls).toHaveLength(2);
        expect(calls[1]).toMatchObject({ objectId: 300, category: 20 });
        expect(calls[1].entries.map((entry) => entry.key)).toEqual([value.key]);

        drawing.clear(1);

        expect(calls[2]).toMatchObject({ objectId: 300, entries: [] });
    });
});
