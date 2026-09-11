import {
    RaidProtectionCapabilityEvent,
    RaidProtectionSaveResultEvent,
    RaidProtectionSettingsEvent,
    RaidProtectionSettingsRequestComposer,
    RaidProtectionSettingsSaveComposer
} from '@octane/renderer';
import { useCallback } from 'react';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
import {
    IRaidProtectionEditable,
    raidProtectionNeedsConfirmation,
    useRaidProtectionStore
} from './raidProtectionStore';

/**
 * Room raid protection: the capability that gates the panel, the stored settings, and the save.
 *
 * The capability is per room and the server resends it on every room entry, so it is never cached
 * across rooms. Turning the protection on goes through a confirmation before anything is sent.
 */
export const useRaidProtection = () => {
    const manageableRoomId = useRaidProtectionStore((state) => state.manageableRoomId);
    const settings = useRaidProtectionStore((state) => state.settings);
    const saving = useRaidProtectionStore((state) => state.saving);
    const pendingConfirmation = useRaidProtectionStore((state) => state.pendingConfirmation);
    const setCapability = useRaidProtectionStore((state) => state.setCapability);
    const setSettings = useRaidProtectionStore((state) => state.setSettings);
    const setSaving = useRaidProtectionStore((state) => state.setSaving);
    const askConfirmation = useRaidProtectionStore((state) => state.askConfirmation);
    const clearConfirmation = useRaidProtectionStore((state) => state.clearConfirmation);

    useMessageEvent<RaidProtectionCapabilityEvent>(RaidProtectionCapabilityEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        setCapability(parser.roomId, parser.canManage);
    });

    useMessageEvent<RaidProtectionSettingsEvent>(RaidProtectionSettingsEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        setSettings({
            roomId: parser.roomId,
            enabled: parser.enabled,
            detectionSensitivity: parser.detectionSensitivity,
            actionType: parser.actionType,
            banDurationSeconds: parser.banDurationSeconds,
            guardEnabled: parser.guardEnabled,
            guardDurationSeconds: parser.guardDurationSeconds,
            guardSensitivity: parser.guardSensitivity,
            incidentActive: parser.incidentActive,
            lastRaidAtEpochSeconds: parser.lastRaidAtEpochSeconds
        });
    });

    useMessageEvent<RaidProtectionSaveResultEvent>(RaidProtectionSaveResultEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        setSettings({
            roomId: parser.roomId,
            enabled: parser.enabled,
            detectionSensitivity: parser.detectionSensitivity,
            actionType: parser.actionType,
            banDurationSeconds: parser.banDurationSeconds,
            guardEnabled: parser.guardEnabled,
            guardDurationSeconds: parser.guardDurationSeconds,
            guardSensitivity: parser.guardSensitivity,
            incidentActive: parser.incidentActive,
            lastRaidAtEpochSeconds: parser.lastRaidAtEpochSeconds
        });
    });

    const requestSettings = useCallback(() => {
        const roomId = useRaidProtectionStore.getState().manageableRoomId;

        if (!roomId) return;

        SendMessageComposer(new RaidProtectionSettingsRequestComposer(roomId));
    }, []);

    const send = useCallback((edited: IRaidProtectionEditable, confirmed: boolean) => {
        const roomId = useRaidProtectionStore.getState().manageableRoomId;

        if (!roomId) return;

        setSaving(true);
        clearConfirmation();

        SendMessageComposer(
            new RaidProtectionSettingsSaveComposer(
                roomId,
                edited.enabled,
                edited.detectionSensitivity,
                edited.actionType,
                edited.banDurationSeconds,
                edited.guardEnabled,
                edited.guardDurationSeconds,
                edited.guardSensitivity,
                confirmed
            )
        );
    }, [clearConfirmation, setSaving]);

    const save = useCallback((edited: IRaidProtectionEditable) => {
        const stored = useRaidProtectionStore.getState().settings;

        if (raidProtectionNeedsConfirmation(stored, edited)) {
            askConfirmation(edited);

            return;
        }

        send(edited, false);
    }, [askConfirmation, send]);

    const confirm = useCallback(() => {
        const edited = useRaidProtectionStore.getState().pendingConfirmation;

        if (!edited) return;

        send(edited, true);
    }, [send]);

    return {
        canManage: manageableRoomId > 0,
        roomId: manageableRoomId,
        settings,
        saving,
        pendingConfirmation,
        requestSettings,
        save,
        confirm,
        cancelConfirmation: clearConfirmation
    };
};
