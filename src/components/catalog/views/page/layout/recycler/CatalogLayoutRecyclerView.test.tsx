import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    sent: [] as unknown[],
    handlers: new Map<unknown, (event: unknown) => void>(),
    groups: [] as unknown[],
    room: {} as unknown,
    trading: false,
    duckets: 0,
    config: {} as Record<string, unknown>,
    alerts: [] as string[],
    setGroups: null as null | ((update: (groups: unknown[]) => unknown[]) => void),
    locked: [] as number[][]
}));

vi.mock('../../../../../../api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../../api')>()),
    GetConfigurationValue: (key: string, fallback: unknown) => state.config[key] ?? fallback,
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string) => key,
    SendMessageComposer: (composer: unknown) => state.sent.push(composer)
}));

vi.mock('../../../../../../hooks', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../../hooks')>()),
    useInventoryFurni: () => ({ groupItems: state.groups, setGroupItems: state.setGroups }),
    useInventoryTrade: () => ({ isTrading: state.trading }),
    useNotification: () => ({ simpleAlert: (message: string) => state.alerts.push(message) }),
    usePurse: () => ({ getCurrencyAmount: () => state.duckets }),
    useRoom: () => ({ roomSession: state.room }),
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => state.handlers.set(type, handler)
}));

import { GetRoomEngine, PurchaseErrorMessageEvent, RecycleItemsMessageComposer, RecyclerFinishedMessageEvent, RecyclerStatusMessageEvent } from '@octane/renderer';
import { useRecyclerSessionStore } from '../../../../../../state/recyclerSessionStore';
import { CatalogLayoutRecyclerView } from './CatalogLayoutRecyclerView';

const group = (id: number, name: string) => ({ name, iconUrl: `${name}.png`, items: [{ id, recyclable: true, locked: false }] });

const setStatus = (recyclerStatus: number) =>
    act(() => state.handlers.get(RecyclerStatusMessageEvent)?.({ getParser: () => ({ recyclerStatus, recyclerTimeoutSeconds: 0 }) }));

describe('recycler page (AIR layout_recycler_xml + recyclerWidget_xml)', () => {
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    // The machine runs at least 3 s and until the needle is on the right.
    const runMachine = () => {
        for (let tick = 0; tick < 4000 && screen.queryByRole('button', { name: 'catalog.recycler.button.abort' }); tick++)
            act(() => {
                vi.advanceTimersByTime(16);
            });
    };

    beforeEach(() => {
        vi.useFakeTimers();
        state.room = {};
        state.trading = false;
        state.duckets = 0;
        state.config = { 'recycler.timeout_seconds': 0 };
        state.alerts.length = 0;
        vi.mocked(GetRoomEngine).mockReset();
        state.setGroups = null;
        state.locked.length = 0;
        state.sent.length = 0;
        state.handlers.clear();
        state.groups = Array.from({ length: 9 }, (_, index) => group(100 + index, `furni${index}`));
    });

    it('fills the slots from the chooser and recycles them', () => {
        const { container } = render(<CatalogLayoutRecyclerView page={{} as any} hideNavigation={() => undefined} />);

        setStatus(RecyclerStatusMessageEvent.SYSTEM_STATUS_ENABLED);

        expect(container.querySelector('.octane-catalog-air-recycler__machine')).not.toBeNull();
        expect(container.querySelectorAll('.octane-catalog-air-recycler__slot')).toHaveLength(8);

        fireEvent.click(screen.getByRole('listitem', { name: '1' }));

        for (let index = 0; index < 8; index++) fireEvent.click(screen.getByRole('button', { name: `furni${index}` }));

        // The chooser closes when the slots are full.
        expect(screen.queryByRole('dialog')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'catalog.recycler.button.recycle' }));

        // AIR sends when the machine has run, not on the click.
        expect(state.sent.some((composer) => composer instanceof RecycleItemsMessageComposer)).toBe(false);
        expect(screen.getByRole('button', { name: 'catalog.recycler.button.abort' })).toBeInTheDocument();
        runMachine();
        expect(screen.queryByRole('button', { name: 'catalog.recycler.button.abort' })).toBeNull();

        const recycle = state.sent.find((composer) => composer instanceof RecycleItemsMessageComposer) as any;

        expect(recycle.getMessageArray().map((entry: { itemId: number }) => entry.itemId)).toEqual([100, 101, 102, 103, 104, 105, 106, 107]);
    });

    it('takes an item back out of its slot', () => {
        render(<CatalogLayoutRecyclerView page={{} as any} hideNavigation={() => undefined} />);

        setStatus(RecyclerStatusMessageEvent.SYSTEM_STATUS_ENABLED);
        fireEvent.click(screen.getByRole('listitem', { name: '1' }));
        fireEvent.click(screen.getByRole('button', { name: 'furni0' }));
        fireEvent.click(screen.getByRole('listitem', { name: 'furni0' }));

        expect(screen.queryByRole('listitem', { name: 'furni0' })).toBeNull();
    });

    it('shows Frank when the recycler is closed', () => {
        const { container } = render(<CatalogLayoutRecyclerView page={{} as any} hideNavigation={() => undefined} />);

        setStatus(RecyclerStatusMessageEvent.SYSTEM_STATUS_DISABLED);

        expect(container.querySelector('.octane-catalog-air-recycler__frank')).not.toBeNull();
        expect(container.querySelector('.octane-catalog-air-recycler__slots')).toBeNull();
    });

    const fillAndRecycle = () => {
        fireEvent.click(screen.getByRole('listitem', { name: '1' }));

        for (let index = 0; index < 8; index++) fireEvent.click(screen.getByRole('button', { name: `furni${index}` }));

        fireEvent.click(screen.getByRole('button', { name: 'catalog.recycler.button.recycle' }));
    };

    it('keeps the furni in their slots and says so when the recycle fails (FINISHED_FAIL)', () => {
        render(<CatalogLayoutRecyclerView page={{} as any} hideNavigation={() => undefined} />);

        setStatus(RecyclerStatusMessageEvent.SYSTEM_STATUS_ENABLED);
        fillAndRecycle();

        expect(screen.getByRole('status')).toHaveTextContent('recycler.info.processing');
        runMachine();

        act(() =>
            state.handlers.get(RecyclerFinishedMessageEvent)?.({
                getParser: () => ({ recyclerFinishedStatus: RecyclerFinishedMessageEvent.FINISHED_FAIL })
            })
        );

        expect(screen.getByRole('status')).toHaveTextContent('recycler.info.failed');
        expect(screen.getAllByRole('listitem').filter((slot) => slot.getAttribute('aria-label')?.startsWith('furni'))).toHaveLength(8);
        expect(screen.getByRole('button', { name: 'catalog.recycler.button.recycle' })).toBeEnabled();
    });

    it('ends the run on a purchase error from an emulator without FINISHED_FAIL', () => {
        render(<CatalogLayoutRecyclerView page={{} as any} hideNavigation={() => undefined} />);

        setStatus(RecyclerStatusMessageEvent.SYSTEM_STATUS_ENABLED);

        // Not recycling: a purchase error from elsewhere in the catalog changes nothing.
        act(() => state.handlers.get(PurchaseErrorMessageEvent)?.({ getParser: () => ({ code: 0 }) }));
        expect(screen.getByRole('status')).toHaveTextContent('recycler.info.ready');

        fillAndRecycle();
        runMachine();
        act(() => state.handlers.get(PurchaseErrorMessageEvent)?.({ getParser: () => ({ code: 0 }) }));

        expect(screen.getByRole('status')).toHaveTextContent('recycler.info.failed');
    });

    const sentRecycle = () => state.sent.some((composer) => composer instanceof RecycleItemsMessageComposer);

    it('sends nothing when the run is aborted', () => {
        render(<CatalogLayoutRecyclerView page={{} as any} hideNavigation={() => undefined} />);

        setStatus(RecyclerStatusMessageEvent.SYSTEM_STATUS_ENABLED);
        fillAndRecycle();
        act(() => {
            vi.advanceTimersByTime(1000);
        });
        fireEvent.click(screen.getByRole('button', { name: 'catalog.recycler.button.abort' }));
        act(() => {
            vi.advanceTimersByTime(60000);
        });

        expect(sentRecycle()).toBe(false);
        expect(screen.getByRole('button', { name: 'catalog.recycler.button.recycle' })).toBeEnabled();
    });

    it('does not start outside a room, during a trade or without the duckets', () => {
        state.room = null;

        const { unmount } = render(<CatalogLayoutRecyclerView page={{} as any} hideNavigation={() => undefined} />);

        setStatus(RecyclerStatusMessageEvent.SYSTEM_STATUS_ENABLED);
        fillAndRecycle();
        expect(screen.getByRole('button', { name: 'catalog.recycler.button.recycle' })).toBeDisabled();
        unmount();

        state.room = {};
        state.trading = true;
        render(<CatalogLayoutRecyclerView page={{} as any} hideNavigation={() => undefined} />);
        setStatus(RecyclerStatusMessageEvent.SYSTEM_STATUS_ENABLED);
        fillAndRecycle();
        expect(state.alerts).toEqual(['recycler.alert.trading']);

        cleanup();

        state.trading = false;
        state.config['recycler.ducket_cost'] = 50;
        state.duckets = 49;
        render(<CatalogLayoutRecyclerView page={{} as any} hideNavigation={() => undefined} />);
        setStatus(RecyclerStatusMessageEvent.SYSTEM_STATUS_ENABLED);
        fillAndRecycle();
        expect(state.alerts).toEqual(['recycler.alert.trading', 'catalog.alert.notenough.activitypoints.title.0']);

        runMachine();
        expect(sentRecycle()).toBe(false);
    });

    it('waits recycler.timeout_seconds after a run', () => {
        state.config['recycler.timeout_seconds'] = 10;
        render(<CatalogLayoutRecyclerView page={{} as any} hideNavigation={() => undefined} />);

        setStatus(RecyclerStatusMessageEvent.SYSTEM_STATUS_ENABLED);
        fillAndRecycle();

        runMachine();

        expect(sentRecycle()).toBe(true);
        expect(screen.getByRole('button', { name: 'catalog.recycler.button.wait' })).toBeDisabled();
    });

    // AIR RecyclerCatalogWidget.onSlotMouseEvent: the furni held from the inventory is dropped on a slot.
    const hold = (data: unknown) => {
        const cancelRoomObjectInsert = vi.fn();

        vi.mocked(GetRoomEngine).mockReturnValue({
            activeRoomId: 1,
            getSelectedRoomObjectData: () => data,
            cancelRoomObjectInsert,
            cancelRoomObjectPlacement: () => undefined,
            setObjectMoverIconSpriteVisible: () => undefined
        } as any);

        return cancelRoomObjectInsert;
    };

    it('takes a furni dropped from the inventory and lets go of it', () => {
        render(<CatalogLayoutRecyclerView page={{} as any} hideNavigation={() => undefined} />);
        setStatus(RecyclerStatusMessageEvent.SYSTEM_STATUS_ENABLED);

        const cancel = hold({ id: 103, operation: 'OBJECT_PLACE' });

        fireEvent.mouseUp(screen.getByRole('listitem', { name: '1' }), { button: 0 });

        expect(screen.getByRole('listitem', { name: 'furni3' })).toBeInTheDocument();
        expect(cancel).toHaveBeenCalled();

        // Nothing held: a mouse up on the filled slot empties it, on an empty one does nothing.
        hold(null);
        fireEvent.mouseUp(screen.getByRole('listitem', { name: 'furni3' }), { button: 0 });
        expect(screen.queryByRole('listitem', { name: 'furni3' })).toBeNull();
        fireEvent.mouseUp(screen.getByRole('listitem', { name: '1' }), { button: 0 });
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('refuses a furni that is being moved in the room or cannot be recycled', () => {
        state.groups = [{ name: 'rare', iconUrl: 'rare.png', items: [{ id: 500, recyclable: false, locked: false }] }];
        render(<CatalogLayoutRecyclerView page={{} as any} hideNavigation={() => undefined} />);
        setStatus(RecyclerStatusMessageEvent.SYSTEM_STATUS_ENABLED);

        hold({ id: 500, operation: 'OBJECT_MOVE' });
        fireEvent.mouseUp(screen.getByRole('listitem', { name: '1' }), { button: 0 });
        expect(state.alerts).toEqual(['catalog.alert.recycler.inventory']);

        hold({ id: 500, operation: 'OBJECT_PLACE' });
        fireEvent.mouseUp(screen.getByRole('listitem', { name: '1' }), { button: 0 });
        expect(state.alerts).toEqual(['catalog.alert.recycler.inventory', 'recycler.alert.non.recyclable']);
        expect(screen.getAllByRole('listitem').every((slot) => !slot.getAttribute('aria-label')?.startsWith('rare'))).toBe(true);
    });

    it('draws the held furni at the pointer over the catalog window only', () => {
        const { container } = render(
            <div className="octane-catalog-window">
                <CatalogLayoutRecyclerView page={{} as any} hideNavigation={() => undefined} />
            </div>
        );

        setStatus(RecyclerStatusMessageEvent.SYSTEM_STATUS_ENABLED);
        hold({ id: 103, operation: 'OBJECT_PLACE' });

        fireEvent.mouseMove(container.querySelector('.octane-catalog-air-recycler__machine'), { clientX: 40, clientY: 50 });

        const held = document.body.querySelector<HTMLImageElement>('.octane-catalog-air-recycler__held');

        // On the body, so the moved catalog window does not shift it.
        expect(held?.parentElement).toBe(document.body);
        expect(held?.getAttribute('src')).toBe('furni3.png');
        expect(held?.style.left).toBe('40px');

        fireEvent.mouseMove(document.body, { clientX: 400, clientY: 50 });
        expect(document.body.querySelector('.octane-catalog-air-recycler__held')).toBeNull();
    });

    it('locks the furni of a slot in the inventory and releases them when the page is left', () => {
        const lockable = (id: number, name: string) => {
            const group: any = { name, iconUrl: `${name}.png`, items: [{ id, ref: id, recyclable: true, locked: false }] };

            group.clone = () => group;
            group.lockItemIds = (refs: number[]) => {
                state.locked.push(refs);

                return false;
            };

            return group;
        };

        state.groups = [lockable(100, 'furni0'), lockable(101, 'furni1')];
        state.setGroups = (update) => void update(state.groups);

        const { unmount } = render(<CatalogLayoutRecyclerView page={{} as any} hideNavigation={() => undefined} />);

        setStatus(RecyclerStatusMessageEvent.SYSTEM_STATUS_ENABLED);
        hold({ id: 101, operation: 'OBJECT_PLACE' });
        fireEvent.mouseUp(screen.getByRole('listitem', { name: '1' }), { button: 0 });

        expect(state.locked.at(-1)).toEqual([101]);

        unmount();
        expect(state.locked.at(-1)).toEqual([]);
    });

    it('is open for the inventory while the page shows, and takes a furni it sends', () => {
        const { unmount } = render(<CatalogLayoutRecyclerView page={{} as any} hideNavigation={() => undefined} />);

        setStatus(RecyclerStatusMessageEvent.SYSTEM_STATUS_ENABLED);

        // AIR recycleSelectedFurni: a double click in the inventory puts one of the stack in the next free slot.
        act(() => useRecyclerSessionStore.getState().place?.(state.groups[4] as any));
        act(() => useRecyclerSessionStore.getState().place?.(state.groups[2] as any));

        const filled = screen.getAllByRole('listitem').map((slot) => slot.getAttribute('aria-label'));

        expect(filled.slice(0, 3)).toEqual(['furni4', 'furni2', '3']);

        // The stack has one furni and it is in a slot already: nothing more of it can go in.
        act(() => useRecyclerSessionStore.getState().place?.(state.groups[4] as any));
        expect(state.alerts).toEqual(['recycler.alert.non.recyclable']);

        unmount();
        expect(useRecyclerSessionStore.getState().place).toBeNull();
    });
});
