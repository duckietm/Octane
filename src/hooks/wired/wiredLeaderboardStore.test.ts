import { beforeEach, describe, expect, it } from 'vitest';
import { isLeaderboardDescriptorValid, useWiredLeaderboardStore } from './wiredLeaderboardStore';

const descriptor = (overrides: Record<string, unknown> = {}) => ({
    overlayId: 55,
    revision: 3,
    title: 'Top',
    description: '',
    tileX: 1,
    tileY: 2,
    offsetX: 0,
    altitude: 0,
    sortMode: 0,
    columns: [ { type: 0, label: 'Username', width: 3 } ],
    choices: [ { variableId: '812', displayName: 'Coins' }, { variableId: '900', displayName: 'Wins' } ],
    defaultVariableId: '812',
    pageSizeOption: 0,
    ...overrides
});

const row = (rank: number) => ({ rank, userId: rank, username: `u${ rank }`, figure: '', rawValue: String(rank), creationTime: 0, lastUpdateTime: 0, level: null, text: null });

describe('wiredLeaderboardStore', () => {
    beforeEach(() => useWiredLeaderboardStore.getState().clear());

    it('checks descriptors like the official client', () => {
        expect(isLeaderboardDescriptorValid(descriptor())).toBe(true);
        expect(isLeaderboardDescriptorValid(descriptor({ defaultVariableId: '1' }))).toBe(false);
        expect(isLeaderboardDescriptorValid(descriptor({ choices: [], defaultVariableId: '0' }))).toBe(true);
        expect(isLeaderboardDescriptorValid(descriptor({ columns: [ { type: 1, label: 'Value', width: 0 } ] }))).toBe(false);
    });

    it('ignores chunks before a snapshot and for another revision or variable', () => {
        const store = useWiredLeaderboardStore.getState();

        store.applyChunk(55, 3, '812', 0, 1, [ row(1) ]);
        expect(useWiredLeaderboardStore.getState().panels[55]).toBeUndefined();

        store.applySnapshot([ descriptor() ]);
        store.applyChunk(55, 2, '812', 0, 1, [ row(1) ]);
        store.applyChunk(55, 3, '900', 0, 1, [ row(1) ]);
        expect(useWiredLeaderboardStore.getState().panels[55].total).toBeNull();

        store.applyChunk(55, 3, '812', 0, 12, [ row(1) ]);
        expect(useWiredLeaderboardStore.getState().panels[55].total).toBe(12);
        expect(useWiredLeaderboardStore.getState().panels[55].chunks[0]).toHaveLength(1);
    });

    it('keeps the selection across snapshots and resets the rows on a new revision', () => {
        const store = useWiredLeaderboardStore.getState();

        store.applySnapshot([ descriptor() ]);
        store.selectVariable(55, '900');
        store.applyChunk(55, 3, '900', 0, 30, [ row(1) ]);
        store.movePage(55, 1);
        expect(useWiredLeaderboardStore.getState().panels[55].page).toBe(1);

        store.applySnapshot([ descriptor() ]);
        expect(useWiredLeaderboardStore.getState().panels[55].variableId).toBe('900');
        expect(useWiredLeaderboardStore.getState().panels[55].page).toBe(1);

        store.applySnapshot([ descriptor({ revision: 4 }) ]);
        expect(useWiredLeaderboardStore.getState().panels[55]).toMatchObject({ variableId: '900', page: 0, total: null, chunks: {} });

        store.applySnapshot([ descriptor({ revision: 2 }) ]);
        expect(useWiredLeaderboardStore.getState().panels[55].descriptor.revision).toBe(4);
    });

    it('drops panels the snapshot no longer lists', () => {
        const store = useWiredLeaderboardStore.getState();

        store.applySnapshot([ descriptor() ]);
        store.applySnapshot([]);
        expect(useWiredLeaderboardStore.getState().order).toEqual([]);
    });
});
