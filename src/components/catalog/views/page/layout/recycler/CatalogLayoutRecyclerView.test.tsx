import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ sent: [] as unknown[], handlers: new Map<unknown, (event: unknown) => void>(), groups: [] as unknown[] }));

vi.mock('../../../../../../api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../../api')>()),
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string) => key,
    SendMessageComposer: (composer: unknown) => state.sent.push(composer)
}));

vi.mock('../../../../../../hooks', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../../hooks')>()),
    useInventoryFurni: () => ({ groupItems: state.groups }),
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => state.handlers.set(type, handler)
}));

import { PurchaseErrorMessageEvent, RecycleItemsMessageComposer, RecyclerFinishedMessageEvent, RecyclerStatusMessageEvent } from '@octane/renderer';
import { CatalogLayoutRecyclerView } from './CatalogLayoutRecyclerView';

const group = (id: number, name: string) => ({ name, iconUrl: `${name}.png`, items: [{ id, recyclable: true, locked: false }] });

const setStatus = (recyclerStatus: number) =>
    act(() => state.handlers.get(RecyclerStatusMessageEvent)?.({ getParser: () => ({ recyclerStatus, recyclerTimeoutSeconds: 0 }) }));

describe('recycler page (AIR layout_recycler_xml + recyclerWidget_xml)', () => {
    afterEach(cleanup);

    beforeEach(() => {
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
        act(() => state.handlers.get(PurchaseErrorMessageEvent)?.({ getParser: () => ({ code: 0 }) }));

        expect(screen.getByRole('status')).toHaveTextContent('recycler.info.failed');
    });
});
