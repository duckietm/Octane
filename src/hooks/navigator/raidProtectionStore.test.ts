import { beforeEach, describe, expect, it } from 'vitest';
import { IRaidProtectionSettings } from '../../api/navigator/RaidProtection';
import { useRaidProtectionStore } from './raidProtectionStore';

const settings = (roomId: number, patch: Partial<IRaidProtectionSettings> = {}): IRaidProtectionSettings => ({
    roomId,
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

const store = () => useRaidProtectionStore.getState();

describe('raid protection controller state (AIR RaidProtectionSettingsController)', () =>
{
    beforeEach(() => store().reset());

    it('keeps the capability of the current room only', () =>
    {
        store().receiveCapability(5, true);
        expect(store().manageableRoomId).toBe(5);

        store().receiveCapability(6, true);
        expect(store().manageableRoomId).toBe(6);

        store().receiveCapability(6, false);
        expect(store().manageableRoomId).toBe(0);
    });

    it('requests once per open, and only for a manageable current room', () =>
    {
        expect(store().request(5, true)).toBe(false);

        store().receiveCapability(5, true);
        expect(store().request(5, false)).toBe(false);
        expect(store().request(5, true)).toBe(true);
        expect(store().request(5, true)).toBe(false);
    });

    it('opens the window on the requested settings and follows later pushes', () =>
    {
        store().receiveCapability(5, true);
        store().request(5, true);
        store().receiveSettings(settings(5), true);

        expect(store().visibleRoomId).toBe(5);
        expect(store().requestedRoomId).toBe(0);

        store().receiveSettings(settings(5, { incidentActive: true }), true);
        expect(store().settings?.incidentActive).toBe(true);
        expect(store().visibleRoomId).toBe(5);
    });

    it('ignores settings of a room the viewer may not manage', () =>
    {
        store().receiveSettings(settings(5), true);
        expect(store().settings).toBeNull();
    });

    it('closes on a saved result and stays open on a refused one', () =>
    {
        store().receiveCapability(5, true);
        store().request(5, true);
        store().receiveSettings(settings(5), true);

        expect(store().receiveSaveResult(0, settings(5), true)).toBe(false);

        store().beginSave(5);
        expect(store().receiveSaveResult(5, settings(5), true)).toBe(true);
        expect(store().visibleRoomId).toBe(5);
        expect(store().savingRoomId).toBe(0);

        store().beginSave(5);
        expect(store().receiveSaveResult(0, settings(5, { enabled: true }), true)).toBe(true);
        expect(store().visibleRoomId).toBe(0);
        expect(store().settings?.enabled).toBe(true);
    });

    it('drops a room when its session ends and hides the window when another starts', () =>
    {
        store().receiveCapability(5, true);
        store().request(5, true);
        store().receiveSettings(settings(5), true);

        store().sessionChanged(5);
        expect(store().visibleRoomId).toBe(0);
        expect(store().manageableRoomId).toBe(5);

        store().clearRoom(5);
        expect(store().manageableRoomId).toBe(0);
        expect(store().settings).toBeNull();
    });
});
