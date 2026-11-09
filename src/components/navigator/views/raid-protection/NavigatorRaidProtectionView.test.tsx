import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IRaidProtectionSettings } from '../../../../api/navigator/RaidProtection';
import { useRaidProtectionStore } from '../../../../hooks/navigator/raidProtectionStore';

const sendSave = vi.fn((..._args: unknown[]) => true);
const showConfirm = vi.fn();

vi.mock('../../../../hooks', async () => ({
    useRaidProtectionStore: (await import('../../../../hooks/navigator/raidProtectionStore')).useRaidProtectionStore,
    useRaidProtectionController: () => undefined,
    isCurrentRaidProtectionRoom: () => true,
    sendRaidProtectionSave: (...args: unknown[]) => sendSave(...args),
    useNavigatorData: () => ({ navigatorData: { enteredGuestRoom: { roomId: 5 } } }),
    useNotificationActions: () => ({ simpleAlert: vi.fn(), showConfirm, showSingleBubble: vi.fn() })
}));

const { NavigatorRaidProtectionView } = await import('./NavigatorRaidProtectionView');

const settings = (patch: Partial<IRaidProtectionSettings> = {}): IRaidProtectionSettings => ({
    roomId: 5,
    enabled: false,
    sensitivity: 1,
    actionType: 0,
    banDurationSeconds: 3600,
    guardEnabled: false,
    guardDurationSeconds: 900,
    guardSensitivity: 1,
    incidentActive: false,
    lastRaidAtEpochSeconds: 0,
    ...patch
});

const open = (value: IRaidProtectionSettings) =>
    act(() =>
    {
        const store = useRaidProtectionStore.getState();

        store.reset();
        store.receiveCapability(5, true);
        store.request(5, true);
        store.receiveSettings(value, true);
    });

describe('raid protection window (AIR raid_protection_settings_xml)', () =>
{
    beforeEach(() =>
    {
        sendSave.mockClear();
        showConfirm.mockClear();
    });

    afterEach(() =>
    {
        cleanup();
        act(() => useRaidProtectionStore.getState().reset());
    });

    it('greys out the protection and guard controls while protection is off', () =>
    {
        open(settings());
        render(<NavigatorRaidProtectionView />);

        for(const field of screen.getAllByRole('combobox')) expect(field).toBeDisabled();
    });

    it('keeps the ban length off for kick and the guard controls off without the guard', () =>
    {
        open(settings({ enabled: true, actionType: 0, guardEnabled: false }));
        render(<NavigatorRaidProtectionView />);

        const [ sensitivity, action, ban, guardDuration ] = screen.getAllByRole('combobox');

        expect(sensitivity).toBeEnabled();
        expect(action).toBeEnabled();
        expect(ban).toBeDisabled();
        expect(guardDuration).toBeDisabled();
    });

    it('asks before switching protection on and saves with the confirmation', () =>
    {
        open(settings());
        render(<NavigatorRaidProtectionView />);

        fireEvent.click(screen.getAllByRole('checkbox')[0]);
        fireEvent.click(screen.getByRole('button', { name: /save|opslaan/i }));

        expect(sendSave).not.toHaveBeenCalled();
        expect(showConfirm).toHaveBeenCalledTimes(1);

        act(() => showConfirm.mock.calls[0][1]());

        expect(sendSave).toHaveBeenCalledWith(expect.objectContaining({ roomId: 5, enabled: true }), true);
    });

    it('saves a change of an enabled protection straight away', () =>
    {
        open(settings({ enabled: true }));
        render(<NavigatorRaidProtectionView />);

        fireEvent.click(screen.getByRole('button', { name: /save|opslaan/i }));

        expect(showConfirm).not.toHaveBeenCalled();
        expect(sendSave).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }), false);
    });

    it('shows the raid going on in red', () =>
    {
        open(settings({ incidentActive: true }));
        render(<NavigatorRaidProtectionView />);

        expect(screen.getByRole('status').querySelector('.is-active')).not.toBeNull();
    });
});
