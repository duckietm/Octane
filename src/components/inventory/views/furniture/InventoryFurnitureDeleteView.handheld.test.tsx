import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../../../state/handheldStore';

const showConfirm = vi.fn();
const sent = vi.fn();
let openDelete: (event: any) => void = () => {};

vi.mock('@octane/renderer', async (importOriginal) => ({
    ...(await importOriginal<any>()),
    DeleteItemMessageComposer: class {
        public readonly args: unknown[];

        constructor(...args: unknown[]) {
            this.args = args;
        }
    }
}));
vi.mock('../../../../hooks', () => ({
    useNotification: () => ({ showConfirm }),
    useUiEvent: (_type: string, handler: (event: any) => void) => {
        openDelete = handler;
    }
}));
vi.mock('../../../../api', async (importOriginal) => ({
    ...(await importOriginal<any>()),
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string, keys: string[] = [], values: string[] = []) =>
        keys.reduce((text, key, index) => text.replace(`%${key}%`, values[index]), fallback),
    SendMessageComposer: (composer: unknown) => sent(composer)
}));
vi.mock('../../../../common/layout/LayoutFurniImageView', () => ({ LayoutFurniImageView: () => null }));
vi.mock('../../../../common', async (importOriginal) => ({
    ...(await importOriginal<any>()),
    LayoutFurniImageView: () => null
}));

import { InventoryFurnitureDeleteView } from './InventoryFurnitureDeleteView';

const open = (amount = 5) => {
    render(<InventoryFurnitureDeleteView />);
    act(() => openDelete({ item: { id: 7, type: 1, isWallItem: false, extra: 0 }, amount }));
};

beforeEach(() => {
    const container = document.createElement('div');
    container.id = 'draggable-windows-container';
    document.body.appendChild(container);
    act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
});

afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    showConfirm.mockReset();
    sent.mockReset();
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
});

describe('InventoryFurnitureDeleteView on a phone', () => {
    it('is a card with the amount stepper, and asks the same confirm with the chosen amount', () => {
        open();

        expect(screen.getByTestId('inventory-delete-card')).toBeInTheDocument();
        expect(screen.getByText('You have 5')).toBeInTheDocument();

        const fewer = screen.getByRole('button', { name: 'Fewer' });
        const more = screen.getByRole('button', { name: 'More' });

        expect(fewer).toBeDisabled();
        fireEvent.click(more);
        fireEvent.click(more);
        expect((screen.getByRole('spinbutton', { name: 'How many' }) as HTMLInputElement).value).toBe('3');

        fireEvent.click(screen.getByRole('button', { name: 'Maximum' }));
        expect(more).toBeDisabled();

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

        expect(showConfirm).toHaveBeenCalledTimes(1);
        expect(showConfirm.mock.calls[0][0]).toContain('5');

        act(() => showConfirm.mock.calls[0][1]());

        expect(sent).toHaveBeenCalledTimes(1);
        expect(sent.mock.calls[0][0].args).toEqual([7, 5]);
        expect(screen.queryByTestId('inventory-delete-card')).toBeNull();
    });

    it('closes from Cancel without sending anything', () => {
        open();

        fireEvent.click(screen.getByRole('button', { name: 'generic.cancel' }));

        expect(screen.queryByTestId('inventory-delete-card')).toBeNull();
        expect(showConfirm).not.toHaveBeenCalled();
        expect(sent).not.toHaveBeenCalled();
    });

    it('leaves the stepper out for a single furni', () => {
        open(1);

        expect(screen.queryByRole('button', { name: 'More' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled();
    });

    it('keeps the desktop window off a phone', () => {
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
        open();

        expect(screen.queryByTestId('inventory-delete-card')).toBeNull();
        expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });
});
