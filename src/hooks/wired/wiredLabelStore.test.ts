import { beforeEach, describe, expect, it } from 'vitest';
import { useWiredLabelStore } from './wiredLabelStore';

const label = (furnitureId: number, text = 'note') => ({ furnitureId, text, color: 4278912, visibility: 0, alwaysOpen: false });

describe('wiredLabelStore', () => {
    beforeEach(() => useWiredLabelStore.getState().clear());

    it('replaces the list and keeps only open labels that still exist', () => {
        const store = useWiredLabelStore.getState();

        store.replace([ label(1), label(2) ]);
        store.toggle(1);
        store.toggle(2);
        store.replace([ label(2) ]);

        expect(Object.keys(useWiredLabelStore.getState().labels)).toEqual([ '2' ]);
        expect(useWiredLabelStore.getState().openIds).toEqual([ 2 ]);
    });

    it('applies changes and removals', () => {
        const store = useWiredLabelStore.getState();

        store.replace([ label(1), label(2) ]);
        store.openSettings(2);
        store.update([ label(1, 'changed') ], [ 2 ]);

        expect(useWiredLabelStore.getState().labels[1].text).toBe('changed');
        expect(useWiredLabelStore.getState().labels[2]).toBeUndefined();
        expect(useWiredLabelStore.getState().settingsId).toBe(0);
    });

    it('only opens, hovers and configures furni that have a label', () => {
        const store = useWiredLabelStore.getState();

        store.replace([ label(1) ]);
        store.toggle(9);
        store.setHovered(9, true);
        store.openSettings(9);
        expect(useWiredLabelStore.getState()).toMatchObject({ openIds: [], hoveredId: 0, settingsId: 0 });

        store.toggle(1);
        store.toggle(1);
        store.setHovered(1, true);
        expect(useWiredLabelStore.getState()).toMatchObject({ openIds: [], hoveredId: 1 });
        store.setHovered(1, false);
        expect(useWiredLabelStore.getState().hoveredId).toBe(0);
    });
});
