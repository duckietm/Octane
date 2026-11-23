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
    alerts: [] as string[]
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
    useInventoryFurni: () => ({ groupItems: state.groups }),
    useInventoryTrade: () => ({ isTrading: state.trading }),
    useNotification: () => ({ simpleAlert: (message: string) => state.alerts.push(message) }),
    usePurse: () => ({ getCurrencyAmount: () => state.duckets }),
    useRoom: () => ({ roomSession: state.room }),
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => state.handlers.set(type, handler)
}));

import { PurchaseErrorMessageEvent, RecycleItemsMessageComposer, RecyclerFinishedMessageEvent, RecyclerStatusMessageEvent } from '@octane/renderer';
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
});
