import { beforeEach, describe, expect, it } from 'vitest';
import {
    IRaidProtectionSettings,
    raidProtectionHasEdits,
    raidProtectionNeedsConfirmation,
    useRaidProtectionStore
} from './raidProtectionStore';

const stored = (overrides: Partial<IRaidProtectionSettings> = {}): IRaidProtectionSettings => ({
    roomId: 42,
    enabled: false,
    detectionSensitivity: 1,
    actionType: 0,
    banDurationSeconds: 3600,
    guardEnabled: false,
    guardDurationSeconds: 1800,
    guardSensitivity: 2,
    incidentActive: false,
    lastRaidAtEpochSeconds: 0,
    ...overrides
});

const editableOf = (settings: IRaidProtectionSettings) => ({
    enabled: settings.enabled,
    detectionSensitivity: settings.detectionSensitivity,
    actionType: settings.actionType,
    banDurationSeconds: settings.banDurationSeconds,
    guardEnabled: settings.guardEnabled,
    guardDurationSeconds: settings.guardDurationSeconds,
    guardSensitivity: settings.guardSensitivity
});

describe('raidProtectionStore', () => {
    beforeEach(() => useRaidProtectionStore.getState().reset());

    it('keeps the capability only while the server grants it', () => {
        useRaidProtectionStore.getState().setCapability(42, true);
        expect(useRaidProtectionStore.getState().manageableRoomId).toBe(42);

        useRaidProtectionStore.getState().setCapability(42, false);
        expect(useRaidProtectionStore.getState().manageableRoomId).toBe(0);
    });

    it('drops the previous room settings when the capability moves to another room', () => {
        useRaidProtectionStore.getState().setCapability(42, true);
        useRaidProtectionStore.getState().setSettings(stored());
        expect(useRaidProtectionStore.getState().settings).not.toBeNull();

        useRaidProtectionStore.getState().setCapability(43, true);
        expect(useRaidProtectionStore.getState().settings).toBeNull();
        expect(useRaidProtectionStore.getState().manageableRoomId).toBe(43);
    });

    it('ignores settings for a room that is not the manageable one', () => {
        useRaidProtectionStore.getState().setCapability(42, true);
        useRaidProtectionStore.getState().setSettings(stored({ roomId: 99 }));

        expect(useRaidProtectionStore.getState().settings).toBeNull();
    });

    it('clears a pending save and its confirmation when fresh settings arrive', () => {
        useRaidProtectionStore.getState().setCapability(42, true);
        useRaidProtectionStore.getState().setSaving(true);
        useRaidProtectionStore.getState().askConfirmation(editableOf(stored({ enabled: true })));

        useRaidProtectionStore.getState().setSettings(stored({ enabled: true }));

        expect(useRaidProtectionStore.getState().saving).toBe(false);
        expect(useRaidProtectionStore.getState().pendingConfirmation).toBeNull();
    });
});

describe('raidProtectionHasEdits', () => {
    it('ignores the two state fields, which the user cannot edit', () => {
        const current = stored();
        const withState = stored({ incidentActive: true, lastRaidAtEpochSeconds: 1_757_600_000 });

        expect(raidProtectionHasEdits(withState, editableOf(current))).toBe(false);
    });

    it('sees a real change', () => {
        expect(raidProtectionHasEdits(stored(), editableOf(stored({ banDurationSeconds: 86400 })))).toBe(true);
    });
});

describe('raidProtectionNeedsConfirmation', () => {
    it('asks only when the protection is being switched on', () => {
        expect(raidProtectionNeedsConfirmation(stored(), editableOf(stored({ enabled: true })))).toBe(true);
        expect(raidProtectionNeedsConfirmation(stored({ enabled: true }), editableOf(stored()))).toBe(false);
        expect(
            raidProtectionNeedsConfirmation(stored({ enabled: true }), editableOf(stored({ enabled: true })))
        ).toBe(false);
    });
});
