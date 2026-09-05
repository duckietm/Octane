import {
    CreateLinkEvent,
    GetSessionDataManager,
    WiredRoomSettingsDataEvent,
    WiredRoomSettingsRequestComposer,
    WiredRoomSettingsSaveComposer,
    WiredUserVariableManageComposer,
    WiredUserVariablesDataEvent,
    WiredUserVariablesRequestComposer,
    WiredUserVariableUpdateComposer
} from '@octane/renderer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { registerSharedHook } from '@/state/useSharedHook';
import { createPacketCooldownGate, LocalizeText, NotificationAlertType, SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';
import { useRoom } from '../rooms';

export interface IWiredAccountPreferences {
    showInspectButton: boolean;
    showSystemNotifications: boolean;
    showToolbarButton: boolean;
}

export interface IWiredRoomSettings {
    canInspect: boolean;
    canManageSettings: boolean;
    canModify: boolean;
    inspectMask: number;
    isLoaded: boolean;
    modifyMask: number;
    roomId: number;
}

export interface IWiredUserVariableDefinition {
    availability: number;
    hasValue: boolean;
    isReadOnly?: boolean;
    isTextConnected: boolean;
    itemId: number;
    name: string;
}

export interface IWiredUserVariableAssignment {
    createdAt: number;
    hasValue: boolean;
    updatedAt: number;
    value: number | null;
    variableItemId: number;
}

export interface IWiredFurniVariableDefinition {
    availability: number;
    hasValue: boolean;
    isReadOnly?: boolean;
    isTextConnected: boolean;
    itemId: number;
    name: string;
}

export interface IWiredFurniVariableAssignment {
    createdAt: number;
    hasValue: boolean;
    updatedAt: number;
    value: number | null;
    variableItemId: number;
}

export interface IWiredRoomVariableDefinition {
    availability: number;
    hasValue: boolean;
    isReadOnly?: boolean;
    isTextConnected: boolean;
    itemId: number;
    name: string;
}

export interface IWiredRoomVariableAssignment {
    createdAt: number;
    hasValue: boolean;
    updatedAt: number;
    value: number | null;
    variableItemId: number;
}

export interface IWiredContextVariableDefinition {
    availability: number;
    hasValue: boolean;
    isReadOnly?: boolean;
    isTextConnected: boolean;
    itemId: number;
    name: string;
}

const WIRED_VARIABLE_TARGET_USER = 0;
const WIRED_VARIABLE_TARGET_FURNI = 1;
const WIRED_VARIABLE_TARGET_ROOM = 3;
const WIRED_VARIABLE_MANAGE_ACTION_ASSIGN = 0;
const WIRED_VARIABLE_MANAGE_ACTION_REMOVE = 1;

const WIRED_TOOLS_STORAGE_PREFIX = 'nitro.wired.tools.preferences';
const getCurrentUnixTime = () => Math.floor(Date.now() / 1000);
const DEFAULT_ACCOUNT_PREFERENCES: IWiredAccountPreferences = {
    showToolbarButton: false,
    showInspectButton: false,
    showSystemNotifications: false
};

const DEFAULT_ROOM_SETTINGS: IWiredRoomSettings = {
    roomId: 0,
    inspectMask: 0,
    modifyMask: 0,
    canInspect: false,
    canModify: false,
    canManageSettings: false,
    isLoaded: false
};

/**
 * Internal singleton state-+-actions hook for the Wired tools subsystem.
 * Public consumers should NOT call this directly — go through
 * useWiredToolsState (read-only slice) or useWiredToolsActions
 * (imperative slice). useWiredTools is the legacy shim that composes
 * both into the original shape.
 *
 * Wrapped by the Zustand bridge at the public-hook layer so every consumer in
 * the tree sees the same instance (matches the previous
 * shared-store wiring).
 */
export const useWiredToolsStore = () => {
    const { roomSession = null } = useRoom();
    const { simpleAlert = null } = useNotification();
    const [accountPreferences, setAccountPreferences] = useState<IWiredAccountPreferences>(DEFAULT_ACCOUNT_PREFERENCES);
    const [roomSettings, setRoomSettings] = useState<IWiredRoomSettings>(DEFAULT_ROOM_SETTINGS);
    const [userVariableDefinitions, setUserVariableDefinitions] = useState<IWiredUserVariableDefinition[]>([]);
    const [userVariableAssignments, setUserVariableAssignments] = useState<Record<number, IWiredUserVariableAssignment[]>>({});
    const [furniVariableDefinitions, setFurniVariableDefinitions] = useState<IWiredFurniVariableDefinition[]>([]);
    const [furniVariableAssignments, setFurniVariableAssignments] = useState<Record<number, IWiredFurniVariableAssignment[]>>({});
    const [roomVariableDefinitions, setRoomVariableDefinitions] = useState<IWiredRoomVariableDefinition[]>([]);
    const [roomVariableAssignments, setRoomVariableAssignments] = useState<IWiredRoomVariableAssignment[]>([]);
    const [contextVariableDefinitions, setContextVariableDefinitions] = useState<IWiredContextVariableDefinition[]>([]);
    const [areUserVariablesLoaded, setAreUserVariablesLoaded] = useState(false);
    const userVariablesRequestGateRef = useRef<ReturnType<typeof createPacketCooldownGate> | null>(null);

    if (!userVariablesRequestGateRef.current) {
        userVariablesRequestGateRef.current = createPacketCooldownGate();
    }

    const requestUserVariables = useCallback(() => {
        if (!roomSettings.canInspect) return;

        userVariablesRequestGateRef.current?.request(() => {
            SendMessageComposer(new WiredUserVariablesRequestComposer());
        });
    }, [roomSettings.canInspect]);

    const storageKey = useMemo(() => {
        const userId = GetSessionDataManager().userId;

        return `${WIRED_TOOLS_STORAGE_PREFIX}.${userId || 'guest'}`;
    }, []);

    useEffect(() => {
        try {
            const rawValue = window.localStorage.getItem(storageKey);

            if (!rawValue) {
                setAccountPreferences(DEFAULT_ACCOUNT_PREFERENCES);
                return;
            }

            const parsedValue = JSON.parse(rawValue) as Partial<IWiredAccountPreferences>;

            setAccountPreferences({
                ...DEFAULT_ACCOUNT_PREFERENCES,
                ...(parsedValue || {})
            });
        } catch {
            setAccountPreferences(DEFAULT_ACCOUNT_PREFERENCES);
        }
    }, [storageKey]);

    useEffect(() => {
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(accountPreferences));
        } catch {}
    }, [accountPreferences, storageKey]);

    useEffect(() => {
        if (!roomSession?.roomId) {
            setRoomSettings(DEFAULT_ROOM_SETTINGS);
            setUserVariableDefinitions([]);
            setUserVariableAssignments({});
            setFurniVariableDefinitions([]);
            setFurniVariableAssignments({});
            setRoomVariableDefinitions([]);
            setRoomVariableAssignments([]);
            setContextVariableDefinitions([]);
            setAreUserVariablesLoaded(false);
            return;
        }

        setRoomSettings((prevValue) => ({
            ...DEFAULT_ROOM_SETTINGS,
            roomId: roomSession.roomId,
            canInspect: prevValue.roomId === roomSession.roomId ? prevValue.canInspect : false,
            canModify: prevValue.roomId === roomSession.roomId ? prevValue.canModify : false,
            canManageSettings: prevValue.roomId === roomSession.roomId ? prevValue.canManageSettings : false
        }));

        SendMessageComposer(new WiredRoomSettingsRequestComposer());
    }, [roomSession?.roomId]);

    useEffect(() => {
        if (!roomSession?.roomId || !roomSettings.canInspect) {
            setUserVariableDefinitions([]);
            setUserVariableAssignments({});
            setFurniVariableDefinitions([]);
            setFurniVariableAssignments({});
            setRoomVariableDefinitions([]);
            setRoomVariableAssignments([]);
            setContextVariableDefinitions([]);
            setAreUserVariablesLoaded(false);
            return;
        }

        requestUserVariables();
    }, [roomSession?.roomId, roomSettings.canInspect, requestUserVariables]);

    useMessageEvent<WiredRoomSettingsDataEvent>(WiredRoomSettingsDataEvent, (event) => {
        const parser = event.getParser();

        if (roomSession?.roomId && parser.roomId && parser.roomId !== roomSession.roomId) return;

        setRoomSettings({
            roomId: parser.roomId,
            inspectMask: parser.inspectMask,
            modifyMask: parser.modifyMask,
            canInspect: parser.canInspect,
            canModify: parser.canModify,
            canManageSettings: parser.canManageSettings,
            isLoaded: true
        });
    });

    useMessageEvent<WiredUserVariablesDataEvent>(WiredUserVariablesDataEvent, (event) => {
        const parser = event.getParser();

        if (roomSession?.roomId && parser.roomId && parser.roomId !== roomSession.roomId) return;

        const nextAssignments: Record<number, IWiredUserVariableAssignment[]> = {};
        const nextFurniAssignments: Record<number, IWiredFurniVariableAssignment[]> = {};

        for (const userEntry of parser.users || []) {
            nextAssignments[userEntry.userId] = [...(userEntry.assignments || [])];
        }

        for (const furniEntry of parser.furnis || []) {
            nextFurniAssignments[furniEntry.furniId] = [...(furniEntry.assignments || [])];
        }

        setUserVariableDefinitions([...(parser.definitions || [])]);
        setUserVariableAssignments(nextAssignments);
        setFurniVariableDefinitions([...(parser.furniDefinitions || [])]);
        setFurniVariableAssignments(nextFurniAssignments);
        setRoomVariableDefinitions([...(parser.roomDefinitions || [])]);
        setRoomVariableAssignments([...(parser.roomAssignments || [])]);
        setContextVariableDefinitions([...(parser.contextDefinitions || [])]);
        setAreUserVariablesLoaded(true);
    });

    const updateAccountPreferences = useCallback((partialPreferences: Partial<IWiredAccountPreferences>) => {
        setAccountPreferences((prevValue) => ({
            ...prevValue,
            ...partialPreferences
        }));
    }, []);

    const saveRoomSettings = useCallback(
        (inspectMask: number, modifyMask: number) => {
            if (!roomSettings.canManageSettings) return;

            setRoomSettings((prevValue) => ({
                ...prevValue,
                inspectMask,
                modifyMask
            }));

            SendMessageComposer(new WiredRoomSettingsSaveComposer(inspectMask, modifyMask));
        },
        [roomSettings.canManageSettings]
    );

    const updateUserVariableValue = useCallback(
        (userId: number, variableItemId: number, value: number) => {
            if (!roomSettings.canModify) return;

            setUserVariableAssignments((prevValue) => {
                const existingAssignments = prevValue[userId];

                if (!existingAssignments?.length) return prevValue;

                let didChange = false;
                const nextAssignments = existingAssignments.map((assignment) => {
                    if (assignment.variableItemId !== variableItemId) return assignment;

                    didChange = true;

                    return {
                        ...assignment,
                        hasValue: true,
                        value,
                        updatedAt: getCurrentUnixTime()
                    };
                });

                if (!didChange) return prevValue;

                return {
                    ...prevValue,
                    [userId]: nextAssignments
                };
            });

            SendMessageComposer(new WiredUserVariableUpdateComposer(WIRED_VARIABLE_TARGET_USER, userId, variableItemId, value));
        },
        [roomSettings.canModify]
    );

    const updateFurniVariableValue = useCallback(
        (furniId: number, variableItemId: number, value: number) => {
            if (!roomSettings.canModify) return;

            setFurniVariableAssignments((prevValue) => {
                const existingAssignments = prevValue[furniId];

                if (!existingAssignments?.length) return prevValue;

                let didChange = false;
                const nextAssignments = existingAssignments.map((assignment) => {
                    if (assignment.variableItemId !== variableItemId) return assignment;

                    didChange = true;

                    return {
                        ...assignment,
                        hasValue: true,
                        value,
                        updatedAt: getCurrentUnixTime()
                    };
                });

                if (!didChange) return prevValue;

                return {
                    ...prevValue,
                    [furniId]: nextAssignments
                };
            });

            SendMessageComposer(new WiredUserVariableUpdateComposer(WIRED_VARIABLE_TARGET_FURNI, furniId, variableItemId, value));
        },
        [roomSettings.canModify]
    );

    const updateRoomVariableValue = useCallback(
        (variableItemId: number, value: number) => {
            if (!roomSettings.canModify) return;

            setRoomVariableAssignments((prevValue) => {
                const now = getCurrentUnixTime();
                let didChange = false;
                const nextAssignments = prevValue.map((assignment) => {
                    if (assignment.variableItemId !== variableItemId) return assignment;

                    didChange = true;

                    return {
                        ...assignment,
                        hasValue: true,
                        value,
                        updatedAt: now
                    };
                });

                if (didChange) return nextAssignments;

                return [
                    ...prevValue,
                    {
                        variableItemId,
                        hasValue: true,
                        value,
                        createdAt: 0,
                        updatedAt: now
                    }
                ];
            });

            SendMessageComposer(new WiredUserVariableUpdateComposer(WIRED_VARIABLE_TARGET_ROOM, roomSettings.roomId, variableItemId, value));
        },
        [roomSettings.canModify, roomSettings.roomId]
    );

    const assignUserVariable = useCallback(
        (userId: number, variableItemId: number, value: number) => {
            if (!roomSettings.canModify) return;

            const definition = userVariableDefinitions.find((entry) => entry.itemId === variableItemId);

            if (!definition) return;

            const now = getCurrentUnixTime();
            const normalizedValue = definition.hasValue ? value : null;

            setUserVariableAssignments((prevValue) => {
                const existingAssignments = [...(prevValue[userId] || [])];
                const existingIndex = existingAssignments.findIndex((assignment) => assignment.variableItemId === variableItemId);

                if (existingIndex >= 0) {
                    const existingAssignment = existingAssignments[existingIndex];

                    existingAssignments[existingIndex] = {
                        ...existingAssignment,
                        hasValue: definition.hasValue,
                        value: normalizedValue,
                        updatedAt: now
                    };
                } else {
                    existingAssignments.push({
                        variableItemId,
                        hasValue: definition.hasValue,
                        value: normalizedValue,
                        createdAt: now,
                        updatedAt: now
                    });
                }

                return {
                    ...prevValue,
                    [userId]: existingAssignments
                };
            });

            SendMessageComposer(
                new WiredUserVariableManageComposer(
                    WIRED_VARIABLE_MANAGE_ACTION_ASSIGN,
                    WIRED_VARIABLE_TARGET_USER,
                    userId,
                    variableItemId,
                    Number(normalizedValue ?? 0)
                )
            );
        },
        [roomSettings.canModify, userVariableDefinitions]
    );

    const removeUserVariable = useCallback(
        (userId: number, variableItemId: number) => {
            if (!roomSettings.canModify) return;

            setUserVariableAssignments((prevValue) => {
                const existingAssignments = prevValue[userId];

                if (!existingAssignments?.length) return prevValue;

                const nextAssignments = existingAssignments.filter((assignment) => assignment.variableItemId !== variableItemId);

                if (nextAssignments.length === existingAssignments.length) return prevValue;

                const nextValue = { ...prevValue };

                if (nextAssignments.length) nextValue[userId] = nextAssignments;
                else delete nextValue[userId];

                return nextValue;
            });

            SendMessageComposer(
                new WiredUserVariableManageComposer(WIRED_VARIABLE_MANAGE_ACTION_REMOVE, WIRED_VARIABLE_TARGET_USER, userId, variableItemId, 0)
            );
        },
        [roomSettings.canModify]
    );

    const assignFurniVariable = useCallback(
        (furniId: number, variableItemId: number, value: number) => {
            if (!roomSettings.canModify) return;

            const definition = furniVariableDefinitions.find((entry) => entry.itemId === variableItemId);

            if (!definition) return;

            const now = getCurrentUnixTime();
            const normalizedValue = definition.hasValue ? value : null;

            setFurniVariableAssignments((prevValue) => {
                const existingAssignments = [...(prevValue[furniId] || [])];
                const existingIndex = existingAssignments.findIndex((assignment) => assignment.variableItemId === variableItemId);

                if (existingIndex >= 0) {
                    const existingAssignment = existingAssignments[existingIndex];

                    existingAssignments[existingIndex] = {
                        ...existingAssignment,
                        hasValue: definition.hasValue,
                        value: normalizedValue,
                        updatedAt: now
                    };
                } else {
                    existingAssignments.push({
                        variableItemId,
                        hasValue: definition.hasValue,
                        value: normalizedValue,
                        createdAt: now,
                        updatedAt: now
                    });
                }

                return {
                    ...prevValue,
                    [furniId]: existingAssignments
                };
            });

            SendMessageComposer(
                new WiredUserVariableManageComposer(
                    WIRED_VARIABLE_MANAGE_ACTION_ASSIGN,
                    WIRED_VARIABLE_TARGET_FURNI,
                    furniId,
                    variableItemId,
                    Number(normalizedValue ?? 0)
                )
            );
        },
        [furniVariableDefinitions, roomSettings.canModify]
    );

    const removeFurniVariable = useCallback(
        (furniId: number, variableItemId: number) => {
            if (!roomSettings.canModify) return;

            setFurniVariableAssignments((prevValue) => {
                const existingAssignments = prevValue[furniId];

                if (!existingAssignments?.length) return prevValue;

                const nextAssignments = existingAssignments.filter((assignment) => assignment.variableItemId !== variableItemId);

                if (nextAssignments.length === existingAssignments.length) return prevValue;

                const nextValue = { ...prevValue };

                if (nextAssignments.length) nextValue[furniId] = nextAssignments;
                else delete nextValue[furniId];

                return nextValue;
            });

            SendMessageComposer(
                new WiredUserVariableManageComposer(WIRED_VARIABLE_MANAGE_ACTION_REMOVE, WIRED_VARIABLE_TARGET_FURNI, furniId, variableItemId, 0)
            );
        },
        [roomSettings.canModify]
    );

    const showInvalidRoomAlert = useCallback(() => {
        if (!simpleAlert) return;

        simpleAlert(LocalizeText('wiredmenu.invalid_room.desc'), NotificationAlertType.ALERT, null, null, LocalizeText('generic.alert.title'));
    }, [simpleAlert]);

    const openMonitor = useCallback(() => {
        if (!roomSettings.canInspect) {
            showInvalidRoomAlert();
            return;
        }

        CreateLinkEvent('wired-tools/show');
    }, [roomSettings.canInspect, showInvalidRoomAlert]);

    const openInspectionForFurni = useCallback(
        (objectId: number, category: number) => {
            if (!roomSettings.canInspect) {
                showInvalidRoomAlert();
                return;
            }

            CreateLinkEvent(`wired-tools/inspection/furni/${objectId}/${category}`);
        },
        [roomSettings.canInspect, showInvalidRoomAlert]
    );

    const openInspectionForUser = useCallback(
        (roomIndex: number) => {
            if (!roomSettings.canInspect) {
                showInvalidRoomAlert();
                return;
            }

            CreateLinkEvent(`wired-tools/inspection/user/${roomIndex}`);
        },
        [roomSettings.canInspect, showInvalidRoomAlert]
    );

    const showToolbarButton = !!roomSession?.roomId && roomSettings.canInspect && accountPreferences.showToolbarButton;
    const showInspectButton = !!roomSession?.roomId && roomSettings.canInspect && accountPreferences.showInspectButton;

    return {
        accountPreferences,
        roomSettings,
        showInspectButton,
        showToolbarButton,
        userVariableDefinitions,
        userVariableAssignments,
        furniVariableDefinitions,
        furniVariableAssignments,
        roomVariableDefinitions,
        roomVariableAssignments,
        contextVariableDefinitions,
        areUserVariablesLoaded,
        updateAccountPreferences,
        saveRoomSettings,
        requestUserVariables,
        assignUserVariable,
        removeUserVariable,
        updateUserVariableValue,
        assignFurniVariable,
        removeFurniVariable,
        updateFurniVariableValue,
        updateRoomVariableValue,
        openMonitor,
        openInspectionForFurni,
        openInspectionForUser
    };
};

registerSharedHook(useWiredToolsStore);
