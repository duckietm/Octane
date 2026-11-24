import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ placed: [] as unknown[] }));

vi.mock('../../../../api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../api')>()),
    attemptItemPlacement: (group: unknown) => state.placed.push(group),
    getWiredChestOverlayColor: () => null
}));

import { useRecyclerSessionStore } from '../../../../state/recyclerSessionStore';
import { InventoryFurnitureItemView } from './InventoryFurnitureItemView';

const group = (items: { recyclable: boolean; locked: boolean }[]) =>
    ({
        iconUrl: 'chair.png',
        hasUnseenItems: false,
        category: 1,
        stuffData: { uniqueNumber: 0, rarityLevel: -1 },
        items,
        getUnlockedCount: () => items.filter((item) => !item.locked).length
    }) as any;

describe('inventory furni tile and the Furni-Matic (AIR GroupItem / FurniModel)', () => {
    afterEach(cleanup);

    beforeEach(() => {
        state.placed.length = 0;
        useRecyclerSessionStore.setState({ place: null });
    });

    const tile = (container: HTMLElement) => container.querySelector('.octane-inventory-thumb') as HTMLElement;

    it('places the furni in the room on a double click while the Furni-Matic is closed, without a marker', () => {
        const chair = group([{ recyclable: true, locked: false }]);
        const { container } = render(<InventoryFurnitureItemView groupItem={chair} isActive={false} onSelect={() => undefined} />);

        expect(container.querySelector('.octane-inventory-thumb-recyclable')).toBeNull();
        fireEvent.doubleClick(tile(container));
        expect(state.placed).toEqual([chair]);
    });

    it('marks a stack that can be recycled and sends it to the Furni-Matic while that is open', () => {
        const sent: unknown[] = [];

        useRecyclerSessionStore.getState().start((item) => sent.push(item));

        const chair = group([{ recyclable: true, locked: false }]);
        const { container } = render(<InventoryFurnitureItemView groupItem={chair} isActive={false} onSelect={() => undefined} />);

        expect(container.querySelector('.octane-inventory-thumb-recyclable')).not.toBeNull();
        fireEvent.doubleClick(tile(container));
        expect(sent).toEqual([chair]);
        expect(state.placed).toEqual([]);
    });

    it('leaves the marker off a stack with nothing left to recycle', () => {
        useRecyclerSessionStore.getState().start(() => undefined);

        for (const items of [[{ recyclable: false, locked: false }], [{ recyclable: true, locked: true }]]) {
            const { container, unmount } = render(<InventoryFurnitureItemView groupItem={group(items)} isActive={false} onSelect={() => undefined} />);

            expect(container.querySelector('.octane-inventory-thumb-recyclable')).toBeNull();
            unmount();
        }
    });
});
