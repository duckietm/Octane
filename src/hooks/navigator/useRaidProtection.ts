import {
    GetRaidProtectionSettingsComposer,
    RaidProtectionCapabilityEvent,
    RaidProtectionSaveResultEvent,
    RaidProtectionSettingsEvent,
    RaidProtectionSettingsSnapshot,
    RoomSessionEvent,
    SaveRaidProtectionSettingsComposer
} from '@octane/renderer';
import { useRef } from 'react';
import { GetConfigurationValue, GetRoomSession, SendMessageComposer } from '../../api';
import {
    IRaidProtectionEditable,
    IRaidProtectionSettings,
    isValidRaidProtectionSettings,
    parseRaidProtectionLinkRoomId
} from '../../api/navigator/RaidProtection';
import { useMessageEvent, useOctaneEvent } from '../events';
import { useRaidProtectionStore } from './raidProtectionStore';
import { useNavigatorData } from './useNavigatorData';

/** AIR's client switch (raid.protection.enabled); the server has its own, hotel.raid.protection.enabled. */
export const isRaidProtectionFeatureEnabled = (): boolean => GetConfigurationValue<boolean>('raid.protection.enabled', true) !== false;

/** AIR isCurrentEnteredRoom: the navigator's entered room and the active room session are both this room. */
export const isCurrentRaidProtectionRoom = (roomId: number, enteredRoomId: number): boolean =>
    roomId > 0 && enteredRoomId === roomId && (GetRoomSession()?.roomId ?? 0) === roomId;

export const toRaidProtectionSettings = (snapshot: RaidProtectionSettingsSnapshot): IRaidProtectionSettings => ({
    roomId: snapshot.roomId,
    enabled: snapshot.enabled,
    sensitivity: snapshot.sensitivity,
    actionType: snapshot.actionType,
    banDurationSeconds: snapshot.banDurationSeconds,
    guardEnabled: snapshot.guardEnabled,
    guardDurationSeconds: snapshot.guardDurationSeconds,
    guardSensitivity: snapshot.guardSensitivity,
    incidentActive: snapshot.incidentActive,
    lastRaidAtEpochSeconds: snapshot.lastRaidAtEpochSeconds
});

/** navigator/raidprotection/&lt;roomId&gt; (AIR HabboNavigator.linkReceived): ask for the room's settings. */
export const requestRaidProtectionSettings = (rawRoomId: string | null, enteredRoomId: number): boolean =>
{
    const roomId = parseRaidProtectionLinkRoomId(rawRoomId);

    if(roomId === null || !isRaidProtectionFeatureEnabled()) return false;

    if(!useRaidProtectionStore.getState().request(roomId, isCurrentRaidProtectionRoom(roomId, enteredRoomId))) return false;

    SendMessageComposer(new GetRaidProtectionSettingsComposer(roomId));

    return true;
};

/** AIR sendSave: the nine values, the last one saying the owner confirmed switching protection on. */
export const sendRaidProtectionSave = (settings: IRaidProtectionEditable, confirmed: boolean): boolean =>
{
    if(!isValidRaidProtectionSettings(settings)) return false;

    useRaidProtectionStore.getState().beginSave(settings.roomId);
    SendMessageComposer(new SaveRaidProtectionSettingsComposer(
        settings.roomId,
        settings.enabled,
        settings.sensitivity,
        settings.actionType,
        settings.banDurationSeconds,
        settings.guardEnabled,
        settings.guardDurationSeconds,
        settings.guardSensitivity,
        confirmed));

    return true;
};

/**
 * AIR RaidProtectionSettingsController's listeners, mounted once with the window. Calls
 * {@code onSaveResult} with the result code of a save this window sent.
 */
export const useRaidProtectionController = (onSaveResult: (resultCode: number) => void) =>
{
    const { navigatorData } = useNavigatorData();
    const enteredRoomIdRef = useRef(0);

    enteredRoomIdRef.current = navigatorData?.enteredGuestRoom?.roomId ?? 0;

    useMessageEvent<RaidProtectionCapabilityEvent>(RaidProtectionCapabilityEvent, (event) =>
    {
        const parser = event.getParser();

        if(!parser || !isRaidProtectionFeatureEnabled()) return;

        // AIR checks the session only: the capability arrives while the room is still loading.
        if((GetRoomSession()?.roomId ?? 0) !== parser.roomId) return;

        useRaidProtectionStore.getState().receiveCapability(parser.roomId, parser.canManage);
    });

    useMessageEvent<RaidProtectionSettingsEvent>(RaidProtectionSettingsEvent, (event) =>
    {
        const parser = event.getParser();

        if(!parser || !isRaidProtectionFeatureEnabled()) return;

        const settings = toRaidProtectionSettings(parser.settings);

        useRaidProtectionStore.getState().receiveSettings(settings, isCurrentRaidProtectionRoom(settings.roomId, enteredRoomIdRef.current));
    });

    useMessageEvent<RaidProtectionSaveResultEvent>(RaidProtectionSaveResultEvent, (event) =>
    {
        const parser = event.getParser();

        if(!parser || !isRaidProtectionFeatureEnabled()) return;

        const settings = toRaidProtectionSettings(parser.settings);

        if(useRaidProtectionStore.getState().receiveSaveResult(parser.resultCode, settings, isCurrentRaidProtectionRoom(settings.roomId, enteredRoomIdRef.current)))
        {
            onSaveResult(parser.resultCode);
        }
    });

    useOctaneEvent<RoomSessionEvent>([ RoomSessionEvent.CREATED, RoomSessionEvent.STARTED, RoomSessionEvent.ENDED ], (event) =>
    {
        const roomId = event.session?.roomId ?? 0;

        if(event.type === RoomSessionEvent.ENDED) useRaidProtectionStore.getState().clearRoom(roomId);
        else useRaidProtectionStore.getState().sessionChanged(roomId);
    });
};
