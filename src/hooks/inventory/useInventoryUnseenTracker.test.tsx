/* @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { handlers, sent } = vi.hoisted(() => ({ handlers: new Map<unknown, (event: any) => void>(), sent: [] as unknown[] }));

vi.mock('@octane/renderer', () => ({
    UnseenItemsEvent: class {},
    UnseenResetCategoryComposer: class {
        constructor(public category: number) {}
    },
    UnseenResetItemsComposer: class {
        constructor(public category: number) {}
    }
}));
vi.mock('@/state/useSharedHook', () => ({ registerSharedHook: vi.fn(), useSharedHook: (hook: () => unknown) => hook() }));
vi.mock('../../api', async () => {
    const categories = await vi.importActual<typeof import('../../api/inventory/UnseenItemCategory')>('../../api/inventory/UnseenItemCategory');

    return { ...categories, SendMessageComposer: (composer: unknown) => sent.push(composer) };
});
vi.mock('../events', () => ({ useMessageEvent: (type: unknown, handler: (event: any) => void) => handlers.set(type, handler) }));

import { UnseenItemsEvent } from '@octane/renderer';
import { UnseenItemCategory } from '../../api/inventory/UnseenItemCategory';
import { useInventoryUnseenTracker } from './useInventoryUnseenTracker';

const HABBICON = 8;

const unseen = (entries: Record<number, number[]>) => ({
    getParser: () => ({
        categories: Object.keys(entries).map(Number),
        getItemsByCategory: (category: number) => entries[category] ?? []
    })
});

describe('useInventoryUnseenTracker', () => {
    it('counts on the inventory icon only the categories the inventory shows', () => {
        const { result } = renderHook(() => useInventoryUnseenTracker());

        act(() => handlers.get(UnseenItemsEvent)(unseen({ [HABBICON]: [12], [UnseenItemCategory.GAMES]: [3] })));

        // The habbicon picker still sees its own unseen icon, the inventory icon does not.
        expect(result.current.getCount(HABBICON)).toBe(1);
        expect(result.current.getFullCount).toBe(0);

        act(() =>
            handlers.get(UnseenItemsEvent)(
                unseen({
                    [UnseenItemCategory.FURNI]: [1, 2],
                    [UnseenItemCategory.RENTABLE]: [3],
                    [UnseenItemCategory.PET]: [4],
                    [UnseenItemCategory.BADGE]: [5],
                    [UnseenItemCategory.BOT]: [6],
                    [UnseenItemCategory.PREFIX]: [7]
                })
            )
        );

        expect(result.current.getFullCount).toBe(7);
    });

    it('drops a category from the icon once it is reset', () => {
        const { result } = renderHook(() => useInventoryUnseenTracker());

        act(() => handlers.get(UnseenItemsEvent)(unseen({ [UnseenItemCategory.RENTABLE]: [9] })));

        expect(result.current.getFullCount).toBe(1);

        let reset = false;

        act(() => {
            reset = result.current.resetCategory(UnseenItemCategory.RENTABLE);
        });

        expect(reset).toBe(true);
        expect(result.current.getFullCount).toBe(0);
        expect(sent).toContainEqual(expect.objectContaining({ category: UnseenItemCategory.RENTABLE }));
    });
});
