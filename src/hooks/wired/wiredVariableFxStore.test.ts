import { beforeEach, describe, expect, it } from 'vitest';
import { useWiredVariableFxStore } from './wiredVariableFxStore';

const config = (configId: number, updateMask = 7) => ({
    configId,
    userFx: true,
    showMode: 0,
    updateMask,
    showOnMouseHover: false,
    showDurationMs: 3000,
    category: 1,
    styleId: 0,
    colorId: -1,
    widthId: 2,
    rendererId: 0,
    defaultMinValue: 0,
    defaultMaxValue: 100,
    extra: {}
});

const status = (configId: number, entityId: number, value: number, initialize = false) => ({
    configId,
    variableId: 'user:20',
    initialize,
    userEntity: true,
    entityId,
    value,
    overrideMinValue: null,
    overrideMaxValue: null,
    extra: {}
});

describe('wiredVariableFxStore', () => {
    beforeEach(() => useWiredVariableFxStore.getState().clear());

    it('keeps configs by id and statuses by wire key', () => {
        const store = useWiredVariableFxStore.getState();

        store.applyConfigs([config(7), config(8)]);
        store.applyStatuses(true, [status(7, 100, 60), status(8, 100, 5)], 1000);

        const state = useWiredVariableFxStore.getState();
        expect(Object.keys(state.configs)).toEqual(['7', '8']);
        expect(Object.keys(state.statuses).sort()).toEqual(['7|user:20|u|100', '8|user:20|u|100']);
        expect(state.statuses['7|user:20|u|100'].createdAt).toBe(1000);
        expect(state.statuses['7|user:20|u|100'].shownAt).toBe(1000);
        expect(state.statuses['7|user:20|u|100'].previousValue).toBeNull();
    });

    it('a full sync replaces every status and a diff only touches the ones sent', () => {
        const store = useWiredVariableFxStore.getState();
        store.applyConfigs([config(7)]);
        store.applyStatuses(true, [status(7, 100, 60), status(7, 101, 20)], 1000);

        store.applyStatuses(false, [status(7, 100, 59)], 2000);
        let state = useWiredVariableFxStore.getState();
        expect(state.statuses['7|user:20|u|100'].status.value).toBe(59);
        expect(state.statuses['7|user:20|u|100'].shownAt).toBe(2000);
        expect(state.statuses['7|user:20|u|100'].createdAt).toBe(1000);
        expect(state.statuses['7|user:20|u|100'].previousValue).toBe(60);
        expect(state.statuses['7|user:20|u|101'].status.value).toBe(20);

        store.applyStatuses(true, [status(7, 100, 58)], 3000);
        state = useWiredVariableFxStore.getState();
        expect(Object.keys(state.statuses)).toEqual(['7|user:20|u|100']);
    });

    it('only the updates the mask picks open the window, and an initialize status opens none', () => {
        const store = useWiredVariableFxStore.getState();
        store.applyConfigs([config(7)]);
        store.applyStatuses(true, [status(7, 100, 60)], 1000);

        // The default mask (created, increased, decreased) leaves "set to the same value" out.
        store.applyStatuses(false, [status(7, 100, 60)], 2000);
        expect(useWiredVariableFxStore.getState().statuses['7|user:20|u|100'].shownAt).toBe(1000);

        store.applyStatuses(false, [status(7, 100, 70, true)], 3000);
        expect(useWiredVariableFxStore.getState().statuses['7|user:20|u|100'].shownAt).toBe(1000);
        expect(useWiredVariableFxStore.getState().statuses['7|user:20|u|100'].status.value).toBe(70);

        // Only "decreased" (4): going up keeps the old window, going down opens a new one.
        store.applyConfigs([config(7, 4)]);
        store.applyStatuses(false, [status(7, 100, 80)], 4000);
        expect(useWiredVariableFxStore.getState().statuses['7|user:20|u|100'].shownAt).toBe(1000);
        store.applyStatuses(false, [status(7, 100, 50)], 5000);
        expect(useWiredVariableFxStore.getState().statuses['7|user:20|u|100'].shownAt).toBe(5000);
    });

    it('keeps the holder under the cursor', () => {
        const store = useWiredVariableFxStore.getState();

        store.setHovered('u:100', true);
        expect(useWiredVariableFxStore.getState().hoveredHolder).toBe('u:100');
        store.setHovered('f:5', false);
        expect(useWiredVariableFxStore.getState().hoveredHolder).toBe('u:100');
        store.setHovered('u:100', false);
        expect(useWiredVariableFxStore.getState().hoveredHolder).toBeNull();
    });

    it('removing a config drops its statuses and removing keys drops just those', () => {
        const store = useWiredVariableFxStore.getState();
        store.applyConfigs([config(7), config(8)]);
        store.applyStatuses(true, [status(7, 100, 60), status(8, 100, 5), status(8, 101, 6)], 1000);

        store.removeStatuses([{ configId: 8, variableId: 'user:20', userEntity: true, entityId: 101 }]);
        expect(Object.keys(useWiredVariableFxStore.getState().statuses).sort()).toEqual(['7|user:20|u|100', '8|user:20|u|100']);

        store.removeConfigs([8]);
        const state = useWiredVariableFxStore.getState();
        expect(Object.keys(state.configs)).toEqual(['7']);
        expect(Object.keys(state.statuses)).toEqual(['7|user:20|u|100']);
    });

    it('clears everything with the room', () => {
        const store = useWiredVariableFxStore.getState();
        store.applyConfigs([config(7)]);
        store.applyStatuses(true, [status(7, 100, 60)], 1000);

        store.clear();

        expect(useWiredVariableFxStore.getState().configs).toEqual({});
        expect(useWiredVariableFxStore.getState().statuses).toEqual({});
    });
});
