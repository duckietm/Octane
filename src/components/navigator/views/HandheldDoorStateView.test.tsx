import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../../state/handheldStore';

const door = vi.hoisted(() => ({ state: 1, reset: vi.fn(), setSnapshot: vi.fn(), createRoomSession: vi.fn(), goToDesktop: vi.fn() }));

vi.mock('../../../api', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    CreateRoomSession: door.createRoomSession,
    GoToDesktop: door.goToDesktop,
    LocalizeText: (key: string) => key
}));

vi.mock('../../../hooks', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    useDoorState: () => ({ snapshot: { state: door.state, roomInfo: { roomId: 9, roomName: 'Duck Disco' } }, setSnapshot: door.setSnapshot, reset: door.reset })
}));

const { NavigatorDoorStateView } = await import('./NavigatorDoorStateView');

const phone = () => act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));

describe('locked door on a phone', () => {
    beforeEach(() => {
        for (const spy of [door.reset, door.setSnapshot, door.createRoomSession, door.goToDesktop]) spy.mockClear();
    });

    afterEach(() => {
        cleanup();
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
    });

    it('rings the bell from the card and cancels as the desktop does', () => {
        door.state = 1;
        phone();
        render(<NavigatorDoorStateView />);

        expect(screen.getByRole('dialog', { name: 'navigator.doorbell.title' })).toHaveTextContent('Duck Disco');
        fireEvent.click(screen.getByRole('button', { name: 'navigator.doorbell.button.ring' }));
        expect(door.createRoomSession).toHaveBeenCalledWith(9);
        expect(door.setSnapshot).toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'generic.cancel' }));
        expect(door.reset).toHaveBeenCalled();
        expect(door.goToDesktop).not.toHaveBeenCalled();
    });

    it('goes back to the hotel when the waiting is cancelled', () => {
        door.state = 5;
        phone();
        render(<NavigatorDoorStateView />);

        expect(screen.queryByRole('button', { name: 'navigator.doorbell.button.ring' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'generic.cancel' }));
        expect(door.goToDesktop).toHaveBeenCalled();
    });

    it('tries the typed password with the button and with Enter, never an empty one', () => {
        door.state = 7;
        phone();
        render(<NavigatorDoorStateView />);

        const field = screen.getByLabelText('navigator.password.enter');
        const tryButton = screen.getByRole('button', { name: 'navigator.password.button.try' });

        expect(screen.getByText('navigator.password.retryinfo')).toBeInTheDocument();
        expect(tryButton).toBeDisabled();
        fireEvent.change(field, { target: { value: 'quack' } });
        fireEvent.click(tryButton);
        expect(door.createRoomSession).toHaveBeenLastCalledWith(9, 'quack');

        fireEvent.keyDown(field, { key: 'Enter' });
        expect(door.createRoomSession).toHaveBeenCalledTimes(2);
    });

    it('keeps the desktop card when not on a phone', () => {
        door.state = 2;
        render(<NavigatorDoorStateView />);

        expect(screen.queryByRole('dialog')).toBeNull();
        expect(screen.getByText('navigator.password.info')).toBeInTheDocument();
    });
});
