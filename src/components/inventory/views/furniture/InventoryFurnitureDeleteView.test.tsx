import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const showConfirm = vi.fn();
const sent = vi.fn();
let openDelete: (event: any) => void = () => {};

vi.mock('../../../../hooks', () => ({
    useNotification: () => ({ showConfirm }),
    useUiEvent: (_type: string, handler: (event: any) => void) => {
        openDelete = handler;
    }
}));
vi.mock('../../../../api', async (importOriginal) => ({
    ...(await importOriginal<any>()),
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    SendMessageComposer: (composer: unknown) => sent(composer)
}));
vi.mock('../../../../common', async (importOriginal) => ({
    ...(await importOriginal<any>()),
    LayoutFurniImageView: () => null
}));

import { InventoryFurnitureDeleteView } from './InventoryFurnitureDeleteView';

afterEach(() => {
    cleanup();
    showConfirm.mockReset();
    sent.mockReset();
});

const open = () => {
    render(<InventoryFurnitureDeleteView />);
    act(() => openDelete({ item: { id: 7, type: 1, isWallItem: false, extra: 0 }, amount: 5 }));
};

describe('InventoryFurnitureDeleteView', () => {
    it('opens one confirm however many times Delete is clicked', () => {
        open();
        const button = screen.getByRole('button', { name: 'Delete' });

        fireEvent.click(button);
        fireEvent.click(button);

        // Two confirms used to stack, and confirming both deleted the amount twice.
        expect(showConfirm).toHaveBeenCalledTimes(1);
    });

    it('lets the user ask again after cancelling', () => {
        open();
        const button = screen.getByRole('button', { name: 'Delete' });

        fireEvent.click(button);
        const cancel = showConfirm.mock.calls[0][2];
        act(() => cancel());

        act(() => openDelete({ item: { id: 7, type: 1, isWallItem: false, extra: 0 }, amount: 5 }));
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

        expect(showConfirm).toHaveBeenCalledTimes(2);
    });
});
