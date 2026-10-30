import {
    AddLinkEventTracker,
    AvatarExpressionEnum,
    FigureUpdateEvent,
    FurnitureFloorAddEvent,
    FurnitureFloorUpdateEvent,
    FurnitureMultiStateComposer,
    FurnitureWallMultiStateComposer,
    FurnitureWallUpdateComposer,
    FurnitureWallUpdateEvent,
    GetRoomEngine,
    GetSessionDataManager,
    GetStage,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    RoomControllerLevel,
    RoomObjectCategory,
    RoomObjectType,
    RoomObjectVariable,
    RoomUnitDanceEvent,
    RoomUnitEffectEvent,
    RoomUnitExpressionEvent,
    RoomUnitHandItemEvent,
    RoomUnitInfoEvent,
    RoomUnitStatusEvent,
    UpdateFurniturePositionComposer,
    Vector3d,
    WiredErrorLogsClearComposer,
    WiredErrorLogsEvent,
    WiredErrorLogsRequestComposer,
    WiredFurniRuntimeStateEvent,
    WiredFurniRuntimeStateRequestComposer,
    WiredMonitorDataEvent,
    WiredMonitorRequestComposer,
    WiredRoomStatsEvent,
    WiredRoomStatsRequestComposer,
    WiredUserInspectMoveComposer
} from '@octane/renderer';
import { FC, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    AddAnimationTickerCallback,
    AvatarInfoUtilities,
    createPacketCooldownGate,
    GetRoomObjectBounds,
    GetRoomObjectScreenLocation,
    IsOwnerOfFloorFurniture,
    LocalizeText,
    localizeWithFallback,
    NotificationAlertType,
    NotificationBubbleType,
    canHighlightWiredBoxesFor,
    decodeUserVariableHolder,
    findUserVariableHolderData,
    getWiredObjectInspectionRequest,
    getWiredObjectInspectionValues,
    SendMessageComposer,
    toWiredInspectionAssignments,
    userVariableHolderKey,
    WiredSelectionVisualizer
} from '../../api';
import { NotificationConfirmItem } from '../../api/notification/NotificationConfirmItem';
import { IsBuildersClubFurniId, IsTemporaryFurniId } from '../../api/utils/FurniIdBand';
import wiredGlobalPlaceholderImage from '../../assets/images/wiredtools/wired_global_placeholder.png';
import wiredMonitorImage from '../../assets/images/wiredtools/wired_monitor.png';
import {
    Button,
    DraggableWindowPosition,
    LayoutAvatarImageView,
    LayoutPetImageView,
    LayoutRoomObjectImageView,
    OctaneCardContentView,
    OctaneCardHeaderView,
    OctaneCardTabsItemView,
    OctaneCardTabsView,
    OctaneCardView,
    Text
} from '../../common';
import { useInventoryTrade, useMessageEvent, useNotification, useObjectSelectedEvent, useRoom, useWiredObjectInspection, useWiredTools, useWiredVariableCatalog, useWiredVariableHolders, WIRED_VARIABLE_HOLDERS_POLL_MS } from '../../hooks';
import { isPersistedWiredVariable, WIRED_VARIABLE_TYPE_CREATED, WIRED_VARIABLE_TYPE_INTERNAL, wiredVariablePickerRows } from '../../api/wired/WiredVariableCatalog';
import { WIRED_OFFICIAL_TARGET_FURNI, WIRED_OFFICIAL_TARGET_USER } from '../../api/wired/WiredVariableTargets';
import { VARIABLES_TYPE_TARGET, wiredVariablePropertyRows, wiredVariableToDefinition } from './WiredVariableCatalog.helpers';
import { WiredChestsTabView } from './WiredChestsTabView';
import { WiredShareTabView } from './WiredShareTabView';
import { isRecolorableFurniKey, parseRecolorableFurniValue, recolorableFurniVariables } from './WiredRecolorableFurni.helpers';
import {
    EDITABLE_FURNI_VARIABLES,
    EDITABLE_USER_VARIABLES,
    INSPECTION_ELEMENTS,
    MONITOR_ERROR_INFO,
    MONITOR_LOG_ORDER,
    MONTH_NAMES,
    TABS,
    TEAM_COLOR_NAMES,
    VARIABLES_ELEMENTS,
    WEEKDAY_NAMES,
    WIRED_CLOCK_REFRESH_MS,
    WIRED_FREEZE_EFFECT_IDS,
    WIRED_FURNI_RUNTIME_ACTION_READ,
    WIRED_FURNI_RUNTIME_ACTION_WRITE,
    getBuiltinTextConnectorLabel,
    WIRED_INSPECTION_REFRESH_MS,
    WIRED_MONITOR_ACTION_FETCH,
    WIRED_MONITOR_POLL_MS,
    WIRED_MONITOR_ROOM_STATS_POLL_MS,
    WIRED_VARIABLES_IDLE_POLL_MS,
    WIRED_VARIABLES_LIVE_TABS,
    WIRED_VARIABLES_POLL_MS
} from './WiredCreatorTools.constants';
import {
    buildMonitorLogs,
    clampWiredVariableValue,
    exceedsVariableHighlightLimit,
    formatMonitorHistoryOccurrence,
    formatMonitorSource,
    formatVariableTimestamp,
    getHotelDateTimeParts,
    getHotelTimeFormatter,
    isStackOnlyVariable,
    normalizeMonitorReason,
    parseWiredVariableValue,
    resolveMonitorErrorDescription,
    resolveMonitorRoomCounters,
    splitMonitorStatLine,
    toMonitorErrorLogs,
    WIRED_MONITOR_CLEAR_LOGS_TIMEOUT_MS,
    WIRED_MONITOR_COLOR,
    WIRED_MONITOR_THRESHOLDS,
    wiredMonitorColor
} from './WiredCreatorTools.helpers';
import {
    HotelDateTimeParts,
    InspectionElementButton,
    InspectionElementType,
    InspectionFurniLiveState,
    InspectionFurniSelection,
    InspectionUserLiveState,
    InspectionUserSelection,
    InspectionUserTeamData,
    InspectionVariable,
    ManagedHolderVariableEntry,
    MonitorLog,
    MonitorLogDetails,
    MonitorStat,
    ParsedWallLocation,
    TeamEffectData,
    VariableDefinition,
    VariableHighlightOverlay,
    VariableHighlightTarget,
    VariablesElementButton,
    VariablesElementType,
    VariableTextValue,
    WiredToolsTab
} from './WiredCreatorTools.types';
import { WiredInspectionTabView } from './WiredInspectionTabView';
import { WiredMonitorTabView } from './WiredMonitorTabView';
import { WiredRoomLogsView } from './WiredRoomLogsView';
import { WiredSelfDonationView } from './WiredSelfDonationView';
import { WiredToolsSettingsTabView } from './WiredToolsSettingsTabView';
import { WiredArrayInspectorView, wiredArrayVariableTypeOf } from './WiredArrayInspectorView';
import { HOLDER_TYPE_FURNI, HOLDER_TYPE_USER, WiredHolderDescription, WiredVariableOwnersView } from './WiredVariableOwnersView';
import { useVariablesExplorerStore } from '../../state/variablesExplorer';
import { WiredVariableHolderPanelView } from './WiredVariableHolderPanelView';
import { WiredVariablesTabView } from './WiredVariablesTabView';
import { translateWiredMenuLink, wiredMenuTabKey } from './WiredMenuLinks';
import { useWiredCreatorToolsUiStore } from './wiredCreatorToolsUiStore';
import { Select } from '../../common/Select';
import { BaseButton } from '../../common/BaseButton';
import { isDerivedVariableItemId } from '../wired/views/WiredVariablePickerData';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

const WIRED_FURNI_GRAVITY_MODEL_KEY = 'wired_furni_gravity';
/** Our variable types as the official idtype (0 made with a box, 1 internal). */
export const WiredCreatorToolsView: FC<{}> = () => {
    const openVariablesExplorer = useVariablesExplorerStore((s) => s.open);
    const isVisible = useWiredCreatorToolsUiStore((s) => s.isVisible);
    const setIsVisible = useWiredCreatorToolsUiStore((s) => s.setIsVisible);
    const activeTab = useWiredCreatorToolsUiStore((s) => s.activeTab);
    const setActiveTab = useWiredCreatorToolsUiStore((s) => s.setActiveTab);
    const inspectionType = useWiredCreatorToolsUiStore((s) => s.inspectionType);
    const setInspectionType = useWiredCreatorToolsUiStore((s) => s.setInspectionType);
    const variablesType = useWiredCreatorToolsUiStore((s) => s.variablesType);
    const setVariablesType = useWiredCreatorToolsUiStore((s) => s.setVariablesType);
    // AIR WiredMenuOverviewTab: a `variable_overview/<name>` link selects that variable once it is known.
    const [pendingVariableName, setPendingVariableName] = useState('');
    const [keepSelected, setKeepSelected] = useState(false);
    const selectedFurni = useWiredCreatorToolsUiStore((s) => s.selectedFurni);
    const setSelectedFurni = useWiredCreatorToolsUiStore((s) => s.setSelectedFurni);
    const selectedFurniLiveState = useWiredCreatorToolsUiStore((s) => s.selectedFurniLiveState);
    const setSelectedFurniLiveState = useWiredCreatorToolsUiStore((s) => s.setSelectedFurniLiveState);
    const [selectedFurniRuntimeState, setSelectedFurniRuntimeState] = useState<{
        itemId: number;
        key: string;
        value: number;
        supported: boolean;
    }>(null);
    const selectedUser = useWiredCreatorToolsUiStore((s) => s.selectedUser);
    const setSelectedUser = useWiredCreatorToolsUiStore((s) => s.setSelectedUser);
    const selectedUserLiveState = useWiredCreatorToolsUiStore((s) => s.selectedUserLiveState);
    const setSelectedUserLiveState = useWiredCreatorToolsUiStore((s) => s.setSelectedUserLiveState);
    const selectedUserActionVersion = useWiredCreatorToolsUiStore((s) => s.selectedUserActionVersion);
    const setSelectedUserActionVersion = useWiredCreatorToolsUiStore((s) => s.setSelectedUserActionVersion);
    const [globalClock, setGlobalClock] = useState(Date.now());
    const [furniInternalRevision, setFurniInternalRevision] = useState(0);
    const [roomEnteredAt, setRoomEnteredAt] = useState(Date.now());
    const monitorSnapshot = useWiredCreatorToolsUiStore((s) => s.monitorSnapshot);
    const setMonitorSnapshot = useWiredCreatorToolsUiStore((s) => s.setMonitorSnapshot);
    const resetMonitorSnapshot = useWiredCreatorToolsUiStore((s) => s.resetMonitorSnapshot);
    const setMonitorRoomStats = useWiredCreatorToolsUiStore((s) => s.setMonitorRoomStats);
    const setMonitorErrorLogs = useWiredCreatorToolsUiStore((s) => s.setMonitorErrorLogs);
    const [selectedMonitorErrorType, setSelectedMonitorErrorType] = useState<string>(null);
    // AIR WiredMenuMonitorTab: "Clear all" stays disabled for CLEAR_LOGS_TIMEOUT after a clear.
    const [isMonitorClearCoolingDown, setIsMonitorClearCoolingDown] = useState(false);
    const [selectedMonitorLogDetails, setSelectedMonitorLogDetails] = useState<MonitorLogDetails>(null);
    const isMonitorHistoryOpen = useWiredCreatorToolsUiStore((s) => s.isMonitorHistoryOpen);
    const setIsMonitorHistoryOpen = useWiredCreatorToolsUiStore((s) => s.setIsMonitorHistoryOpen);
    const isRoomLogsOpen = useWiredCreatorToolsUiStore((s) => s.isRoomLogsOpen);
    const isSelfDonationOpen = useWiredCreatorToolsUiStore((s) => s.isSelfDonationOpen);
    const setIsSelfDonationOpen = useWiredCreatorToolsUiStore((s) => s.setIsSelfDonationOpen);
    const setIsRoomLogsOpen = useWiredCreatorToolsUiStore((s) => s.setIsRoomLogsOpen);
    const isMonitorInfoOpen = useWiredCreatorToolsUiStore((s) => s.isMonitorInfoOpen);
    const setIsMonitorInfoOpen = useWiredCreatorToolsUiStore((s) => s.setIsMonitorInfoOpen);
    const monitorHistorySeverityFilter = useWiredCreatorToolsUiStore((s) => s.monitorHistorySeverityFilter);
    const setMonitorHistorySeverityFilter = useWiredCreatorToolsUiStore((s) => s.setMonitorHistorySeverityFilter);
    const monitorHistoryTypeFilter = useWiredCreatorToolsUiStore((s) => s.monitorHistoryTypeFilter);
    const setMonitorHistoryTypeFilter = useWiredCreatorToolsUiStore((s) => s.setMonitorHistoryTypeFilter);
    const editingVariable = useWiredCreatorToolsUiStore((s) => s.editingVariable);
    const setEditingVariable = useWiredCreatorToolsUiStore((s) => s.setEditingVariable);
    const editingValue = useWiredCreatorToolsUiStore((s) => s.editingValue);
    const setEditingValue = useWiredCreatorToolsUiStore((s) => s.setEditingValue);
    const selectedInspectionVariableKeys = useWiredCreatorToolsUiStore((s) => s.selectedInspectionVariableKeys);
    const setSelectedInspectionVariableKeys = useWiredCreatorToolsUiStore((s) => s.setSelectedInspectionVariableKeys);
    const isInspectionGiveOpen = useWiredCreatorToolsUiStore((s) => s.isInspectionGiveOpen);
    const setIsInspectionGiveOpen = useWiredCreatorToolsUiStore((s) => s.setIsInspectionGiveOpen);
    const inspectionGiveVariableItemId = useWiredCreatorToolsUiStore((s) => s.inspectionGiveVariableItemId);
    const setInspectionGiveVariableItemId = useWiredCreatorToolsUiStore((s) => s.setInspectionGiveVariableItemId);
    const inspectionGiveValue = useWiredCreatorToolsUiStore((s) => s.inspectionGiveValue);
    const setInspectionGiveValue = useWiredCreatorToolsUiStore((s) => s.setInspectionGiveValue);
    const isVariableManageOpen = useWiredCreatorToolsUiStore((s) => s.isVariableManageOpen);
    const setIsVariableManageOpen = useWiredCreatorToolsUiStore((s) => s.setIsVariableManageOpen);
    const isArrayInspectorOpen = useWiredCreatorToolsUiStore((s) => s.isArrayInspectorOpen);
    const setIsArrayInspectorOpen = useWiredCreatorToolsUiStore((s) => s.setIsArrayInspectorOpen);
    const selectedManagedVariableEntry = useWiredCreatorToolsUiStore((s) => s.selectedManagedVariableEntry);
    const setSelectedManagedVariableEntry = useWiredCreatorToolsUiStore((s) => s.setSelectedManagedVariableEntry);
    const selectedManagedHolderVariableId = useWiredCreatorToolsUiStore((s) => s.selectedManagedHolderVariableId);
    const setSelectedManagedHolderVariableId = useWiredCreatorToolsUiStore((s) => s.setSelectedManagedHolderVariableId);
    const editingManagedHolderVariableId = useWiredCreatorToolsUiStore((s) => s.editingManagedHolderVariableId);
    const setEditingManagedHolderVariableId = useWiredCreatorToolsUiStore((s) => s.setEditingManagedHolderVariableId);
    const editingManagedHolderValue = useWiredCreatorToolsUiStore((s) => s.editingManagedHolderValue);
    const setEditingManagedHolderValue = useWiredCreatorToolsUiStore((s) => s.setEditingManagedHolderValue);
    const isManagedGiveOpen = useWiredCreatorToolsUiStore((s) => s.isManagedGiveOpen);
    const setIsManagedGiveOpen = useWiredCreatorToolsUiStore((s) => s.setIsManagedGiveOpen);
    const managedGiveVariableItemId = useWiredCreatorToolsUiStore((s) => s.managedGiveVariableItemId);
    const setManagedGiveVariableItemId = useWiredCreatorToolsUiStore((s) => s.setManagedGiveVariableItemId);
    const managedGiveValue = useWiredCreatorToolsUiStore((s) => s.managedGiveValue);
    const setManagedGiveValue = useWiredCreatorToolsUiStore((s) => s.setManagedGiveValue);
    const isVariableHighlightActive = useWiredCreatorToolsUiStore((s) => s.isVariableHighlightActive);
    const setIsVariableHighlightActive = useWiredCreatorToolsUiStore((s) => s.setIsVariableHighlightActive);
    const variableHighlightOverlays = useWiredCreatorToolsUiStore((s) => s.variableHighlightOverlays);
    const setVariableHighlightOverlays = useWiredCreatorToolsUiStore((s) => s.setVariableHighlightOverlays);
    const variableHighlightObjectsRef = useRef<Array<{ category: number; objectId: number }>>([]);
    const canInspectRef = useRef(false);
    const monitorRequestGateRef = useRef<ReturnType<typeof createPacketCooldownGate> | null>(null);

    if (!monitorRequestGateRef.current) {
        monitorRequestGateRef.current = createPacketCooldownGate();
    }

    const shouldPauseVariableSnapshotRefresh = !!editingVariable || !!editingManagedHolderVariableId || isInspectionGiveOpen || isManagedGiveOpen;
    const selectedVariableKeys = useWiredCreatorToolsUiStore((s) => s.selectedVariableKeys);
    const setSelectedVariableKeys = useWiredCreatorToolsUiStore((s) => s.setSelectedVariableKeys);
    const { roomSession = null } = useRoom();
    const { ownUser: tradeOwnUser = null, otherUser: tradeOtherUser = null, isTrading = false } = useInventoryTrade();
    const {
        roomSettings,
        clearVariableForAllHolders,
        userVariableDefinitions,
        userVariableAssignments,
        furniVariableDefinitions,
        furniVariableAssignments,
        roomVariableDefinitions,
        roomVariableAssignments,
        contextVariableDefinitions,
        requestUserVariables,
        assignUserVariable,
        removeUserVariable,
        updateUserVariableValue,
        assignFurniVariable,
        removeFurniVariable,
        updateFurniVariableValue,
        updateRoomVariableValue
    } = useWiredTools();
    const { catalog: variableCatalog, ready: variableCatalogReady, refresh: refreshVariableCatalog } = useWiredVariableCatalog();
    // AIR's inspection tab reads the inspected object's variables from the server (and re-reads them while open).
    const objectInspectionRequest = useMemo(
        () => getWiredObjectInspectionRequest(inspectionType, selectedFurni, selectedUser),
        [inspectionType, selectedFurni?.objectId, selectedUser?.roomIndex]
    );
    const { data: objectInspection, refresh: refreshObjectInspection } = useWiredObjectInspection({
        active: isVisible && activeTab === 'inspection' && !!roomSession?.roomId && roomSettings.canInspect,
        request: objectInspectionRequest
    });
    const [isHighlightingConfiguredWireds, setIsHighlightingConfiguredWireds] = useState(false);
    const canHighlightConfiguredWireds = canHighlightWiredBoxesFor(objectInspection);
    const configuredWiredsKey = canHighlightConfiguredWireds ? objectInspection.configuredInWireds.join(',') : '';

    useEffect(() => {
        if (!isMonitorClearCoolingDown) return;

        const timeout = window.setTimeout(() => setIsMonitorClearCoolingDown(false), WIRED_MONITOR_CLEAR_LOGS_TIMEOUT_MS);

        return () => window.clearTimeout(timeout);
    }, [isMonitorClearCoolingDown]);

    // AIR clears the box highlight when another object is inspected or the tab is left.
    useEffect(() => {
        setIsHighlightingConfiguredWireds(false);
    }, [objectInspectionRequest?.type, objectInspectionRequest?.objectId, activeTab, isVisible]);

    // AIR `onHighlightWiredsClicked`: the wired boxes that have the inspected furni in their furni picks.
    useEffect(() => {
        if (!isHighlightingConfiguredWireds || !configuredWiredsKey) return;

        const objects = configuredWiredsKey.split(',').map((id) => ({ category: RoomObjectCategory.FLOOR, objectId: Number(id) }));

        WiredSelectionVisualizer.applyVariableHighlightToObjects(objects);

        return () => WiredSelectionVisualizer.clearVariableHighlightFromObjects(objects);
    }, [isHighlightingConfiguredWireds, configuredWiredsKey]);
    const { simpleAlert = null, showConfirm = null, showSingleBubble = null } = useNotification();

    const getFurniLiveState = useCallback(
        (objectId: number, category: number): InspectionFurniLiveState => {
            if (!roomSession) return null;

            const roomObject = GetRoomEngine().getRoomObject(roomSession.roomId, objectId, category);

            if (!roomObject) return null;

            const location = roomObject.getLocation();
            const rawRotation = Math.round(roomObject.getDirection().x / 45);

            return {
                positionX: Math.round(location?.x ?? 0),
                positionY: Math.round(location?.y ?? 0),
                altitude: Math.round(Number(location?.z ?? 0) * 100),
                rotation: ((rawRotation % 8) + 8) % 8,
                state: Number(roomObject.getState(0) ?? 0)
            };
        },
        [roomSession]
    );

    const parseWallLocation = (wallLocation: string): ParsedWallLocation => {
        if (!wallLocation) return null;

        const match = wallLocation.match(/^:w=(-?\d+),(-?\d+)\s+l=(-?\d+),(-?\d+)\s+([^\s]+)$/i);

        if (!match) return null;

        return {
            width: parseInt(match[1], 10),
            height: parseInt(match[2], 10),
            localX: parseInt(match[3], 10),
            localY: parseInt(match[4], 10),
            direction: match[5]
        };
    };

    const getSignDisplayName = (value: number): string => {
        if (value < 0) return '';

        const localizationKey = `wiredfurni.params.action.sign.${value}`;
        const localizedName = LocalizeText(localizationKey);

        if (localizedName && localizedName !== localizationKey) return localizedName;

        return `Sign ${value}`;
    };

    const getDanceDisplayName = (value: number): string => {
        if (value <= 0) return '';

        const localizationKey = `widget.memenu.dance${value}`;
        const localizedName = LocalizeText(localizationKey);

        if (localizedName && localizedName !== localizationKey) return localizedName;

        return `Dance ${value}`;
    };

    const getHandItemDisplayName = (value: number): string => {
        if (value <= 0) return '';

        const localizationKey = `handitem${value}`;
        const localizedName = LocalizeText(localizationKey);

        if (localizedName && localizedName !== localizationKey) return localizedName;

        return `Item ${value}`;
    };

    const getEffectDisplayName = (value: number): string => {
        if (value <= 0) return '';

        const localizationKey = `fx_${value}`;
        const localizedName = LocalizeText(localizationKey);

        if (localizedName && localizedName !== localizationKey) return localizedName;

        return `Effect ${value}`;
    };

    const getRoomEntryMethodNumericValue = (value: string): number => {
        switch ((value || '').trim().toLowerCase()) {
            case 'door':
                return 1;
            case 'teleport':
                return 2;
            case 'unknown':
            case '':
                return 0;
            default:
                return 3;
        }
    };

    const getTimeZoneOffsetMinutes = (epochMs: number, timeZone: string): number => {
        try {
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone,
                timeZoneName: 'shortOffset',
                hour: '2-digit',
                minute: '2-digit'
            });
            const timeZonePart = formatter.formatToParts(new Date(epochMs)).find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
            const match = timeZonePart.match(/^GMT(?:(\+|-)(\d{1,2})(?::?(\d{2}))?)?$/i);

            if (!match?.[1]) return 0;

            const sign = match[1] === '-' ? -1 : 1;
            const hours = parseInt(match[2] ?? '0', 10);
            const minutes = parseInt(match[3] ?? '0', 10);

            return sign * (hours * 60 + minutes);
        } catch {
            return 0;
        }
    };

    const getVariableAvailabilityLabel = (value: number, targetType: 'user' | 'furni' | 'global' | 'context'): string => {
        if (targetType === 'context') return 'Current wired execution';
        if (value === 11) return localizeWithFallback('wiredfurni.params.variables.availability.11', 'Permanent, shared between rooms');
        if (value === 10) return localizeWithFallback('wiredfurni.params.variables.availability.10', 'Permanent');

        // Official availability 0 (user in the room) and 1 (room active).
        return targetType === 'furni' || targetType === 'global'
            ? localizeWithFallback('wiredfurni.params.variables.availability.1', 'While the room is active')
            : localizeWithFallback('wiredfurni.params.variables.availability.0', 'While the user is in the room');
    };

    const getTeamColorDisplayName = (value: number): string => {
        if (value <= 0) return '';

        const localizationKey = `wiredfurni.params.team.${value}`;
        const localizedName = LocalizeText(localizationKey);

        if (localizedName && localizedName !== localizationKey) return localizedName;

        return TEAM_COLOR_NAMES[value] ?? `Team ${value}`;
    };

    const getTeamTypeDisplayName = (value: number): string => {
        const localizationKey = `wiredfurni.params.team_type.${value}`;
        const localizedName = LocalizeText(localizationKey);

        if (localizedName && localizedName !== localizationKey) return localizedName;

        switch (value) {
            case 1:
                return 'Battle Banzai';
            case 2:
                return 'Freeze';
            default:
                return 'Wired';
        }
    };

    const getTeamEffectData = (effectValue: number): TeamEffectData => {
        if (!roomSession || effectValue <= 0) return null;

        let teamType = -1;
        let teamColor = 0;

        if (effectValue >= 223 && effectValue <= 226) {
            teamType = 0;
            teamColor = effectValue - 222;
        } else if (effectValue >= 33 && effectValue <= 36) {
            teamType = 1;
            teamColor = effectValue - 32;
        } else if (effectValue >= 40 && effectValue <= 43) {
            teamType = 2;
            teamColor = effectValue - 39;
        }

        if (teamType < 0 || !(teamColor in TEAM_COLOR_NAMES)) return null;

        return {
            colorId: teamColor,
            typeId: teamType
        };
    };

    const getRoomTeamScore = (colorId: number): number => {
        if (!roomSession || !(colorId in TEAM_COLOR_NAMES)) return 0;

        const classNames = [
            `battlebanzai_counter_${TEAM_COLOR_NAMES[colorId]}`,
            `freeze_counter_${TEAM_COLOR_NAMES[colorId]}`,
            `football_counter_${TEAM_COLOR_NAMES[colorId]}`
        ];

        const roomObjects = GetRoomEngine().getRoomObjects(roomSession.roomId, RoomObjectCategory.FLOOR);

        for (const targetClassName of classNames) {
            for (const roomObject of roomObjects) {
                if (!roomObject) continue;

                const typeId = roomObject.model.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID);
                const furnitureData = GetSessionDataManager().getFloorItemData(typeId);

                if (!furnitureData || furnitureData.className !== targetClassName) continue;

                return Number(roomObject.getState(0) ?? 0);
            }
        }

        return 0;
    };

    const getSelectedUserTeamData = (effectValue: number): InspectionUserTeamData => {
        const teamData = getTeamEffectData(effectValue);

        if (!teamData) return null;

        return {
            colorId: teamData.colorId,
            typeId: teamData.typeId,
            score: teamData.typeId === 0 ? 0 : getRoomTeamScore(teamData.colorId)
        };
    };

    const createUtcDateFromHotelParts = (parts: HotelDateTimeParts): Date => {
        return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, parts.millisecond));
    };

    const getMondayBasedWeekday = (parts: HotelDateTimeParts): number => {
        const jsDay = createUtcDateFromHotelParts(parts).getUTCDay();
        return jsDay === 0 ? 7 : jsDay;
    };

    const getDayOfYear = (parts: HotelDateTimeParts): number => {
        const currentDate = createUtcDateFromHotelParts(parts);
        const startOfYear = new Date(Date.UTC(parts.year, 0, 1));
        const millisecondsPerDay = 86400000;

        return Math.floor((currentDate.getTime() - startOfYear.getTime()) / millisecondsPerDay) + 1;
    };

    const getIsoWeekOfYear = (parts: HotelDateTimeParts): number => {
        const utcDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
        const dayOfWeek = utcDate.getUTCDay() || 7;

        utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayOfWeek);

        const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));

        return Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    };

    const getUserLiveState = useCallback(
        (roomIndex: number): InspectionUserLiveState => {
            if (!roomSession) return null;

            const roomObject = GetRoomEngine().getRoomObject(roomSession.roomId, roomIndex, RoomObjectCategory.UNIT);

            if (!roomObject) return null;

            const location = roomObject.getLocation();
            const rawDirection = Math.round(roomObject.getDirection().x / 45);

            return {
                positionX: Math.round(location?.x ?? 0),
                positionY: Math.round(location?.y ?? 0),
                altitude: Math.round(Number(location?.z ?? 0) * 100),
                direction: ((rawDirection % 8) + 8) % 8
            };
        },
        [roomSession]
    );

    const refreshSelectedUser = useCallback(
        (roomIndex: number = selectedUser?.roomIndex) => {
            if (roomIndex === null || roomIndex === undefined || !roomSession) return;

            const userData = roomSession.userDataManager.getUserDataByIndex(roomIndex);

            if (!userData) return;

            const roomObject = GetRoomEngine().getRoomObject(roomSession.roomId, roomIndex, RoomObjectCategory.UNIT);
            const gender = String(userData.sex || roomObject?.model.getValue<string>(RoomObjectVariable.GENDER) || 'U').toUpperCase();
            const isOwnUser = userData.webID === GetSessionDataManager().userId;
            const roomOwnerLevel = isOwnUser
                ? roomSession.controllerLevel
                : Number(roomObject?.model.getValue<number>(RoomObjectVariable.FIGURE_FLAT_CONTROL) ?? 0);
            const hasRights = roomOwnerLevel >= RoomControllerLevel.GUEST;
            const isOwner = (isOwnUser && roomSession.isRoomOwner) || roomOwnerLevel >= RoomControllerLevel.ROOM_OWNER;
            const roomEntryMethod = userData.roomEntryMethod || 'unknown';
            const roomEntryTeleportId = Number(userData.roomEntryTeleportId ?? 0);

            switch (userData.type) {
                case RoomObjectType.USER: {
                    const info = AvatarInfoUtilities.getUserInfo(RoomObjectCategory.UNIT, userData);

                    if (!info) return;

                    setSelectedUser({
                        kind: 'user',
                        roomIndex,
                        name: info.name,
                        figure: info.figure,
                        gender,
                        userId: info.webID,
                        level: isOwnUser ? info.roomControllerLevel : info.targetRoomControllerLevel,
                        achievementScore: info.achievementScore,
                        isHC: isOwnUser && GetSessionDataManager().clubLevel > 0,
                        hasRights,
                        isOwner,
                        favouriteGroupId: info.groupId,
                        roomEntryMethod,
                        roomEntryTeleportId
                    });
                    break;
                }
                case RoomObjectType.BOT: {
                    const info = AvatarInfoUtilities.getBotInfo(RoomObjectCategory.UNIT, userData);

                    if (!info) return;

                    setSelectedUser({
                        kind: 'bot',
                        roomIndex,
                        name: info.name,
                        figure: info.figure,
                        gender,
                        userId: info.webID,
                        level: 0,
                        achievementScore: 0,
                        isHC: false,
                        hasRights: false,
                        isOwner: false,
                        favouriteGroupId: 0,
                        roomEntryMethod,
                        roomEntryTeleportId
                    });
                    break;
                }
                case RoomObjectType.RENTABLE_BOT: {
                    const info = AvatarInfoUtilities.getRentableBotInfo(RoomObjectCategory.UNIT, userData);

                    if (!info) return;

                    setSelectedUser({
                        kind: 'rentable_bot',
                        roomIndex,
                        name: info.name,
                        figure: info.figure,
                        gender,
                        userId: info.webID,
                        level: 0,
                        achievementScore: 0,
                        isHC: false,
                        hasRights: false,
                        isOwner: false,
                        favouriteGroupId: 0,
                        roomEntryMethod,
                        roomEntryTeleportId
                    });
                    break;
                }
                case RoomObjectType.PET:
                    setSelectedUser({
                        kind: 'pet',
                        roomIndex,
                        name: userData.name,
                        figure: userData.figure,
                        gender,
                        userId: userData.webID,
                        level: Number(userData.petLevel ?? 0),
                        achievementScore: 0,
                        isHC: false,
                        hasRights: false,
                        isOwner: false,
                        favouriteGroupId: 0,
                        roomEntryMethod,
                        roomEntryTeleportId,
                        posture: 'std'
                    });
                    break;
            }

            setSelectedUserLiveState(getUserLiveState(roomIndex));
        },
        [getUserLiveState, roomSession, selectedUser?.roomIndex]
    );

    const refreshSelectedFurni = useCallback(
        (objectId: number = selectedFurni?.objectId, category: number = selectedFurni?.category) => {
            if (!objectId && objectId !== 0) return;

            const info = AvatarInfoUtilities.getFurniInfo(objectId, category);

            if (!info) return;

            setSelectedFurni({
                objectId,
                category,
                info
            });

            setSelectedFurniLiveState(getFurniLiveState(objectId, category));
        },
        [getFurniLiveState, selectedFurni?.category, selectedFurni?.objectId]
    );

    useObjectSelectedEvent((event) => {
        if (keepSelected || !roomSession) return;

        if (inspectionType === 'furni' && (event.category === RoomObjectCategory.FLOOR || event.category === RoomObjectCategory.WALL)) {
            refreshSelectedFurni(event.id, event.category);

            return;
        }

        if (inspectionType !== 'user' || event.category !== RoomObjectCategory.UNIT) return;

        refreshSelectedUser(event.id);
    });

    useMessageEvent<WiredMonitorDataEvent>(WiredMonitorDataEvent, (event) => {
        const parser = event.getParser();

        setMonitorSnapshot({
            usageCurrentWindow: Number(parser.usageCurrentWindow ?? 0),
            usageLimitPerWindow: Number(parser.usageLimitPerWindow ?? 0),
            isHeavy: !!parser.isHeavy,
            delayedEventsPending: Number(parser.delayedEventsPending ?? 0),
            delayedEventsLimit: Number(parser.delayedEventsLimit ?? 0),
            averageExecutionMs: Number(parser.averageExecutionMs ?? 0),
            peakExecutionMs: Number(parser.peakExecutionMs ?? 0),
            recursionDepthCurrent: Number(parser.recursionDepthCurrent ?? 0),
            recursionDepthLimit: Number(parser.recursionDepthLimit ?? 0),
            killedRemainingSeconds: Number(parser.killedRemainingSeconds ?? 0),
            usageWindowMs: Number(parser.usageWindowMs ?? 0),
            overloadAverageThresholdMs: Number(parser.overloadAverageThresholdMs ?? 0),
            overloadPeakThresholdMs: Number(parser.overloadPeakThresholdMs ?? 0),
            heavyUsageThresholdPercent: Number(parser.heavyUsageThresholdPercent ?? 0),
            heavyConsecutiveWindowsThreshold: Number(parser.heavyConsecutiveWindowsThreshold ?? 0),
            overloadConsecutiveWindowsThreshold: Number(parser.overloadConsecutiveWindowsThreshold ?? 0),
            heavyDelayedThresholdPercent: Number(parser.heavyDelayedThresholdPercent ?? 0),
            logs: [...(parser.logs ?? [])],
            history: [...(parser.history ?? [])],
            // The room stats (1891) and the error list (15) come in their own packets; the store keeps the last ones.
            roomStats: null,
            errors: []
        });
    });

    useMessageEvent<WiredRoomStatsEvent>(WiredRoomStatsEvent, (event) => {
        const roomStats = event.getParser().roomStats;

        setMonitorRoomStats(roomStats ? { ...roomStats } : null);
    });

    // AIR's error list (15): the answer to 1132 and to "Clear all" (1632).
    useMessageEvent<WiredErrorLogsEvent>(WiredErrorLogsEvent, (event) => {
        setMonitorErrorLogs(toMonitorErrorLogs(event.getParser().errors, Date.now()));
    });

    useMessageEvent<WiredFurniRuntimeStateEvent>(WiredFurniRuntimeStateEvent, (event) => {
        const parser = event.getParser();

        if (parser.key !== '@gravity' || parser.itemId !== selectedFurni?.objectId) return;

        setSelectedFurniRuntimeState({
            itemId: parser.itemId,
            key: parser.key,
            value: parser.value,
            supported: parser.supported
        });
    });

    useMessageEvent<FurnitureFloorUpdateEvent>(FurnitureFloorUpdateEvent, (event) => {
        if (!selectedFurni) return;

        const parser = event.getParser();

        if (parser.item.itemId !== selectedFurni.objectId) return;

        refreshSelectedFurni(selectedFurni.objectId, selectedFurni.category);
    });

    // A recolor re-adds the furni with another type: look at the new room object.
    useMessageEvent<FurnitureFloorAddEvent>(FurnitureFloorAddEvent, (event) => {
        if (!selectedFurni || selectedFurni.category !== RoomObjectCategory.FLOOR) return;

        if (event.getParser()?.item?.itemId !== selectedFurni.objectId) return;

        refreshSelectedFurni(selectedFurni.objectId, selectedFurni.category);
        setFurniInternalRevision((previousValue) => previousValue + 1);
    });

    useMessageEvent<FurnitureFloorUpdateEvent>(FurnitureFloorUpdateEvent, () => {
        if (inspectionType !== 'user' || !selectedUser) return;

        setSelectedUserActionVersion((previousValue) => previousValue + 1);
    });

    useMessageEvent<FurnitureWallUpdateEvent>(FurnitureWallUpdateEvent, (event) => {
        if (!selectedFurni || selectedFurni.category !== RoomObjectCategory.WALL) return;

        const parser = event.getParser();

        if (parser.item.itemId !== selectedFurni.objectId) return;

        refreshSelectedFurni(selectedFurni.objectId, selectedFurni.category);
    });

    useMessageEvent<RoomUnitStatusEvent>(RoomUnitStatusEvent, (event) => {
        if (!selectedUser) return;

        const parser = event.getParser();

        if (!parser?.statuses?.some((status) => status.id === selectedUser.roomIndex)) return;

        setSelectedUserLiveState(getUserLiveState(selectedUser.roomIndex));
        setSelectedUserActionVersion((previousValue) => previousValue + 1);
    });

    useMessageEvent<RoomUnitInfoEvent>(RoomUnitInfoEvent, (event) => {
        if (!selectedUser) return;

        const parser = event.getParser();

        if (parser.unitId !== selectedUser.roomIndex) return;

        refreshSelectedUser(selectedUser.roomIndex);
    });

    useMessageEvent<FigureUpdateEvent>(FigureUpdateEvent, () => {
        if (!selectedUser || selectedUser.kind !== 'user' || !roomSession) return;

        if (selectedUser.roomIndex !== roomSession.ownRoomIndex) return;

        refreshSelectedUser(selectedUser.roomIndex);
    });

    useMessageEvent<RoomUnitDanceEvent>(RoomUnitDanceEvent, (event) => {
        if (!selectedUser) return;

        if (event.getParser().unitId !== selectedUser.roomIndex) return;

        setSelectedUserActionVersion((previousValue) => previousValue + 1);
    });

    useMessageEvent<RoomUnitEffectEvent>(RoomUnitEffectEvent, (event) => {
        if (!selectedUser) return;

        if (event.getParser().unitId !== selectedUser.roomIndex) return;

        setSelectedUserActionVersion((previousValue) => previousValue + 1);
    });

    useMessageEvent<RoomUnitHandItemEvent>(RoomUnitHandItemEvent, (event) => {
        if (!selectedUser) return;

        if (event.getParser().unitId !== selectedUser.roomIndex) return;

        setSelectedUserActionVersion((previousValue) => previousValue + 1);
    });

    useMessageEvent<RoomUnitExpressionEvent>(RoomUnitExpressionEvent, (event) => {
        if (!selectedUser) return;

        if (event.getParser().unitId !== selectedUser.roomIndex) return;

        setSelectedUserActionVersion((previousValue) => previousValue + 1);
    });

    useEffect(() => {
        if (!isVisible || inspectionType !== 'user' || !selectedUser || !roomSession) return;

        let lastMutedValue = Number(
            GetRoomEngine()
                .getRoomObject(roomSession.roomId, selectedUser.roomIndex, RoomObjectCategory.UNIT)
                ?.model.getValue<number>(RoomObjectVariable.FIGURE_IS_MUTED) ?? 0
        );

        const interval = window.setInterval(() => {
            const currentMutedValue = Number(
                GetRoomEngine()
                    .getRoomObject(roomSession.roomId, selectedUser.roomIndex, RoomObjectCategory.UNIT)
                    ?.model.getValue<number>(RoomObjectVariable.FIGURE_IS_MUTED) ?? 0
            );

            if (currentMutedValue === lastMutedValue) return;

            lastMutedValue = currentMutedValue;

            setSelectedUserActionVersion((previousValue) => previousValue + 1);
        }, WIRED_INSPECTION_REFRESH_MS);

        return () => window.clearInterval(interval);
    }, [isVisible, inspectionType, selectedUser, roomSession]);

    useEffect(() => {
        const shouldTick = isVisible;

        if (!shouldTick) return;

        setGlobalClock(Date.now());

        const interval = window.setInterval(() => setGlobalClock(Date.now()), WIRED_CLOCK_REFRESH_MS);

        return () => window.clearInterval(interval);
    }, [isVisible, activeTab, inspectionType, roomSession?.roomId]);

    useEffect(() => {
        if (!roomSession?.roomId) return;

        setRoomEnteredAt(Date.now());
    }, [roomSession?.roomId]);

    useEffect(() => {
        resetMonitorSnapshot();
        setSelectedMonitorErrorType(null);
        setSelectedMonitorLogDetails(null);
        setIsMonitorHistoryOpen(false);
        setIsMonitorInfoOpen(false);
        setMonitorHistorySeverityFilter('ALL');
        setMonitorHistoryTypeFilter('ALL');
    }, [roomSession?.roomId]);

    useEffect(() => {
        if (activeTab === 'monitor') return;

        setSelectedMonitorErrorType(null);
        setSelectedMonitorLogDetails(null);
        setIsMonitorHistoryOpen(false);
        setIsMonitorInfoOpen(false);
    }, [activeTab]);

    useEffect(() => {
        if (selectedMonitorErrorType) return;

        setSelectedMonitorLogDetails(null);
    }, [selectedMonitorErrorType]);

    const requestMonitorSnapshot = useCallback(() => {
        monitorRequestGateRef.current?.request(() => {
            SendMessageComposer(new WiredMonitorRequestComposer(WIRED_MONITOR_ACTION_FETCH));
        });
    }, []);

    useEffect(() => {
        if (!isVisible || activeTab !== 'monitor' || !roomSession?.roomId) return;

        requestMonitorSnapshot();

        const interval = window.setInterval(requestMonitorSnapshot, WIRED_MONITOR_POLL_MS);

        return () => window.clearInterval(interval);
    }, [isVisible, activeTab, roomSession?.roomId, requestMonitorSnapshot]);

    // AIR WiredMenuMonitorTab.requestData(): the room stats (1957) and error list (1132) requests go out every POLL_MONITOR_MS.
    useEffect(() => {
        if (!isVisible || activeTab !== 'monitor' || !roomSession?.roomId) return;

        const requestRoomStats = () => {
            SendMessageComposer(new WiredRoomStatsRequestComposer());
            SendMessageComposer(new WiredErrorLogsRequestComposer());
        };

        requestRoomStats();

        const interval = window.setInterval(requestRoomStats, WIRED_MONITOR_ROOM_STATS_POLL_MS);

        return () => window.clearInterval(interval);
    }, [isVisible, activeTab, roomSession?.roomId]);

    const isLiveVariablesTab = WIRED_VARIABLES_LIVE_TABS.includes(activeTab);

    useEffect(() => {
        if (!isVisible || !roomSession?.roomId || !roomSettings.canInspect || shouldPauseVariableSnapshotRefresh) return;

        requestUserVariables();

        // Live values only on the tabs that show them; nothing while the browser tab is hidden.
        const interval = window.setInterval(
            () => {
                if (!document.hidden) requestUserVariables();
            },
            isLiveVariablesTab ? WIRED_VARIABLES_POLL_MS : WIRED_VARIABLES_IDLE_POLL_MS
        );

        return () => window.clearInterval(interval);
    }, [isVisible, roomSession?.roomId, roomSettings.canInspect, requestUserVariables, shouldPauseVariableSnapshotRefresh, isLiveVariablesTab]);

    useEffect(() => {
        if (!isVisible || activeTab !== 'inspection') return;

        const refreshInspectionState = () => {
            if (inspectionType === 'furni' && selectedFurni) {
                const nextLiveState = getFurniLiveState(selectedFurni.objectId, selectedFurni.category);

                setSelectedFurniLiveState((previousValue) => {
                    if (
                        previousValue?.positionX === nextLiveState?.positionX &&
                        previousValue?.positionY === nextLiveState?.positionY &&
                        previousValue?.altitude === nextLiveState?.altitude &&
                        previousValue?.rotation === nextLiveState?.rotation &&
                        previousValue?.state === nextLiveState?.state
                    )
                        return previousValue;

                    return nextLiveState;
                });

                return;
            }

            if (inspectionType === 'user' && selectedUser) {
                const nextLiveState = getUserLiveState(selectedUser.roomIndex);

                setSelectedUserLiveState((previousValue) => {
                    if (
                        previousValue?.positionX === nextLiveState?.positionX &&
                        previousValue?.positionY === nextLiveState?.positionY &&
                        previousValue?.altitude === nextLiveState?.altitude &&
                        previousValue?.direction === nextLiveState?.direction
                    )
                        return previousValue;

                    return nextLiveState;
                });

                setSelectedUserActionVersion((previousValue) => previousValue + 1);
            }
        };

        refreshInspectionState();

        const interval = window.setInterval(refreshInspectionState, WIRED_INSPECTION_REFRESH_MS);

        return () => window.clearInterval(interval);
    }, [isVisible, activeTab, inspectionType, selectedFurni, selectedUser, getFurniLiveState, getUserLiveState]);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setActiveTab('monitor');
                        setIsVisible(true);
                        return;
                    case 'open':
                        // wiredmenu/open: the menu on its current tab.
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((prevValue) => {
                            const nextValue = !prevValue;

                            if (nextValue) setActiveTab('monitor');

                            return nextValue;
                        });
                        return;
                    case 'invalid':
                        if (simpleAlert)
                            simpleAlert(
                                LocalizeText('wiredmenu.invalid_room.desc'),
                                NotificationAlertType.ALERT,
                                null,
                                null,
                                LocalizeText('wiredmenu.invalid_room.title')
                            );
                        return;
                    case 'inspection':
                        if (parts.length > 3) {
                            switch (parts[2]) {
                                case 'furni': {
                                    const objectId = parseInt(parts[3], 10);
                                    const category = parseInt(parts[4] ?? '-1', 10);

                                    if (Number.isInteger(objectId) && Number.isInteger(category)) {
                                        setInspectionType('furni');
                                        refreshSelectedFurni(objectId, category);
                                        setActiveTab('inspection');
                                        setIsVisible(true);
                                    }
                                    return;
                                }
                                case 'user': {
                                    const roomIndex = parseInt(parts[3], 10);

                                    if (Number.isInteger(roomIndex)) {
                                        setInspectionType('user');
                                        refreshSelectedUser(roomIndex);
                                        setActiveTab('inspection');
                                        setIsVisible(true);
                                    }
                                    return;
                                }
                            }
                        }
                        return;
                    case 'logs':
                        // The log action's header button: the room log window.
                        setIsRoomLogsOpen(true);
                        return;
                    case 'tab':
                        if (parts.length > 2) {
                            const tab = parts[2] as WiredToolsTab;

                            if (TABS.some((entry) => entry.key === tab)) setActiveTab(tab);
                            if (tab === 'variables' && parts.length > 3) setPendingVariableName(parts.slice(3).join('/'));
                        }
                        setIsVisible(true);
                        return;
                }
            },
            eventUrlPrefix: 'wired-tools/'
        };

        AddLinkEventTracker(linkTracker);

        // The official wired menu links (notifications, other windows) land on the same handler.
        const wiredMenuTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                // Without read permission every wired menu link only alerts.
                if (!canInspectRef.current) {
                    linkTracker.linkReceived('wired-tools/invalid');
                    return;
                }

                const translated = translateWiredMenuLink(url);

                if (translated) linkTracker.linkReceived(translated);
            },
            eventUrlPrefix: 'wiredmenu/'
        };

        AddLinkEventTracker(wiredMenuTracker);

        return () => {
            RemoveLinkEventTracker(linkTracker);
            RemoveLinkEventTracker(wiredMenuTracker);
        };
    }, [refreshSelectedFurni, refreshSelectedUser, simpleAlert, setIsRoomLogsOpen]);

    useEffect(() => {
        canInspectRef.current = !!roomSettings.canInspect;
    }, [roomSettings.canInspect]);

    useEffect(() => {
        if (!isVisible || !roomSession?.roomId || !roomSettings.isLoaded || roomSettings.canInspect) return;

        setIsVisible(false);
    }, [isVisible, roomSession?.roomId, roomSettings.isLoaded, roomSettings.canInspect]);

    const [selectedRoomObject, setSelectedRoomObject] = useState<ReturnType<ReturnType<typeof GetRoomEngine>['getRoomObject']> | null>(null);
    const [selectedUserRoomObject, setSelectedUserRoomObject] = useState<ReturnType<ReturnType<typeof GetRoomEngine>['getRoomObject']> | null>(null);

    useEffect(() => {
        setSelectedRoomObject(
            roomSession && selectedFurni ? GetRoomEngine().getRoomObject(roomSession.roomId, selectedFurni.objectId, selectedFurni.category) : null
        );
    }, [roomSession, selectedFurni, furniInternalRevision]);

    useEffect(() => {
        setSelectedUserRoomObject(
            roomSession && selectedUser ? GetRoomEngine().getRoomObject(roomSession.roomId, selectedUser.roomIndex, RoomObjectCategory.UNIT) : null
        );
    }, [roomSession, selectedUser, selectedUserActionVersion]);

    // AIR WiredErrorInfoView: the name, then the text `wiredmenu.error_info.<id>`; our own rows (and an id without a text) use ours.
    const selectedMonitorErrorInfo = useMemo(() => {
        if (!selectedMonitorErrorType) return null;

        const ours = MONITOR_ERROR_INFO[selectedMonitorErrorType];
        const errorId = selectedMonitorLogDetails?.errorId;
        const official = errorId === undefined ? '' : localizeWithFallback(`wiredmenu.error_info.${errorId}`, '');
        const description = resolveMonitorErrorDescription(official, ours?.description ?? []);

        if (!ours && !description.length) return null;

        return {
            title: ours?.title ?? selectedMonitorErrorType,
            severity: ours?.severity ?? 'ERROR',
            description
        };
    }, [selectedMonitorErrorType, selectedMonitorLogDetails?.errorId]);
    const monitorRoomStats = useMemo(() => {
        if (!roomSession) return resolveMonitorRoomCounters(null, { floorCount: 0, wallCount: 0, itemLimit: 0, permanentFurniVariables: 0 });

        const roomId = roomSession.roomId;
        const floorObjects = GetRoomEngine().getRoomObjects(roomId, RoomObjectCategory.FLOOR);
        const wallObjects = GetRoomEngine().getRoomObjects(roomId, RoomObjectCategory.WALL);

        return resolveMonitorRoomCounters(monitorSnapshot.roomStats, {
            floorCount: floorObjects.length,
            wallCount: wallObjects.length,
            itemLimit: Number(roomSession.roomItemLimit ?? 0),
            permanentFurniVariables: [...floorObjects, ...wallObjects].reduce((total, roomObject) => {
                if (!roomObject) return total;

                const customVariables = roomObject.model.getValue<string[]>(RoomObjectVariable.FURNITURE_CUSTOM_VARIABLES);

                return total + (customVariables?.length ?? 0);
            }, 0)
        });
    }, [roomSession, globalClock, monitorSnapshot.roomStats]);
    const selectedMonitorDetailSource = useMemo(() => {
        if (!selectedMonitorLogDetails) return '';

        return formatMonitorSource(selectedMonitorLogDetails.sourceLabel, selectedMonitorLogDetails.sourceId);
    }, [selectedMonitorLogDetails]);
    const monitorHistoryTypeOptions = useMemo(() => {
        return ['ALL', ...Array.from(new Set([...MONITOR_LOG_ORDER, ...monitorSnapshot.history.map((entry) => entry.type)]))];
    }, [monitorSnapshot.history]);
    // Official VariableHolderPreviewer: preview_instruction_furni / preview_instruction_user.
    const previewPlaceholder = useMemo(() => {
        switch (inspectionType) {
            case 'furni':
                return localizeWithFallback('wiredmenu.inspection.preview_furni_instruction', 'Select a furni');
            case 'user':
                return localizeWithFallback('wiredmenu.inspection.preview_user_instruction', 'Select a user');
            default:
                return localizeWithFallback('wiredmenu.table.empty', 'Nothing to display');
        }
    }, [inspectionType]);
    const monitorStats = useMemo<MonitorStat[]>(() => {
        // Official statistics lines: localized HTML with the colour, amount and limit (WiredMenuMonitorTab).
        const officialLine = (key: string, fallbackLabel: string, color: string, value: string, parameters: string[], replacements: string[]): MonitorStat => {
            const line = localizeWithFallback(key, `${fallbackLabel}: <font color="#${color}">${value}</font>`, ['color', ...parameters], [color, ...replacements]);
            const { label, value: shown } = splitMonitorStatLine(line);

            return { label, value: shown || value, color: `#${color}` };
        };
        const amountLine = (key: string, fallbackLabel: string, amount: number, limit: number, thresholds: readonly [number, number]) =>
            officialLine(key, fallbackLabel, wiredMonitorColor(amount, limit, thresholds), `${amount}/${limit}`, ['amount', 'limit'], [String(amount), String(limit)]);
        const yesNo = (value: boolean) => (value ? localizeWithFallback('wiredmenu.bool.yes', 'Yes') : localizeWithFallback('wiredmenu.bool.no', 'No'));
        const official = (usage: number, usageLimit: number, isHeavy: boolean, counters: ReturnType<typeof resolveMonitorRoomCounters>) => [
            amountLine('wiredmenu.monitor.statistics.usage', 'Wired usage', usage, usageLimit, WIRED_MONITOR_THRESHOLDS.usage),
            officialLine(
                'wiredmenu.monitor.statistics.is_heavy',
                'Is heavy',
                isHeavy ? WIRED_MONITOR_COLOR.ORANGE : WIRED_MONITOR_COLOR.GREEN,
                yesNo(isHeavy),
                ['bool'],
                [yesNo(isHeavy)]
            ),
            amountLine('wiredmenu.monitor.statistics.floorfurni', 'Floor furni', counters.floorCount, counters.floorLimit, WIRED_MONITOR_THRESHOLDS.furni),
            amountLine('wiredmenu.monitor.statistics.wallfurni', 'Wall furni', counters.wallCount, counters.wallLimit, WIRED_MONITOR_THRESHOLDS.furni),
            amountLine(
                'wiredmenu.monitor.statistics.perm_furni_vars',
                'Permanent furni vars',
                counters.permanentFurniVariables,
                counters.permanentFurniVariablesLimit,
                WIRED_MONITOR_THRESHOLDS.variables
            ),
            // The user and global lines need the server's totals; an older server does not send them.
            ...(counters.hasVariableTotals
                ? [
                      amountLine(
                          'wiredmenu.monitor.statistics.perm_user_vars',
                          'Permanent user vars',
                          counters.permanentUserVariables,
                          counters.permanentUserVariablesLimit,
                          WIRED_MONITOR_THRESHOLDS.variables
                      ),
                      amountLine(
                          'wiredmenu.monitor.statistics.perm_global_vars',
                          'Permanent global vars',
                          counters.permanentGlobalVariables,
                          counters.permanentGlobalVariablesLimit,
                          WIRED_MONITOR_THRESHOLDS.variables
                      )
                  ]
                : [])
        ];

        if (!roomSession) {
            return [
                ...official(0, 0, false, monitorRoomStats),
                { label: 'Delayed events', value: '0/0' },
                { label: 'Average execution', value: '0ms' },
                { label: 'Peak execution', value: '0ms' },
                { label: 'Recursion', value: '0/0' },
                { label: 'Killed remaining', value: '0s' }
            ];
        }

        const delayedValue = `${monitorSnapshot.delayedEventsPending}/${Math.max(0, monitorSnapshot.delayedEventsLimit)}`;

        // AIR reads usage and heavy from its room stats packet; until one arrives our monitor packet's are shown.
        const roomStats = monitorSnapshot.roomStats;

        // The official lines first; the rows after them are ours (the official tab has no such rows).
        return [
            ...official(
                roomStats ? Math.round(roomStats.usage) : monitorSnapshot.usageCurrentWindow,
                Math.max(0, roomStats ? Math.round(roomStats.usageLimit) : monitorSnapshot.usageLimitPerWindow),
                roomStats ? roomStats.isHeavy : monitorSnapshot.isHeavy,
                monitorRoomStats
            ),
            { label: 'Delayed events', value: delayedValue },
            { label: 'Average execution', value: `${monitorSnapshot.averageExecutionMs}ms` },
            { label: 'Peak execution', value: `${monitorSnapshot.peakExecutionMs}ms` },
            { label: 'Recursion', value: `${monitorSnapshot.recursionDepthCurrent}/${Math.max(0, monitorSnapshot.recursionDepthLimit)}` },
            { label: 'Killed remaining', value: `${Math.max(0, monitorSnapshot.killedRemainingSeconds)}s` }
        ];
    }, [roomSession, monitorRoomStats, monitorSnapshot]);
    // AIR's error list (15) in the server's order, with the latest detail of each row from our monitor packet (5101).
    const monitorLogs = useMemo<MonitorLog[]>(
        () => buildMonitorLogs(monitorSnapshot.errors, monitorSnapshot.logs, globalClock),
        [monitorSnapshot.errors, monitorSnapshot.logs, globalClock]
    );
    const monitorHistoryRows = useMemo(() => {
        return monitorSnapshot.history.map((entry, index) => ({
            id: `${entry.type}-${entry.occurredAtSeconds}-${index}`,
            type: entry.type,
            category: entry.severity,
            occurredAt: formatMonitorHistoryOccurrence(Number(entry.occurredAtSeconds ?? 0)),
            occurredAtSeconds: Number(entry.occurredAtSeconds ?? 0),
            reason: normalizeMonitorReason(entry.reason),
            sourceLabel: String(entry.sourceLabel ?? ''),
            sourceId: Number(entry.sourceId ?? 0)
        }));
    }, [monitorSnapshot.history]);
    const filteredMonitorHistoryRows = useMemo(() => {
        return monitorHistoryRows.filter((row) => {
            if (monitorHistorySeverityFilter !== 'ALL' && row.category !== monitorHistorySeverityFilter) return false;
            if (monitorHistoryTypeFilter !== 'ALL' && row.type !== monitorHistoryTypeFilter) return false;

            return true;
        });
    }, [monitorHistoryRows, monitorHistorySeverityFilter, monitorHistoryTypeFilter]);
    const monitorInfoSections = useMemo(() => {
        return [
            {
                title: 'Wired usage',
                lines: [
                    `Current value: ${monitorSnapshot.usageCurrentWindow}/${Math.max(0, monitorSnapshot.usageLimitPerWindow)}`,
                    `This is the room execution budget used inside a ${Math.max(0, monitorSnapshot.usageWindowMs)}ms server window.`,
                    'Each triggered stack consumes cost based on conditions, selectors, effects, delayed effects, and recursion depth.'
                ]
            },
            {
                title: 'Heavy / overload',
                lines: [
                    `Heavy warning starts when usage stays above ${Math.max(0, monitorSnapshot.heavyUsageThresholdPercent)}% for ${Math.max(0, monitorSnapshot.heavyConsecutiveWindowsThreshold)} consecutive window(s).`,
                    `Delayed pressure also contributes when the queue stays above ${Math.max(0, monitorSnapshot.heavyDelayedThresholdPercent)}% of its limit.`,
                    `Overload is tracked from execution time and currently trips after ${Math.max(0, monitorSnapshot.overloadConsecutiveWindowsThreshold)} consecutive overloaded window(s).`
                ]
            },
            {
                title: 'Execution times',
                lines: [
                    `Average execution: ${monitorSnapshot.averageExecutionMs}ms (threshold ${Math.max(0, monitorSnapshot.overloadAverageThresholdMs)}ms)`,
                    `Peak execution: ${monitorSnapshot.peakExecutionMs}ms (threshold ${Math.max(0, monitorSnapshot.overloadPeakThresholdMs)}ms)`,
                    'These values reset with each server usage window.'
                ]
            },
            {
                title: 'Other numbers',
                lines: [
                    `Delayed events: ${monitorSnapshot.delayedEventsPending}/${Math.max(0, monitorSnapshot.delayedEventsLimit)} pending scheduled execution(s).`,
                    `Recursion: ${monitorSnapshot.recursionDepthCurrent}/${Math.max(0, monitorSnapshot.recursionDepthLimit)} nested wired call(s).`,
                    `Killed remaining: ${Math.max(0, monitorSnapshot.killedRemainingSeconds)} second(s) of room cooldown when protection has halted execution.`
                ]
            },
            {
                title: 'Room counters',
                lines: [
                    `Floor furni: ${monitorRoomStats.floorCount}/${monitorRoomStats.floorLimit}`,
                    `Wall furni: ${monitorRoomStats.wallCount}/${monitorRoomStats.wallLimit}`,
                    `Permanent furni vars: ${monitorRoomStats.permanentFurniVariables}/${monitorRoomStats.permanentFurniVariablesLimit}`,
                    ...(monitorRoomStats.hasVariableTotals
                        ? [
                              `Permanent user vars: ${monitorRoomStats.permanentUserVariables}/${monitorRoomStats.permanentUserVariablesLimit}`,
                              `Permanent global vars: ${monitorRoomStats.permanentGlobalVariables}/${monitorRoomStats.permanentGlobalVariablesLimit}`
                          ]
                        : [])
                ]
            }
        ];
    }, [monitorSnapshot, monitorRoomStats]);
    const selectedFurnitureData = useMemo(() => {
        if (!selectedRoomObject || !selectedFurni) return null;

        const typeId = selectedRoomObject.model.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID);

        if (selectedFurni.category === RoomObjectCategory.WALL) return GetSessionDataManager().getWallItemData(typeId);

        return GetSessionDataManager().getFloorItemData(typeId);
    }, [selectedRoomObject, selectedFurni]);
    const currentWallLocationString = useMemo(() => {
        if (!roomSession || !selectedFurni || selectedFurni.category !== RoomObjectCategory.WALL || !selectedRoomObject) return null;

        const wallGeometry = GetRoomEngine().getLegacyWallGeometry(roomSession.roomId);

        if (!wallGeometry) return null;

        const angle = (((Math.round(selectedRoomObject.getDirection().x / 45) % 8) + 8) % 8) * 45;

        return wallGeometry.getOldLocationString(selectedRoomObject.getLocation(), angle);
    }, [roomSession, selectedFurni, selectedRoomObject, selectedFurniLiveState]);
    const parsedWallLocation = useMemo(() => parseWallLocation(currentWallLocationString), [currentWallLocationString]);
    const wallItemOffset = useMemo(() => {
        if (!parsedWallLocation) return null;

        return `${parsedWallLocation.localX},${parsedWallLocation.localY}`;
    }, [parsedWallLocation]);
    const canEditInspection = roomSettings.canModify;
    const roomVariableAssignmentMap = useMemo(() => {
        return new Map(roomVariableAssignments.map((assignment) => [assignment.variableItemId, assignment]));
    }, [roomVariableAssignments]);
    const roomCustomVariableDefinitions = useMemo(() => {
        return [...roomVariableDefinitions].sort(
            (left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }) || left.itemId - right.itemId
        );
    }, [roomVariableDefinitions]);
    const roomCustomVariableDefinitionMap = useMemo(() => {
        return new Map(roomCustomVariableDefinitions.map((definition) => [definition.name, definition]));
    }, [roomCustomVariableDefinitions]);
    const inspectedRoomValues = useMemo(() => getWiredObjectInspectionValues(objectInspection, 'room'), [objectInspection]);
    const selectedFurniAssignments = useMemo(() => {
        if (!selectedFurni) return [];

        return toWiredInspectionAssignments(getWiredObjectInspectionValues(objectInspection, 'furni'));
    }, [selectedFurni, objectInspection]);
    const selectedFurniAssignmentMap = useMemo(() => {
        return new Map(selectedFurniAssignments.map((assignment) => [assignment.variableItemId, assignment]));
    }, [selectedFurniAssignments]);
    const selectedFurniCustomVariableDefinitions = useMemo(() => {
        if (!selectedFurniAssignments.length) return [];

        return furniVariableDefinitions
            .filter((definition) => selectedFurniAssignmentMap.has(definition.itemId))
            .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }) || left.itemId - right.itemId);
    }, [selectedFurniAssignments, selectedFurniAssignmentMap, furniVariableDefinitions]);
    const selectedFurniCustomVariableDefinitionMap = useMemo(() => {
        return new Map(selectedFurniCustomVariableDefinitions.map((definition) => [definition.name, definition]));
    }, [selectedFurniCustomVariableDefinitions]);
    const furniVariables = useMemo(() => {
        if (!selectedFurni || !selectedRoomObject) return [];

        const classId = selectedRoomObject.model.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID);
        const tileSizeZ = Number(selectedFurnitureData?.tileSizeZ ?? 0);
        const liveState = selectedFurniLiveState ?? getFurniLiveState(selectedFurni.objectId, selectedFurni.category);
        const opacity = Math.round(Math.max(0, Math.min(1, selectedRoomObject.model.getValue<number>(RoomObjectVariable.FURNITURE_ALPHA_MULTIPLIER) ?? 1)) * 100);
        const gravity = Math.max(0, Math.min(1, selectedRoomObject.model.getValue<number>(WIRED_FURNI_GRAVITY_MODEL_KEY) ?? 0));

        const dynamicFlags: InspectionVariable[] = [];

        if (selectedFurni.info?.allowSit) dynamicFlags.push({ key: '@can_sit_on', value: '' });
        if (selectedFurni.info?.allowLay) dynamicFlags.push({ key: '@can_lay_on', value: '' });
        if (selectedFurni.info?.allowWalk) dynamicFlags.push({ key: '@can_stand_on', value: '' });
        if (selectedFurni.info?.allowStack) dynamicFlags.push({ key: '@is_stackable', value: '' });

        const customVariables: InspectionVariable[] = selectedFurniCustomVariableDefinitions.map((definition) => {
            const assignment = selectedFurniAssignmentMap.get(definition.itemId);

            return {
                key: definition.name,
                value: definition.hasValue ? String(assignment?.value ?? 0) : '',
                editable: canEditInspection && definition.hasValue
            };
        });

        // Official furni @type: 0 normal, 1 Builders Club, 2 a temporary (Wired) copy.
        const selectedFurniTypeValue = IsTemporaryFurniId(selectedFurni.objectId)
            ? 2
            : IsBuildersClubFurniId(selectedFurni.objectId) || selectedFurnitureData?.availableForBuildersClub
              ? 1
              : 0;
        const variables: InspectionVariable[] = [
            ...customVariables,
            ...(Number(selectedFurni.info?.teleportTargetId ?? 0) > 0
                ? [{ key: '~teleport.target_id', value: String(selectedFurni.info.teleportTargetId) }]
                : []),
            ...recolorableFurniVariables(selectedFurnitureData, canEditInspection && selectedFurni.category === RoomObjectCategory.FLOOR),
            { key: '@id', value: String(selectedFurni.objectId) },
            { key: '@class_id', value: String(classId) },
            { key: '@height', value: String(Math.round(tileSizeZ * 100)) },
            { key: '@state', value: String(liveState?.state ?? 0), editable: canEditInspection },
            { key: '@position_x', value: String(liveState?.positionX ?? 0), editable: canEditInspection },
            { key: '@position_y', value: String(liveState?.positionY ?? 0), editable: canEditInspection },
            { key: '@rotation', value: String(liveState?.rotation ?? 0), editable: canEditInspection },
            { key: '@altitude', value: String(liveState?.altitude ?? 0), editable: canEditInspection },
            { key: '@opacity', value: String(opacity), editable: canEditInspection },
            {
                key: '@gravity',
                value: String(
                    selectedFurniRuntimeState?.itemId === selectedFurni.objectId && selectedFurniRuntimeState.supported
                        ? selectedFurniRuntimeState.value
                        : gravity
                ),
                editable: canEditInspection
            },
            { key: '@is_invisible', value: '0' },
            ...(wallItemOffset ? [{ key: '@wallitem_offset', value: wallItemOffset, editable: canEditInspection }] : []),
            {
                key: '@type',
                value: String(selectedFurniTypeValue),
                label: getBuiltinTextConnectorLabel('furni', '@type', selectedFurniTypeValue)
            },
            ...dynamicFlags,
            { key: '@dimensions.x', value: String(selectedFurni.info?.tileSizeX ?? 0) },
            { key: '@dimensions.y', value: String(selectedFurni.info?.tileSizeY ?? 0) },
            { key: '@owner_id', value: String(selectedFurni.info?.ownerId ?? 0) }
        ];

        return variables;
    }, [
        selectedFurni,
        selectedFurniLiveState,
        selectedRoomObject,
        selectedFurnitureData,
        wallItemOffset,
        canEditInspection,
        selectedFurniCustomVariableDefinitions,
        selectedFurniAssignmentMap,
        selectedFurniRuntimeState,
        furniInternalRevision
    ]);
    const canEditSelectedUser = useMemo(() => {
        return !!selectedUser && !!roomSession && roomSettings.canModify;
    }, [selectedUser, roomSession, roomSettings.canModify]);
    const selectedUserHolderKey = selectedUser ? userVariableHolderKey(selectedUser.kind, selectedUser.userId) : 0;
    const selectedUserAssignments = useMemo(() => {
        if (!selectedUserHolderKey) return [];

        return toWiredInspectionAssignments(getWiredObjectInspectionValues(objectInspection, 'user'));
    }, [selectedUserHolderKey, objectInspection]);
    const selectedUserAssignmentMap = useMemo(() => {
        return new Map(selectedUserAssignments.map((assignment) => [assignment.variableItemId, assignment]));
    }, [selectedUserAssignments]);
    const selectedUserCustomVariableDefinitions = useMemo(() => {
        if (!selectedUserAssignments.length) return [];

        return userVariableDefinitions
            .filter((definition) => selectedUserAssignmentMap.has(definition.itemId))
            .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }) || left.itemId - right.itemId);
    }, [selectedUserAssignments.length, selectedUserAssignmentMap, userVariableDefinitions]);
    const selectedUserCustomVariableDefinitionMap = useMemo(() => {
        return new Map(selectedUserCustomVariableDefinitions.map((definition) => [definition.name, definition]));
    }, [selectedUserCustomVariableDefinitions]);
    const userVariables = useMemo(() => {
        if (!selectedUser) return [];

        const liveState = selectedUserLiveState ?? getUserLiveState(selectedUser.roomIndex);
        const currentControllerLevel =
            selectedUser.kind === 'user'
                ? selectedUser.roomIndex === roomSession?.ownRoomIndex
                    ? (roomSession?.controllerLevel ?? selectedUser.level ?? 0)
                    : Number(selectedUserRoomObject?.model.getValue<number>(RoomObjectVariable.FIGURE_FLAT_CONTROL) ?? selectedUser.level ?? 0)
                : Number(selectedUser.level ?? 0);
        const isSelectedUserOwner =
            selectedUser.kind === 'user'
                ? (selectedUser.roomIndex === roomSession?.ownRoomIndex && !!roomSession?.isRoomOwner) ||
                  currentControllerLevel >= RoomControllerLevel.ROOM_OWNER
                : !!selectedUser.isOwner;
        const hasSelectedUserRights = selectedUser.kind === 'user' ? currentControllerLevel >= RoomControllerLevel.GUEST : !!selectedUser.hasRights;
        const isSelectedUserGroupAdmin =
            selectedUser.kind === 'user' && !!roomSession?.isGuildRoom && currentControllerLevel >= RoomControllerLevel.GUILD_ADMIN;
        const isSelectedUserMuted = Number(selectedUserRoomObject?.model.getValue<number>(RoomObjectVariable.FIGURE_IS_MUTED) ?? 0) > 0;
        const isSelectedUserTrading =
            !!isTrading && selectedUser.kind === 'user' && (tradeOwnUser?.userId === selectedUser.userId || tradeOtherUser?.userId === selectedUser.userId);
        const signValue = Number(selectedUserRoomObject?.model.getValue<number>(RoomObjectVariable.FIGURE_SIGN) ?? -1);
        const danceValue = Number(selectedUserRoomObject?.model.getValue<number>(RoomObjectVariable.FIGURE_DANCE) ?? 0);
        const handItemValue = Number(selectedUserRoomObject?.model.getValue<number>(RoomObjectVariable.FIGURE_CARRY_OBJECT) ?? 0);
        const expressionValue = Number(selectedUserRoomObject?.model.getValue<number>(RoomObjectVariable.FIGURE_EXPRESSION) ?? 0);
        const effectValue = Number(selectedUserRoomObject?.model.getValue<number>(RoomObjectVariable.FIGURE_EFFECT) ?? 0);
        const petOwnerId = selectedUser.kind === 'pet' ? Number(roomSession?.userDataManager.getPetData(selectedUser.userId)?.ownerId ?? 0) : 0;
        const identityKey =
            selectedUser.kind === 'pet' ? '@pet_id' : selectedUser.kind === 'bot' || selectedUser.kind === 'rentable_bot' ? '@bot_id' : '@user_id';
        const teamData = getSelectedUserTeamData(effectValue);
        const selectedUserTypeValue = selectedUser.kind === 'user' ? 1 : selectedUser.kind === 'pet' ? 2 : 4;
        const selectedUserGenderValue = selectedUser.gender === 'F' ? 1 : selectedUser.gender === 'M' ? 0 : -1;
        const dynamicUserFlags: InspectionVariable[] = [];
        const dynamicUserActions: InspectionVariable[] = [];

        if (selectedUser.isHC) dynamicUserFlags.push({ key: '@is_hc', value: '' });
        if (hasSelectedUserRights) dynamicUserFlags.push({ key: '@has_rights', value: '' });
        if (isSelectedUserOwner) dynamicUserFlags.push({ key: '@is_owner', value: '' });
        if (isSelectedUserGroupAdmin) dynamicUserFlags.push({ key: '@is_group_admin', value: '' });
        if (isSelectedUserMuted) dynamicUserFlags.push({ key: '@is_muted', value: '' });
        if (isSelectedUserTrading) dynamicUserFlags.push({ key: '@is_trading', value: '' });
        if (WIRED_FREEZE_EFFECT_IDS.has(effectValue)) dynamicUserFlags.push({ key: '@is_frozen', value: '' });
        if (effectValue > 0) dynamicUserActions.push({ key: '@effect_id', value: `${effectValue} (${getEffectDisplayName(effectValue)})` });
        if (teamData) dynamicUserActions.push({ key: '@team_score', value: String(teamData.score) });
        if (teamData) dynamicUserActions.push({ key: '@team_color', value: `${teamData.colorId} (${getTeamColorDisplayName(teamData.colorId)})` });
        if (teamData) dynamicUserActions.push({ key: '@team_type', value: `${teamData.typeId} (${getTeamTypeDisplayName(teamData.typeId)})` });
        if (signValue >= 0) dynamicUserActions.push({ key: '@sign', value: `${signValue} (${getSignDisplayName(signValue)})` });
        if (danceValue > 0) dynamicUserActions.push({ key: '@dance', value: `${danceValue} (${getDanceDisplayName(danceValue)})` });
        if (expressionValue === AvatarExpressionEnum.IDLE.ordinal) dynamicUserActions.push({ key: '@is_idle', value: '' });
        if (handItemValue > 0) dynamicUserActions.push({ key: '@handitem_id', value: `${handItemValue} (${getHandItemDisplayName(handItemValue)})` });

        const customVariables: InspectionVariable[] = selectedUserCustomVariableDefinitions.map((definition) => {
            const assignment = selectedUserAssignmentMap.get(definition.itemId);

            return {
                key: definition.name,
                value: definition.hasValue ? String(assignment?.value ?? 0) : '',
                editable: canEditSelectedUser && definition.hasValue
            };
        });

        return [
            ...customVariables,
            { key: '@index', value: String(selectedUser.roomIndex) },
            { key: '@type', value: String(selectedUserTypeValue), label: getBuiltinTextConnectorLabel('user', '@type', selectedUserTypeValue) },
            { key: '@gender', value: String(selectedUserGenderValue), label: getBuiltinTextConnectorLabel('user', '@gender', selectedUserGenderValue) },
            { key: '@level', value: String(currentControllerLevel) },
            { key: '@achievement_score', value: String(selectedUser.achievementScore ?? 0) },
            ...dynamicUserFlags,
            ...dynamicUserActions,
            { key: '@position_x', value: String(liveState?.positionX ?? 0), editable: canEditSelectedUser },
            { key: '@position_y', value: String(liveState?.positionY ?? 0), editable: canEditSelectedUser },
            {
                key: '@direction',
                value: String(liveState?.direction ?? 0),
                label: getBuiltinTextConnectorLabel('user', '@direction', liveState?.direction ?? 0),
                editable: canEditSelectedUser
            },
            { key: '@altitude', value: String(liveState?.altitude ?? 0) },
            ...(Number(selectedUser.favouriteGroupId ?? 0) > 0 ? [{ key: '@favourite_group_id', value: String(selectedUser.favouriteGroupId) }] : []),
            ...(selectedUser.roomEntryMethod && selectedUser.roomEntryMethod !== 'unknown'
                ? [{ key: '@room_entry.method', value: `${getRoomEntryMethodNumericValue(selectedUser.roomEntryMethod)} (${selectedUser.roomEntryMethod})` }]
                : []),
            ...(selectedUser.roomEntryMethod === 'teleport' && Number(selectedUser.roomEntryTeleportId ?? 0) > 0
                ? [{ key: '@room_entry.teleport_id', value: String(selectedUser.roomEntryTeleportId) }]
                : []),
            { key: identityKey, value: String(selectedUser.kind === 'bot' || selectedUser.kind === 'rentable_bot' ? Math.abs(selectedUser.userId ?? 0) : (selectedUser.userId ?? 0)) },
            ...(petOwnerId > 0 ? [{ key: '@pet_owner_id', value: String(petOwnerId) }] : [])
        ];
    }, [
        selectedUser,
        selectedUserLiveState,
        canEditSelectedUser,
        selectedUserRoomObject,
        selectedUserActionVersion,
        roomSession,
        isTrading,
        tradeOwnUser,
        tradeOtherUser,
        selectedUserCustomVariableDefinitions,
        selectedUserAssignmentMap
    ]);
    const globalVariables = useMemo(() => {
        if (!roomSession) return [];

        const roomId = roomSession.roomId;
        const unitObjects = GetRoomEngine().getRoomObjects(roomId, RoomObjectCategory.UNIT);
        const floorObjects = GetRoomEngine().getRoomObjects(roomId, RoomObjectCategory.FLOOR);
        const wallObjects = GetRoomEngine().getRoomObjects(roomId, RoomObjectCategory.WALL);

        const teamSizes: Record<number, number> = {
            1: 0,
            2: 0,
            3: 0,
            4: 0
        };

        let userCount = 0;

        for (const roomObject of unitObjects) {
            if (!roomObject) continue;

            const userData = roomSession.userDataManager.getUserDataByIndex(roomObject.id);

            if (!userData || userData.type !== RoomObjectType.USER) continue;

            userCount++;

            const effectValue = Number(roomObject.model.getValue<number>(RoomObjectVariable.FIGURE_EFFECT) ?? 0);
            const teamData = getTeamEffectData(effectValue);

            if (!teamData) continue;

            teamSizes[teamData.colorId] = teamSizes[teamData.colorId] + 1;
        }

        const hotelTimeZone = roomSession.hotelTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        const hotelTimeSnapshotMs = Number(roomSession.hotelTimeSnapshotMs ?? 0);
        const hotelTimeSyncMs = Number(roomSession.hotelTimeSyncMs ?? 0);
        const hotelCurrentTimeMs =
            hotelTimeSnapshotMs > 0 && hotelTimeSyncMs > 0 ? hotelTimeSnapshotMs + Math.max(0, globalClock - hotelTimeSyncMs) : globalClock;
        const hotelNow = getHotelDateTimeParts(hotelCurrentTimeMs, hotelTimeZone);
        const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        const hotelTimeZoneOffsetMinutes = getTimeZoneOffsetMinutes(hotelCurrentTimeMs, hotelTimeZone);
        const clientTimeZoneOffsetMinutes = getTimeZoneOffsetMinutes(hotelCurrentTimeMs, clientTimeZone);
        const weekdayIndex = getMondayBasedWeekday(hotelNow);
        const monthIndex = hotelNow.month;
        // Only the variables the server reported for the room, as AIR lists the reply's values.
        const customVariables: InspectionVariable[] = roomCustomVariableDefinitions
            .filter((definition) => inspectedRoomValues.has(definition.itemId))
            .map((definition) => ({
                key: definition.name,
                value: String(inspectedRoomValues.get(definition.itemId) ?? 0),
                editable: canEditInspection
            }));

        return [
            ...customVariables,
            { key: '@furni_count', value: String(floorObjects.length + wallObjects.length) },
            { key: '@user_count', value: String(userCount) },
            { key: '@wired_timer', value: String(Math.max(0, Math.floor((globalClock - roomEnteredAt) / 500))) },
            { key: '@team_red_score', value: String(getRoomTeamScore(1)) },
            { key: '@team_green_score', value: String(getRoomTeamScore(2)) },
            { key: '@team_blue_score', value: String(getRoomTeamScore(3)) },
            { key: '@team_yellow_score', value: String(getRoomTeamScore(4)) },
            { key: '@team_red_size', value: String(teamSizes[1]) },
            { key: '@team_green_size', value: String(teamSizes[2]) },
            { key: '@team_blue_size', value: String(teamSizes[3]) },
            { key: '@team_yellow_size', value: String(teamSizes[4]) },
            { key: '@room_id', value: String(roomId) },
            { key: '@group_id', value: String(Number(roomSession.groupId ?? 0)) },
            { key: '@timezone_server', value: `${hotelTimeZoneOffsetMinutes} (${hotelTimeZone})` },
            { key: '@timezone_client', value: `${clientTimeZoneOffsetMinutes} (${clientTimeZone})` },
            { key: '@current_time', value: String(Math.floor(hotelCurrentTimeMs / 1000)) },
            { key: '@current_time.milliseconds_of_seconds', value: String(hotelNow.millisecond) },
            { key: '@current_time.seconds_of_minute', value: String(hotelNow.second) },
            { key: '@current_time.minute_of_hour', value: String(hotelNow.minute) },
            { key: '@current_time.hour_of_day', value: String(hotelNow.hour) },
            { key: '@current_time.day_of_week', value: `${weekdayIndex} (${WEEKDAY_NAMES[weekdayIndex - 1]})` },
            { key: '@current_time.day_of_month', value: String(hotelNow.day) },
            { key: '@current_time.day_of_year', value: String(getDayOfYear(hotelNow)) },
            { key: '@current_time.week_of_year', value: String(getIsoWeekOfYear(hotelNow)) },
            { key: '@current_time.month_of_year', value: `${monthIndex} (${MONTH_NAMES[monthIndex - 1]})` },
            { key: '@current_time.year', value: String(hotelNow.year) }
        ];
    }, [roomSession, globalClock, roomEnteredAt, roomCustomVariableDefinitions, inspectedRoomValues, canEditInspection]);
    const displayedVariables = inspectionType === 'user' ? userVariables : inspectionType === 'global' ? globalVariables : furniVariables;
    const selectedInspectionVariableKey = selectedInspectionVariableKeys[inspectionType] ?? '';
    const selectedInspectionCustomDefinition = useMemo(() => {
        if (!selectedInspectionVariableKey) return null;

        switch (inspectionType) {
            case 'user':
                return selectedUserCustomVariableDefinitionMap.get(selectedInspectionVariableKey) ?? null;
            case 'global':
                return roomCustomVariableDefinitionMap.get(selectedInspectionVariableKey) ?? null;
            default:
                return selectedFurniCustomVariableDefinitionMap.get(selectedInspectionVariableKey) ?? null;
        }
    }, [
        inspectionType,
        selectedInspectionVariableKey,
        selectedUserCustomVariableDefinitionMap,
        roomCustomVariableDefinitionMap,
        selectedFurniCustomVariableDefinitionMap
    ]);
    const availableInspectionDefinitions = useMemo(() => {
        if (inspectionType === 'global') return [];
        if (inspectionType === 'user' && !selectedUser) return [];
        if (inspectionType === 'furni' && !selectedFurni) return [];

        const definitions = inspectionType === 'user' ? userVariableDefinitions : furniVariableDefinitions;
        const assignments = inspectionType === 'user' ? selectedUserAssignments : selectedFurniAssignments;
        const assignedIds = new Set(assignments.map((assignment) => assignment.variableItemId));

        return definitions
            .filter((definition) => !assignedIds.has(definition.itemId) && !definition.isReadOnly && !isDerivedVariableItemId(definition.itemId))
            .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }) || left.itemId - right.itemId);
    }, [inspectionType, selectedUser, selectedFurni, userVariableDefinitions, furniVariableDefinitions, selectedUserAssignments, selectedFurniAssignments]);
    const selectedInspectionGiveDefinition = useMemo(() => {
        if (!availableInspectionDefinitions.length) return null;

        return availableInspectionDefinitions.find((definition) => definition.itemId === inspectionGiveVariableItemId) ?? availableInspectionDefinitions[0];
    }, [availableInspectionDefinitions, inspectionGiveVariableItemId]);
    const canManageInspectionVariableAssignments = useMemo(() => {
        if (!roomSettings.canModify) return false;

        if (inspectionType === 'user') return !!selectedUser;
        if (inspectionType === 'furni') return !!selectedFurni;

        return false;
    }, [roomSettings.canModify, inspectionType, selectedUser, selectedFurni]);
    const canRemoveInspectionVariable =
        canManageInspectionVariableAssignments &&
        !!selectedInspectionCustomDefinition &&
        !selectedInspectionCustomDefinition.isReadOnly &&
        !isDerivedVariableItemId(selectedInspectionCustomDefinition.itemId);
    const canGiveInspectionVariable = canManageInspectionVariableAssignments && !!availableInspectionDefinitions.length;
    // AIR WiredMenuOverviewTab: the picker lists the room's variable catalogue as the server sends it.
    const variableDefinitionsByType = useMemo<Record<VariablesElementType, VariableDefinition[]>>(() => {
        const rows = (type: VariablesElementType) => wiredVariablePickerRows(variableCatalog, VARIABLES_TYPE_TARGET[type]).map(wiredVariableToDefinition);

        return { furni: rows('furni'), user: rows('user'), global: rows('global'), context: rows('context') };
    }, [variableCatalog]);
    // The catalogue is asked for again every 500 ms while the tab is open (at most once per 800 ms).
    useEffect(() => {
        if (!isVisible || activeTab !== 'variables') return;

        refreshVariableCatalog();

        const interval = window.setInterval(refreshVariableCatalog, WIRED_VARIABLE_HOLDERS_POLL_MS);

        return () => window.clearInterval(interval);
    }, [activeTab, isVisible, refreshVariableCatalog]);
    const variablePickerDefinitions = variableDefinitionsByType[variablesType];

    useEffect(() => {
        if (!variableCatalogReady) return;

        setSelectedVariableKeys((prevValue) => {
            let didChange = false;
            const nextValue = { ...prevValue };

            for (const type of ['furni', 'user', 'global', 'context'] as VariablesElementType[]) {
                const definitions = variableDefinitionsByType[type];

                if (!definitions.length) {
                    if (nextValue[type] !== '') {
                        nextValue[type] = '';
                        didChange = true;
                    }

                    continue;
                }

                if (!definitions.some((definition) => definition.key === nextValue[type])) {
                    nextValue[type] = definitions[0].key;
                    didChange = true;
                }
            }

            return didChange ? nextValue : prevValue;
        });
    }, [variableCatalogReady, variableDefinitionsByType]);
    // AIR: a variable_overview link waits for the catalogue, then picks the exact name or else the first "<name>." one.
    useEffect(() => {
        if (!pendingVariableName || !variableCatalogReady) return;

        const types = ['furni', 'user', 'global', 'context'] as VariablesElementType[];
        const find = (match: (key: string) => boolean) => {
            for (const type of types) {
                const definition = variableDefinitionsByType[type].find((entry) => match(entry.key));

                if (definition) return { type, key: definition.key };
            }

            return null;
        };
        const found = find((key) => key === pendingVariableName) ?? find((key) => key.startsWith(`${pendingVariableName}.`));

        if (found) {
            setVariablesType(found.type);
            setSelectedVariableKeys((prev) => ({ ...prev, [found.type]: found.key }));
        }

        setPendingVariableName('');
    }, [pendingVariableName, variableCatalogReady, variableDefinitionsByType]);
    // A link still waiting is dropped with the room or the menu.
    useEffect(() => {
        setPendingVariableName('');
    }, [roomSession?.roomId]);
    useEffect(() => {
        if (!isVisible) setPendingVariableName('');
    }, [isVisible]);
    useEffect(() => {
        setSelectedManagedVariableEntry(null);
    }, [variablesType, selectedVariableKeys[variablesType]]);
    useEffect(() => {
        if (isVariableManageOpen) return;

        setSelectedManagedVariableEntry(null);
    }, [isVariableManageOpen]);

    const selectedVariableDefinition = useMemo(() => {
        const selectedKey = selectedVariableKeys[variablesType];

        return variablePickerDefinitions.find((variable) => variable.key === selectedKey) ?? variablePickerDefinitions[0] ?? null;
    }, [variablesType, selectedVariableKeys, variablePickerDefinitions]);
    const selectedVariableProperties = useMemo(() => wiredVariablePropertyRows(selectedVariableDefinition), [selectedVariableDefinition]);
    const selectedVariableTextValues = useMemo((): VariableTextValue[] => selectedVariableDefinition?.textConnector ?? [], [selectedVariableDefinition]);
    const describeVariableHolder = useCallback(
        (entityType: number, entityId: number, entityName: string): WiredHolderDescription => {
            if (entityType === HOLDER_TYPE_USER) {
                const userData = findUserVariableHolderData(roomSession?.userDataManager, entityId);
                let categoryLabel = 'Habbo';

                switch (userData?.type) {
                    case RoomObjectType.BOT:
                        categoryLabel = 'Bot';
                        break;
                    case RoomObjectType.RENTABLE_BOT:
                        categoryLabel = 'Rentable bot';
                        break;
                    case RoomObjectType.PET:
                        categoryLabel = 'Pet';
                        break;
                }

                return {
                    categoryLabel,
                    entityName: userData?.name || entityName || `#${decodeUserVariableHolder(entityId)?.id ?? entityId}`
                };
            }

            if (entityType === HOLDER_TYPE_FURNI) {
                const roomId = roomSession?.roomId ?? -1;
                const floorObject = roomSession ? GetRoomEngine().getRoomObject(roomId, entityId, RoomObjectCategory.FLOOR) : null;
                const wallObject = floorObject || !roomSession ? null : GetRoomEngine().getRoomObject(roomId, entityId, RoomObjectCategory.WALL);
                const roomObject = floorObject ?? wallObject;
                const typeId = roomObject?.model?.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID);
                const furnitureData = !roomObject
                    ? null
                    : wallObject
                      ? GetSessionDataManager().getWallItemData(typeId)
                      : GetSessionDataManager().getFloorItemData(typeId);

                return {
                    categoryLabel: wallObject ? 'Wall furni' : 'Floor furni',
                    entityName: furnitureData?.name || furnitureData?.className || entityName || `#${entityId}`
                };
            }

            return { categoryLabel: 'Global', entityName: entityName || `Room #${entityId}` };
        },
        [roomSession]
    );
    // AIR canHighlightCurrentVariable: not a pointer, not internal, and held by users or furni.
    const canVariableHighlight =
        !!selectedVariableDefinition?.variableId &&
        !isStackOnlyVariable(selectedVariableDefinition) &&
        selectedVariableDefinition.variableType !== WIRED_VARIABLE_TYPE_INTERNAL &&
        (selectedVariableDefinition.variableTarget === WIRED_OFFICIAL_TARGET_USER || selectedVariableDefinition.variableTarget === WIRED_OFFICIAL_TARGET_FURNI) &&
        !!roomSession;
    // The holders come from the server (requestHolders), polled while the highlight is on.
    const variableHolders = useWiredVariableHolders(
        isVariableHighlightActive && canVariableHighlight ? selectedVariableDefinition.variableId : null,
        roomSession?.roomId ?? 0
    );
    const variableHighlightTargets = useMemo((): VariableHighlightTarget[] => {
        if (!isVariableHighlightActive || !canVariableHighlight || !roomSession || !variableHolders) return [];

        const hasValue = !!selectedVariableDefinition.hasValue;
        const targets: VariableHighlightTarget[] = [];

        for (const holder of variableHolders) {
            if (selectedVariableDefinition.variableTarget === WIRED_OFFICIAL_TARGET_USER) {
                // A user holder is a user id; only the ones in the room can be drawn.
                const userData = findUserVariableHolderData(roomSession.userDataManager, holder.objectId);
                const roomIndex = Number(userData?.roomIndex ?? -1);

                if (roomIndex < 0) continue;

                targets.push({ category: RoomObjectCategory.UNIT, objectId: roomIndex, hasValue, value: holder.value });
                continue;
            }

            const floorObject = GetRoomEngine().getRoomObject(roomSession.roomId, holder.objectId, RoomObjectCategory.FLOOR);
            const wallObject = floorObject ? null : GetRoomEngine().getRoomObject(roomSession.roomId, holder.objectId, RoomObjectCategory.WALL);
            const category = floorObject ? RoomObjectCategory.FLOOR : wallObject ? RoomObjectCategory.WALL : -1;

            if (category < 0) continue;

            targets.push({ category, objectId: holder.objectId, hasValue, value: holder.value });
        }

        return targets;
    }, [canVariableHighlight, isVariableHighlightActive, roomSession, selectedVariableDefinition, variableHolders]);
    useEffect(() => {
        if (isVisible && activeTab === 'variables' && canVariableHighlight) return;

        setIsVariableHighlightActive(false);
    }, [activeTab, canVariableHighlight, isVisible]);
    // Official onAllVariableHolders: a variable with too many holders is not highlighted; a notification says so.
    useEffect(() => {
        if (!isVariableHighlightActive || !exceedsVariableHighlightLimit(variableHighlightTargets.length, !!selectedVariableDefinition?.hasValue)) return;

        showSingleBubble?.(
            localizeWithFallback('wiredmenu.variable_overview.highlight.error.too_many', 'Can not highlight this variable, it has too many holders'),
            NotificationBubbleType.INFO
        );
        setIsVariableHighlightActive(false);
    }, [isVariableHighlightActive, selectedVariableDefinition?.hasValue, showSingleBubble, variableHighlightTargets.length]);
    useEffect(() => {
        if (variableHighlightObjectsRef.current.length) {
            WiredSelectionVisualizer.clearVariableHighlightFromObjects(variableHighlightObjectsRef.current);
            variableHighlightObjectsRef.current = [];
        }

        if (!isVariableHighlightActive || !variableHighlightTargets.length) {
            setVariableHighlightOverlays([]);

            return;
        }

        const objects = variableHighlightTargets.map((target) => ({
            category: target.category,
            objectId: target.objectId
        }));

        WiredSelectionVisualizer.applyVariableHighlightToObjects(objects);
        variableHighlightObjectsRef.current = objects;

        return () => {
            if (!variableHighlightObjectsRef.current.length) return;

            WiredSelectionVisualizer.clearVariableHighlightFromObjects(variableHighlightObjectsRef.current);
            variableHighlightObjectsRef.current = [];
        };
    }, [isVariableHighlightActive, variableHighlightTargets]);
    useEffect(() => {
        if (!isVariableHighlightActive || !roomSession?.roomId || !variableHighlightTargets.length) {
            setVariableHighlightOverlays([]);

            return;
        }

        const updateOverlays = () => {
            const stage = GetStage();
            const nextOverlays: VariableHighlightOverlay[] = [];

            for (const target of variableHighlightTargets) {
                const bounds = GetRoomObjectBounds(roomSession.roomId, target.objectId, target.category);
                const location = GetRoomObjectScreenLocation(roomSession.roomId, target.objectId, target.category);

                if (!bounds || !location) continue;

                const x = Math.max(8, Math.min(Math.round(location.x), stage.width - 8));
                const y = Math.max(8, Math.min(Math.round(bounds.top), stage.height - 40));

                nextOverlays.push({
                    ...target,
                    key: `${target.category}:${target.objectId}`,
                    x,
                    y
                });
            }

            setVariableHighlightOverlays(nextOverlays);
        };

        updateOverlays();

        return AddAnimationTickerCallback(updateOverlays);
    }, [isVariableHighlightActive, roomSession?.roomId, variableHighlightTargets]);
    const userVariableDefinitionsById = useMemo(
        () => new Map(userVariableDefinitions.map((definition) => [definition.itemId, definition])),
        [userVariableDefinitions]
    );
    const furniVariableDefinitionsById = useMemo(
        () => new Map(furniVariableDefinitions.map((definition) => [definition.itemId, definition])),
        [furniVariableDefinitions]
    );
    const managedHolderVariableEntries = useMemo((): ManagedHolderVariableEntry[] => {
        if (!selectedManagedVariableEntry) return [];

        switch (variablesType) {
            case 'user':
                return [...(userVariableAssignments[selectedManagedVariableEntry.entityId] || [])]
                    .map((assignment): ManagedHolderVariableEntry | null => {
                        const definition = userVariableDefinitionsById.get(assignment.variableItemId);

                        if (!definition) return null;

                        return {
                            variableItemId: assignment.variableItemId,
                            name: definition.name,
                            hasValue: definition.hasValue,
                            isReadOnly: !!definition.isReadOnly,
                            value: assignment.value,
                            availability: getVariableAvailabilityLabel(definition.availability, 'user'),
                            createdAt: Number(assignment.createdAt ?? 0),
                            updatedAt: Number(assignment.updatedAt ?? 0)
                        };
                    })
                    .filter((entry): entry is ManagedHolderVariableEntry => !!entry)
                    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));
            case 'furni':
                return [...(furniVariableAssignments[selectedManagedVariableEntry.entityId] || [])]
                    .map((assignment): ManagedHolderVariableEntry | null => {
                        const definition = furniVariableDefinitionsById.get(assignment.variableItemId);

                        if (!definition) return null;

                        return {
                            variableItemId: assignment.variableItemId,
                            name: definition.name,
                            hasValue: definition.hasValue,
                            isReadOnly: !!definition.isReadOnly,
                            value: assignment.value,
                            availability: getVariableAvailabilityLabel(definition.availability, 'furni'),
                            createdAt: Number(assignment.createdAt ?? 0),
                            updatedAt: Number(assignment.updatedAt ?? 0)
                        };
                    })
                    .filter((entry): entry is ManagedHolderVariableEntry => !!entry)
                    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));
            case 'context':
                return [];
            default:
                return [...roomVariableDefinitions]
                    .map((definition) => {
                        const assignment = roomVariableAssignmentMap.get(definition.itemId);

                        return {
                            variableItemId: definition.itemId,
                            name: definition.name,
                            hasValue: definition.hasValue,
                            isReadOnly: !!definition.isReadOnly,
                            value: assignment?.value ?? 0,
                            availability: getVariableAvailabilityLabel(definition.availability, 'global'),
                            createdAt: 0,
                            updatedAt: Number(assignment?.updatedAt ?? 0)
                        };
                    })
                    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));
        }
    }, [
        selectedManagedVariableEntry,
        variablesType,
        userVariableAssignments,
        userVariableDefinitionsById,
        furniVariableAssignments,
        furniVariableDefinitionsById,
        roomVariableDefinitions,
        roomVariableAssignmentMap
    ]);
    const selectedManagedHolderVariableEntry = useMemo(() => {
        if (!managedHolderVariableEntries.length) return null;

        return managedHolderVariableEntries.find((entry) => entry.variableItemId === selectedManagedHolderVariableId) ?? managedHolderVariableEntries[0];
    }, [managedHolderVariableEntries, selectedManagedHolderVariableId]);
    const availableManagedHolderDefinitions = useMemo(() => {
        if (!selectedManagedVariableEntry || variablesType === 'global' || variablesType === 'context') return [];

        const assignedIds = new Set(managedHolderVariableEntries.map((entry) => entry.variableItemId));
        const definitions = variablesType === 'user' ? userVariableDefinitions : furniVariableDefinitions;

        return definitions
            .filter((definition) => !assignedIds.has(definition.itemId) && !definition.isReadOnly && !isDerivedVariableItemId(definition.itemId))
            .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));
    }, [selectedManagedVariableEntry, variablesType, managedHolderVariableEntries, userVariableDefinitions, furniVariableDefinitions]);
    const selectedManagedGiveDefinition = useMemo(() => {
        if (!availableManagedHolderDefinitions.length) return null;

        return availableManagedHolderDefinitions.find((definition) => definition.itemId === managedGiveVariableItemId) ?? availableManagedHolderDefinitions[0];
    }, [availableManagedHolderDefinitions, managedGiveVariableItemId]);
    const variableManageCategoryHeader = useMemo(() => {
        switch (variablesType) {
            case 'furni':
                return 'Furni type';
            case 'global':
                return 'Scope';
            case 'context':
                return 'Execution scope';
            default:
                return 'User type';
        }
    }, [variablesType]);
    const managedHolderPanelTitle = useMemo(() => {
        switch (variablesType) {
            case 'furni':
                return 'Manage Furni Variables';
            case 'global':
                return 'Manage Global Variables';
            case 'context':
                return 'Manage Context Variables';
            default:
                return 'Manage User Variables';
        }
    }, [variablesType]);
    const managedHolderInfoLines = useMemo(() => {
        if (!selectedManagedVariableEntry || !roomSession) return [];

        if (variablesType === 'user') {
            const userData = findUserVariableHolderData(roomSession.userDataManager, selectedManagedVariableEntry.entityId);
            const holder = decodeUserVariableHolder(selectedManagedVariableEntry.entityId);
            const idLabel = holder?.kind === 'pet' ? 'Pet id' : holder?.kind === 'bot' ? 'Bot id' : 'User id';

            return [
                `${variableManageCategoryHeader}: ${selectedManagedVariableEntry.categoryLabel}`,
                `Name: ${selectedManagedVariableEntry.entityName}`,
                ...(holder?.kind !== 'user' && userData?.ownerName ? [`Owner: ${userData.ownerName}`] : []),
                `${idLabel}: ${holder?.id ?? selectedManagedVariableEntry.entityId}`,
                ...(userData?.type === RoomObjectType.PET ? [`Pet level: ${Number(userData.petLevel ?? 0)}`] : [])
            ];
        }

        if (variablesType === 'furni') {
            const category = selectedManagedVariableEntry.categoryLabel === 'Wall furni' ? RoomObjectCategory.WALL : RoomObjectCategory.FLOOR;
            const owner =
                GetRoomEngine()
                    .getRoomObject(roomSession.roomId, selectedManagedVariableEntry.entityId, category)
                    ?.model?.getValue<string>(RoomObjectVariable.FURNITURE_OWNER_NAME) || '';

            return [
                `${variableManageCategoryHeader}: ${selectedManagedVariableEntry.categoryLabel}`,
                `Name: ${selectedManagedVariableEntry.entityName}`,
                ...(owner ? [`Owner: ${owner}`] : []),
                `Furni id: ${selectedManagedVariableEntry.entityId}`
            ];
        }

        if (variablesType === 'context') {
            return [
                `${variableManageCategoryHeader}: Current execution`,
                `Name: ${selectedManagedVariableEntry.entityName}`,
                `Context id: ${selectedManagedVariableEntry.entityId}`
            ];
        }

        return [`${variableManageCategoryHeader}: Room`, `Name: Room #${roomSession.roomId}`, `Room id: ${roomSession.roomId}`];
    }, [selectedManagedVariableEntry, roomSession, variablesType, variableManageCategoryHeader]);
    const managedHolderWarningText = useMemo(() => {
        switch (variablesType) {
            case 'furni':
                return 'Use this tool only for furni that are currently loaded in the room. Reload the panel after major room changes.';
            case 'global':
                return 'Global variables are room-scoped. Only the latest update time is tracked for these values.';
            case 'context':
                return 'Context variables only live inside the current wired execution. They are shared through the signal chain until a branch overrides them.';
            default:
                return 'Do not use this tool for users who are currently in the room/using the changed variable in another room.';
        }
    }, [variablesType]);
    const managedHolderUserData = useMemo(() => {
        if (variablesType !== 'user' || !selectedManagedVariableEntry || !roomSession) return null;

        return findUserVariableHolderData(roomSession.userDataManager, selectedManagedVariableEntry.entityId);
    }, [variablesType, selectedManagedVariableEntry, roomSession]);
    const managedHolderFurniCategory = useMemo(() => {
        if (variablesType !== 'furni' || !selectedManagedVariableEntry) return RoomObjectCategory.FLOOR;

        return selectedManagedVariableEntry.categoryLabel === 'Wall furni' ? RoomObjectCategory.WALL : RoomObjectCategory.FLOOR;
    }, [variablesType, selectedManagedVariableEntry]);
    const canManageHolderVariables = roomSettings.canModify && !!selectedManagedVariableEntry;
    const canRemoveManagedHolderVariable =
        canManageHolderVariables &&
        variablesType !== 'global' &&
        variablesType !== 'context' &&
        !!selectedManagedHolderVariableEntry &&
        !selectedManagedHolderVariableEntry.isReadOnly &&
        !isDerivedVariableItemId(selectedManagedHolderVariableEntry.variableItemId);
    const canGiveManagedHolderVariable =
        canManageHolderVariables && variablesType !== 'global' && variablesType !== 'context' && !!availableManagedHolderDefinitions.length;
    useEffect(() => {
        if (!selectedManagedVariableEntry) {
            setSelectedManagedHolderVariableId(0);
            setEditingManagedHolderVariableId(0);
            setEditingManagedHolderValue('');
            setIsManagedGiveOpen(false);

            return;
        }

        setEditingManagedHolderVariableId(0);
        setEditingManagedHolderValue('');
        setIsManagedGiveOpen(false);
    }, [selectedManagedVariableEntry]);
    useEffect(() => {
        if (!managedHolderVariableEntries.length) {
            setSelectedManagedHolderVariableId(0);
            return;
        }

        if (managedHolderVariableEntries.some((entry) => entry.variableItemId === selectedManagedHolderVariableId)) return;

        const preferredItemId = Number(selectedVariableDefinition?.itemId ?? 0);
        const preferredEntry = managedHolderVariableEntries.find((entry) => entry.variableItemId === preferredItemId);

        setSelectedManagedHolderVariableId(preferredEntry?.variableItemId ?? managedHolderVariableEntries[0].variableItemId);
    }, [managedHolderVariableEntries, selectedManagedHolderVariableId, selectedVariableDefinition?.itemId]);
    useEffect(() => {
        if (!availableManagedHolderDefinitions.length) {
            setManagedGiveVariableItemId(0);
            return;
        }

        if (availableManagedHolderDefinitions.some((definition) => definition.itemId === managedGiveVariableItemId)) return;

        setManagedGiveVariableItemId(availableManagedHolderDefinitions[0].itemId);
    }, [availableManagedHolderDefinitions, managedGiveVariableItemId]);
    useEffect(() => {
        if (!selectedManagedHolderVariableEntry || !editingManagedHolderVariableId) return;
        if (selectedManagedHolderVariableEntry.variableItemId !== editingManagedHolderVariableId) return;

        setEditingManagedHolderValue(String(selectedManagedHolderVariableEntry.value ?? 0));
    }, [selectedManagedHolderVariableEntry, editingManagedHolderVariableId]);
    // Manage opens on a variable made with a box (AIR allows only persisted user variables; furni and global
    // variables keep the owners window here).
    const variableManageCanOpen =
        !!selectedVariableDefinition?.itemId &&
        variablesType !== 'context' &&
        !isStackOnlyVariable(selectedVariableDefinition);
    // Clearing reaches holders outside the room, so only the owner of the definition box gets the
    // button; the server enforces the same rule.
    const canVariableClear =
        variableManageCanOpen &&
        (variablesType === 'user' || variablesType === 'furni') &&
        roomSettings.canModify &&
        // AIR canDeleteCurrentVariable: a created, persisted variable the server lets be deleted.
        !!selectedVariableDefinition?.canCreateDelete &&
        selectedVariableDefinition.variableType === WIRED_VARIABLE_TYPE_CREATED &&
        isPersistedWiredVariable(selectedVariableDefinition) &&
        !!selectedVariableDefinition?.itemId &&
        IsOwnerOfFloorFurniture(selectedVariableDefinition.itemId);
    const confirmClearVariable = () => {
        if (!canVariableClear || !showConfirm || !selectedVariableDefinition?.itemId) return;
        const scope = variablesType === 'furni' ? 'furni' : 'user';
        const itemId = selectedVariableDefinition.itemId;

        showConfirm(
            localizeWithFallback(
                'wiredmenu.variable_overview.delete_all.desc',
                'Are you sure you want to clear this variable? All users/furni that hold this variable will lose it. This action cannot be undone'
            ),
            () => clearVariableForAllHolders(scope, itemId),
            null,
            LocalizeText('generic.ok'),
            LocalizeText('generic.cancel'),
            localizeWithFallback('wiredmenu.variable_overview.delete_all.title', 'Clear this variable'),
            null,
            NotificationConfirmItem.TITLE_BAR_DANGER
        );
    };
    const commitManagedHolderValueEdit = useCallback(() => {
        if (!selectedManagedVariableEntry || !selectedManagedHolderVariableEntry || !roomSettings.canModify || selectedManagedHolderVariableEntry.isReadOnly)
            return;
        if (!selectedManagedHolderVariableEntry.hasValue) return;
        if (variablesType === 'context') return;

        const parsedValue = Number(editingManagedHolderValue.trim());
        const nextValue = clampWiredVariableValue(parsedValue);

        switch (variablesType) {
            case 'user':
                updateUserVariableValue(selectedManagedVariableEntry.entityId, selectedManagedHolderVariableEntry.variableItemId, nextValue);
                break;
            case 'furni':
                updateFurniVariableValue(selectedManagedVariableEntry.entityId, selectedManagedHolderVariableEntry.variableItemId, nextValue);
                break;
            default:
                updateRoomVariableValue(selectedManagedHolderVariableEntry.variableItemId, nextValue);
                break;
        }

        setEditingManagedHolderVariableId(0);
    }, [
        selectedManagedVariableEntry,
        selectedManagedHolderVariableEntry,
        roomSettings.canModify,
        editingManagedHolderValue,
        variablesType,
        updateUserVariableValue,
        updateFurniVariableValue,
        updateRoomVariableValue
    ]);
    const giveManagedHolderVariable = useCallback(() => {
        if (!selectedManagedVariableEntry || !selectedManagedGiveDefinition || !roomSettings.canModify) return;
        if (variablesType === 'global' || variablesType === 'context') return;

        const parsedValue = Number(managedGiveValue.trim());
        const nextValue = clampWiredVariableValue(parsedValue);

        if (variablesType === 'user') assignUserVariable(selectedManagedVariableEntry.entityId, selectedManagedGiveDefinition.itemId, nextValue);
        else assignFurniVariable(selectedManagedVariableEntry.entityId, selectedManagedGiveDefinition.itemId, nextValue);

        setSelectedManagedHolderVariableId(selectedManagedGiveDefinition.itemId);
        setManagedGiveValue('0');
        setIsManagedGiveOpen(false);
    }, [
        selectedManagedVariableEntry,
        selectedManagedGiveDefinition,
        roomSettings.canModify,
        variablesType,
        managedGiveValue,
        assignUserVariable,
        assignFurniVariable
    ]);
    const removeManagedHolderVariable = useCallback(() => {
        if (!selectedManagedVariableEntry || !selectedManagedHolderVariableEntry || !roomSettings.canModify || selectedManagedHolderVariableEntry.isReadOnly)
            return;
        if (variablesType === 'global' || variablesType === 'context') return;

        if (variablesType === 'user') removeUserVariable(selectedManagedVariableEntry.entityId, selectedManagedHolderVariableEntry.variableItemId);
        else removeFurniVariable(selectedManagedVariableEntry.entityId, selectedManagedHolderVariableEntry.variableItemId);

        setEditingManagedHolderVariableId(0);
    }, [selectedManagedVariableEntry, selectedManagedHolderVariableEntry, roomSettings.canModify, variablesType, removeUserVariable, removeFurniVariable]);

    const clearMonitorLogs = () => {
        if (isMonitorClearCoolingDown) return;

        setIsMonitorClearCoolingDown(true);
        setSelectedMonitorErrorType(null);
        setSelectedMonitorLogDetails(null);
        setIsMonitorHistoryOpen(false);
        setIsMonitorInfoOpen(false);
        // AIR's "Clear all" (1632); the server answers with the cleared error list (15).
        SendMessageComposer(new WiredErrorLogsClearComposer());
    };

    const openMonitorLogDetails = (type: string, details: Partial<MonitorLogDetails>) => {
        setSelectedMonitorErrorType(type);
        setSelectedMonitorLogDetails({
            errorId: details.errorId,
            type,
            severity: String(details.severity ?? MONITOR_ERROR_INFO[type]?.severity ?? 'ERROR'),
            reason: normalizeMonitorReason(details.reason),
            sourceLabel: String(details.sourceLabel ?? ''),
            sourceId: Number(details.sourceId ?? 0),
            amount: details.amount ? String(details.amount) : undefined,
            latest: details.latest ? String(details.latest) : undefined,
            occurredAt: details.occurredAt ? String(details.occurredAt) : undefined
        });
    };

    const beginVariableEdit = (variable: InspectionVariable) => {
        if (!variable.editable) return;

        if (inspectionType === 'furni') {
            const isEditableBuiltIn = EDITABLE_FURNI_VARIABLES.includes(variable.key);
            const customDefinition = selectedFurniCustomVariableDefinitionMap.get(variable.key);
            const isEditableCustom = !!customDefinition?.hasValue && !customDefinition?.isReadOnly;

            if (!isEditableBuiltIn && !isEditableCustom) return;
        }
        if (inspectionType === 'user') {
            const isEditableBuiltIn = EDITABLE_USER_VARIABLES.includes(variable.key);
            const customDefinition = selectedUserCustomVariableDefinitionMap.get(variable.key);
            const isEditableCustom = !!customDefinition?.hasValue && !customDefinition?.isReadOnly;

            if (!isEditableBuiltIn && !isEditableCustom) return;
        }
        if (inspectionType === 'global') {
            const customDefinition = roomCustomVariableDefinitionMap.get(variable.key);
            const isEditableCustom = !!customDefinition && !customDefinition.isReadOnly;

            if (!isEditableCustom) return;
        }

        setEditingVariable(variable.key);
        setEditingValue(variable.value);
    };

    const commitVariableEdit = () => {
        if (inspectionType === 'global') {
            const customDefinition = roomCustomVariableDefinitionMap.get(editingVariable);

            if (!customDefinition || customDefinition.isReadOnly) {
                cancelVariableEdit();
                return;
            }

            const parsed = parseWiredVariableValue(editingValue);

            if (Number.isNaN(parsed)) {
                cancelVariableEdit();
                return;
            }

            const currentValue = inspectedRoomValues.get(customDefinition.itemId) ?? 0;

            if (currentValue === parsed) {
                cancelVariableEdit();
                return;
            }

            updateRoomVariableValue(customDefinition.itemId, parsed);
            refreshObjectInspection();
            setEditingVariable(null);
            setEditingValue('');
            return;
        }

        if (inspectionType === 'user' && selectedUser) {
            const customDefinition = selectedUserCustomVariableDefinitionMap.get(editingVariable);

            if (customDefinition?.hasValue && !customDefinition.isReadOnly) {
                const parsed = parseWiredVariableValue(editingValue);

                if (Number.isNaN(parsed)) {
                    cancelVariableEdit();
                    return;
                }

                const assignment = selectedUserAssignmentMap.get(customDefinition.itemId);

                if (!assignment || assignment.value === parsed) {
                    cancelVariableEdit();
                    return;
                }

                updateUserVariableValue(selectedUserHolderKey, customDefinition.itemId, parsed);
                refreshObjectInspection();
                setEditingVariable(null);
                setEditingValue('');
                return;
            }

            if (!roomSession) {
                cancelVariableEdit();
                return;
            }

            const currentLiveState = selectedUserLiveState ?? getUserLiveState(selectedUser.roomIndex);

            if (!currentLiveState) {
                cancelVariableEdit();
                return;
            }

            let nextX = currentLiveState.positionX;
            let nextY = currentLiveState.positionY;
            let nextDirection = currentLiveState.direction;
            let isValid = true;

            switch (editingVariable) {
                case '@position_x': {
                    const parsed = parseWiredVariableValue(editingValue);

                    if (Number.isNaN(parsed)) {
                        isValid = false;
                        break;
                    }

                    nextX = parsed;
                    break;
                }
                case '@position_y': {
                    const parsed = parseWiredVariableValue(editingValue);

                    if (Number.isNaN(parsed)) {
                        isValid = false;
                        break;
                    }

                    nextY = parsed;
                    break;
                }
                case '@direction': {
                    const parsed = parseWiredVariableValue(editingValue);

                    if (Number.isNaN(parsed)) {
                        isValid = false;
                        break;
                    }

                    nextDirection = ((parsed % 8) + 8) % 8;
                    break;
                }
                default:
                    isValid = false;
                    break;
            }

            if (!isValid) {
                cancelVariableEdit();
                return;
            }

            if (nextX === currentLiveState.positionX && nextY === currentLiveState.positionY && nextDirection === currentLiveState.direction) {
                cancelVariableEdit();
                return;
            }

            const selectedRoomObject = GetRoomEngine().getRoomObject(roomSession.roomId, selectedUser.roomIndex, RoomObjectCategory.UNIT);
            const currentLocation =
                selectedRoomObject?.getLocation() ?? new Vector3d(currentLiveState.positionX, currentLiveState.positionY, currentLiveState.altitude / 100);
            const nextLocation = new Vector3d(nextX, nextY, currentLocation.z);
            const nextDirectionVector = new Vector3d(nextDirection * 45);

            GetRoomEngine().updateRoomObjectUserLocation(
                roomSession.roomId,
                selectedUser.roomIndex,
                currentLocation,
                nextLocation,
                false,
                0,
                nextDirectionVector,
                nextDirection * 45,
                false,
                true
            );

            SendMessageComposer(new WiredUserInspectMoveComposer(selectedUser.roomIndex, nextX, nextY, nextDirection));

            setSelectedUserLiveState({
                ...currentLiveState,
                positionX: nextX,
                positionY: nextY,
                direction: nextDirection
            });

            setEditingVariable(null);
            setEditingValue('');
            return;
        }

        const customFurniDefinition = selectedFurniCustomVariableDefinitionMap.get(editingVariable);

        if (customFurniDefinition?.hasValue && !customFurniDefinition.isReadOnly) {
            const parsed = parseWiredVariableValue(editingValue);

            if (Number.isNaN(parsed)) {
                cancelVariableEdit();
                return;
            }

            const assignment = selectedFurniAssignmentMap.get(customFurniDefinition.itemId);

            if (!assignment || assignment.value === parsed) {
                cancelVariableEdit();
                return;
            }

            updateFurniVariableValue(selectedFurni.objectId, customFurniDefinition.itemId, parsed);
            refreshObjectInspection();
            setEditingVariable(null);
            setEditingValue('');
            return;
        }

        // The server swaps the furni to the nearest colour of its Builders Club palette.
        if (isRecolorableFurniKey(editingVariable)) {
            const parsed = parseRecolorableFurniValue(editingVariable, editingValue);

            if (parsed === null || !selectedFurni || !roomSession) {
                cancelVariableEdit();
                return;
            }

            SendMessageComposer(new WiredFurniRuntimeStateRequestComposer(selectedFurni.objectId, WIRED_FURNI_RUNTIME_ACTION_WRITE, editingVariable, parsed));
            setEditingVariable(null);
            setEditingValue('');
            return;
        }

        if (editingVariable === '@gravity') {
            const parsed = parseWiredVariableValue(editingValue);
            if (!selectedFurni || !roomSession || (parsed !== 0 && parsed !== 1)) {
                cancelVariableEdit();
                return;
            }
            if (selectedFurniRuntimeState?.itemId === selectedFurni.objectId && selectedFurniRuntimeState.value === parsed) {
                cancelVariableEdit();
                return;
            }

            SendMessageComposer(new WiredFurniRuntimeStateRequestComposer(selectedFurni.objectId, WIRED_FURNI_RUNTIME_ACTION_WRITE, '@gravity', parsed));
            setEditingVariable(null);
            setEditingValue('');
            return;
        }

        if (!editingVariable || !selectedFurni || !selectedRoomObject || !roomSession) return;

        const currentLiveState = selectedFurniLiveState ?? getFurniLiveState(selectedFurni.objectId, selectedFurni.category);

        if (!currentLiveState) {
            cancelVariableEdit();
            return;
        }

        let nextX = currentLiveState.positionX;
        let nextY = currentLiveState.positionY;
        let nextZ = currentLiveState.altitude / 100;
        let nextRotation = currentLiveState.rotation;
        let nextState: number = null;
        let nextOpacity: number = null;
        let nextGravity: number = null;
        let nextWallOffsetX: number = null;
        let nextWallOffsetY: number = null;
        let isValid = true;

        switch (editingVariable) {
            case '@position_x': {
                const parsed = parseWiredVariableValue(editingValue);

                if (Number.isNaN(parsed)) {
                    isValid = false;
                    break;
                }

                nextX = parsed;
                break;
            }
            case '@position_y': {
                const parsed = parseWiredVariableValue(editingValue);

                if (Number.isNaN(parsed)) {
                    isValid = false;
                    break;
                }

                nextY = parsed;
                break;
            }
            case '@rotation': {
                const parsed = parseWiredVariableValue(editingValue);

                if (Number.isNaN(parsed)) {
                    isValid = false;
                    break;
                }

                nextRotation = ((parsed % 8) + 8) % 8;
                break;
            }
            case '@altitude': {
                const parsed = parseWiredVariableValue(editingValue);

                if (Number.isNaN(parsed)) {
                    isValid = false;
                    break;
                }

                nextZ = Math.max(0, Math.min(40, parsed / 100));
                break;
            }
            case '@state': {
                const parsed = parseWiredVariableValue(editingValue);

                if (Number.isNaN(parsed)) {
                    isValid = false;
                    break;
                }

                nextState = parsed;
                break;
            }
            case '@opacity': {
                const parsed = parseWiredVariableValue(editingValue);

                if (Number.isNaN(parsed)) {
                    isValid = false;
                    break;
                }

                nextOpacity = Math.max(0, Math.min(100, parsed));
                break;
            }
            case '@gravity': {
                const parsed = parseWiredVariableValue(editingValue);

                if (Number.isNaN(parsed)) {
                    isValid = false;
                    break;
                }

                nextGravity = parsed > 0 ? 1 : 0;
                break;
            }
            case '@wallitem_offset': {
                if (selectedFurni.category !== RoomObjectCategory.WALL) {
                    isValid = false;
                    break;
                }

                const match = editingValue.trim().match(/^(-?\d+)\s*,\s*(-?\d+)$/);

                if (!match) {
                    isValid = false;
                    break;
                }

                nextWallOffsetX = parseInt(match[1], 10);
                nextWallOffsetY = parseInt(match[2], 10);
                break;
            }
        }

        if (!isValid) {
            cancelVariableEdit();
            return;
        }

        if (editingVariable === '@opacity') {
            const currentOpacity = Math.round(
                Math.max(0, Math.min(1, selectedRoomObject.model.getValue<number>(RoomObjectVariable.FURNITURE_ALPHA_MULTIPLIER) ?? 1)) * 100
            );

            if (nextOpacity === currentOpacity) {
                cancelVariableEdit();
                return;
            }

            selectedRoomObject.model.setValue(RoomObjectVariable.FURNITURE_ALPHA_MULTIPLIER, nextOpacity / 100);
            SendMessageComposer(new WiredFurniRuntimeStateRequestComposer(selectedFurni.objectId, WIRED_FURNI_RUNTIME_ACTION_WRITE, '@opacity', nextOpacity));
            setEditingVariable(null);
            setEditingValue('');
            return;
        }

        if (editingVariable === '@gravity') {
            const currentGravity = Math.max(0, Math.min(1, selectedRoomObject.model.getValue<number>(WIRED_FURNI_GRAVITY_MODEL_KEY) ?? 0));

            if (nextGravity === currentGravity) {
                cancelVariableEdit();
                return;
            }

            selectedRoomObject.model.setValue(WIRED_FURNI_GRAVITY_MODEL_KEY, nextGravity);
            setFurniInternalRevision((previousValue) => previousValue + 1);
            SendMessageComposer(new WiredFurniRuntimeStateRequestComposer(selectedFurni.objectId, WIRED_FURNI_RUNTIME_ACTION_WRITE, '@gravity', nextGravity));
            setEditingVariable(null);
            setEditingValue('');
            return;
        }

        if (editingVariable === '@state') {
            if (nextState === currentLiveState.state) {
                cancelVariableEdit();
                return;
            }

            setSelectedFurniLiveState((previousValue) => {
                if (!previousValue) return previousValue;

                return { ...previousValue, state: nextState };
            });

            if (selectedFurni.category === RoomObjectCategory.WALL) SendMessageComposer(new FurnitureWallMultiStateComposer(selectedFurni.objectId, nextState));
            else SendMessageComposer(new FurnitureMultiStateComposer(selectedFurni.objectId, nextState));

            setEditingVariable(null);
            setEditingValue('');
            return;
        }

        if (editingVariable === '@wallitem_offset') {
            if (selectedFurni.category !== RoomObjectCategory.WALL || !parsedWallLocation) {
                cancelVariableEdit();
                return;
            }

            if (nextWallOffsetX === parsedWallLocation.localX && nextWallOffsetY === parsedWallLocation.localY) {
                cancelVariableEdit();
                return;
            }

            const wallGeometry = GetRoomEngine().getLegacyWallGeometry(roomSession.roomId);

            if (!wallGeometry) {
                cancelVariableEdit();
                return;
            }

            const nextWallLocationString = `:w=${parsedWallLocation.width},${parsedWallLocation.height} l=${nextWallOffsetX},${nextWallOffsetY} ${parsedWallLocation.direction}`;
            const nextLocation = wallGeometry.getLocation(
                parsedWallLocation.width,
                parsedWallLocation.height,
                nextWallOffsetX,
                nextWallOffsetY,
                parsedWallLocation.direction
            );
            const nextAngle = wallGeometry.getDirection(parsedWallLocation.direction);
            const currentExtra = selectedFurni.info?.stuffData?.getLegacyString?.() ?? selectedFurni.info?.extraParam ?? '0';

            if (!nextLocation) {
                cancelVariableEdit();
                return;
            }

            GetRoomEngine().updateRoomObjectWall(
                roomSession.roomId,
                selectedFurni.objectId,
                nextLocation,
                new Vector3d(nextAngle),
                currentLiveState.state,
                currentExtra
            );

            setSelectedFurniLiveState((previousValue) => {
                if (!previousValue) return previousValue;

                return {
                    ...previousValue,
                    positionX: Math.round(nextLocation.x),
                    positionY: Math.round(nextLocation.y),
                    altitude: Math.round(nextLocation.z * 100),
                    rotation: ((Math.round(nextAngle / 45) % 8) + 8) % 8
                };
            });

            SendMessageComposer(new FurnitureWallUpdateComposer(selectedFurni.objectId, nextWallLocationString));
            setEditingVariable(null);
            setEditingValue('');
            return;
        }

        if (
            nextX === currentLiveState.positionX &&
            nextY === currentLiveState.positionY &&
            Math.round(nextZ * 100) === currentLiveState.altitude &&
            nextRotation === currentLiveState.rotation
        ) {
            cancelVariableEdit();
            return;
        }

        setSelectedFurniLiveState((previousValue) => {
            if (!previousValue) return previousValue;

            return {
                ...previousValue,
                positionX: nextX,
                positionY: nextY,
                altitude: Math.round(nextZ * 100),
                rotation: nextRotation
            };
        });

        if (selectedFurni.category === RoomObjectCategory.WALL) {
            const wallGeometry = GetRoomEngine().getLegacyWallGeometry(roomSession.roomId);

            if (!wallGeometry) {
                cancelVariableEdit();
                return;
            }

            const currentLocation = selectedRoomObject.getLocation();
            const currentExtra = selectedFurni.info?.stuffData?.getLegacyString?.() ?? selectedFurni.info?.extraParam ?? '0';
            const nextLocation = new Vector3d(nextX, nextY, nextZ);
            const nextAngle = nextRotation * 45;
            const wallLocation = wallGeometry.getOldLocationString(nextLocation, nextAngle);

            if (!wallLocation) {
                cancelVariableEdit();
                return;
            }

            GetRoomEngine().updateRoomObjectWall(
                roomSession.roomId,
                selectedFurni.objectId,
                nextLocation,
                new Vector3d(nextAngle),
                currentLiveState.state,
                currentExtra
            );

            if (currentLocation) {
                setSelectedFurniLiveState((previousValue) => {
                    if (!previousValue) return previousValue;

                    return {
                        ...previousValue,
                        positionX: Math.round(nextLocation.x),
                        positionY: Math.round(nextLocation.y),
                        altitude: Math.round(nextLocation.z * 100),
                        rotation: nextRotation
                    };
                });
            }

            SendMessageComposer(new FurnitureWallUpdateComposer(selectedFurni.objectId, wallLocation));
            setEditingVariable(null);
            setEditingValue('');
            return;
        }

        SendMessageComposer(new UpdateFurniturePositionComposer(selectedFurni.objectId, nextX, nextY, Math.round(nextZ * 10000), nextRotation));

        setEditingVariable(null);
        setEditingValue('');
    };

    const cancelVariableEdit = () => {
        setEditingVariable(null);
        setEditingValue('');
    };
    const giveInspectionVariable = useCallback(() => {
        if (!canManageInspectionVariableAssignments || !selectedInspectionGiveDefinition) return;

        const parsedValue = Number(inspectionGiveValue.trim());
        const nextValue = clampWiredVariableValue(parsedValue);

        if (inspectionType === 'user' && selectedUser) {
            assignUserVariable(selectedUserHolderKey, selectedInspectionGiveDefinition.itemId, nextValue);
            setSelectedInspectionVariableKeys((prev) => ({ ...prev, user: selectedInspectionGiveDefinition.name }));
        } else if (inspectionType === 'furni' && selectedFurni) {
            assignFurniVariable(selectedFurni.objectId, selectedInspectionGiveDefinition.itemId, nextValue);
            setSelectedInspectionVariableKeys((prev) => ({ ...prev, furni: selectedInspectionGiveDefinition.name }));
        }

        refreshObjectInspection();
        setInspectionGiveValue('0');
        setIsInspectionGiveOpen(false);
    }, [
        canManageInspectionVariableAssignments,
        selectedInspectionGiveDefinition,
        inspectionGiveValue,
        inspectionType,
        selectedUser,
        selectedUserHolderKey,
        assignUserVariable,
        selectedFurni,
        assignFurniVariable,
        refreshObjectInspection
    ]);
    const removeInspectionVariable = useCallback(() => {
        if (!canManageInspectionVariableAssignments || !selectedInspectionCustomDefinition || selectedInspectionCustomDefinition.isReadOnly) return;

        cancelVariableEdit();

        if (inspectionType === 'user' && selectedUser) {
            removeUserVariable(selectedUserHolderKey, selectedInspectionCustomDefinition.itemId);
            setSelectedInspectionVariableKeys((prev) => ({ ...prev, user: '' }));
        } else if (inspectionType === 'furni' && selectedFurni) {
            removeFurniVariable(selectedFurni.objectId, selectedInspectionCustomDefinition.itemId);
            setSelectedInspectionVariableKeys((prev) => ({ ...prev, furni: '' }));
        }

        refreshObjectInspection();
        setIsInspectionGiveOpen(false);
    }, [
        canManageInspectionVariableAssignments,
        selectedInspectionCustomDefinition,
        inspectionType,
        selectedUser,
        removeUserVariable,
        selectedFurni,
        removeFurniVariable,
        refreshObjectInspection
    ]);

    const onVariableInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();
        // React clears currentTarget once the event is handled, so keep the input for the next frame.
        const input = event.currentTarget;

        switch (event.key) {
            case 'Enter':
            case 'NumpadEnter':
                event.preventDefault();
                commitVariableEdit();
                window.requestAnimationFrame(() => input?.blur());
                return;
            case 'Escape':
                event.preventDefault();
                cancelVariableEdit();
                window.requestAnimationFrame(() => input?.blur());
                return;
        }
    };
    const onManagedHolderValueInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();
        const input = event.currentTarget;

        switch (event.key) {
            case 'Enter':
            case 'NumpadEnter':
                event.preventDefault();
                commitManagedHolderValueEdit();
                window.requestAnimationFrame(() => input?.blur());
                return;
            case 'Escape':
                event.preventDefault();
                setEditingManagedHolderVariableId(0);
                window.requestAnimationFrame(() => input?.blur());
                return;
        }
    };

    useEffect(() => {
        setEditingVariable(null);
        setEditingValue('');
    }, [selectedFurni?.objectId, selectedUser?.roomIndex, inspectionType]);
    useEffect(() => {
        if (!displayedVariables.length) {
            if (selectedInspectionVariableKey) {
                setSelectedInspectionVariableKeys((prev) => ({ ...prev, [inspectionType]: '' }));
            }

            return;
        }

        if (displayedVariables.some((variable) => variable.key === selectedInspectionVariableKey)) return;

        setSelectedInspectionVariableKeys((prev) => ({ ...prev, [inspectionType]: displayedVariables[0].key }));
    }, [displayedVariables, inspectionType, selectedInspectionVariableKey]);
    useEffect(() => {
        if (!availableInspectionDefinitions.length) {
            setInspectionGiveVariableItemId(0);
            return;
        }

        if (availableInspectionDefinitions.some((definition) => definition.itemId === inspectionGiveVariableItemId)) return;

        setInspectionGiveVariableItemId(availableInspectionDefinitions[0].itemId);
    }, [availableInspectionDefinitions, inspectionGiveVariableItemId]);
    useEffect(() => {
        setIsInspectionGiveOpen(false);
        setInspectionGiveValue('0');
    }, [inspectionType, selectedUser?.userId, selectedFurni?.objectId]);

    useEffect(() => {
        if (inspectionType !== 'furni' || !selectedFurni) {
            setSelectedFurniLiveState(null);

            return;
        }

        setSelectedFurniLiveState(getFurniLiveState(selectedFurni.objectId, selectedFurni.category));
    }, [inspectionType, selectedFurni?.objectId, selectedFurni?.category]);

    useEffect(() => {
        setSelectedFurniRuntimeState(null);
        if (!isVisible || inspectionType !== 'furni' || !roomSettings.canInspect || !selectedFurni || selectedFurni.category !== RoomObjectCategory.FLOOR)
            return;

        SendMessageComposer(new WiredFurniRuntimeStateRequestComposer(selectedFurni.objectId, WIRED_FURNI_RUNTIME_ACTION_READ, '@gravity', 0));
    }, [isVisible, inspectionType, roomSettings.canInspect, selectedFurni?.objectId, selectedFurni?.category]);

    useEffect(() => {
        if (inspectionType !== 'user' || !selectedUser) {
            setSelectedUserLiveState(null);

            return;
        }

        setSelectedUserLiveState(getUserLiveState(selectedUser.roomIndex));
    }, [inspectionType, selectedUser?.roomIndex]);

    if (!isVisible) return null;

    return (
        <NativeTextTree>
            <>
                {isVariableHighlightActive && !!variableHighlightOverlays.length && (
                    <div className="pointer-events-none absolute left-0 top-0 z-30">
                        {variableHighlightOverlays.map((overlay) => (
                            <div
                                key={overlay.key}
                                className="pointer-events-none absolute"
                                style={{
                                    left: overlay.x,
                                    top: overlay.y,
                                    transform: 'translateX(-50%)'
                                }}
                            >
                                {overlay.hasValue && (
                                    <div className="absolute left-1/2 top-[-30px] -translate-x-1/2">
                                        <div className="relative min-w-[24px] rounded-[8px] bg-[#86aebccc] px-[8px] py-[4px] text-center text-[12px] font-bold leading-none text-white shadow-[inset_0_0_0_1px_rgba(176,211,225,.7)]">
                                            {overlay.value ?? 0}
                                            <span className="absolute left-1/2 bottom-[-7px] z-10 h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[7px] border-x-transparent border-t-[#86aebccc]" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                <OctaneCardView
                    className="octane-wired-menu min-w-[520px] max-w-[520px]"
                    theme="primary-slim"
                    uniqueKey="wired-creator-tools"
                    windowPosition={DraggableWindowPosition.TOP_LEFT}
                >
                    <OctaneCardHeaderView headerText={localizeWithFallback('wiredmenu.title', 'Wired Creator Tools (:wired)')} onCloseClick={() => setIsVisible(false)} />
                    <OctaneCardTabsView justifyContent="start">
                        {TABS.map((tab) => (
                            <OctaneCardTabsItemView key={tab.key} isActive={activeTab === tab.key} onClick={() => setActiveTab(tab.key)}>
                                <Text>{localizeWithFallback(wiredMenuTabKey(tab.key), tab.label)}</Text>
                            </OctaneCardTabsItemView>
                        ))}
                    </OctaneCardTabsView>
                    <OctaneCardContentView className="text-black bg-[#e9e6d9]" gap={3}>
                        {activeTab === 'monitor' && (
                            <WiredMonitorTabView
                                monitorStats={monitorStats}
                                monitorLogs={monitorLogs}
                                monitorHistoryRows={monitorHistoryRows}
                                onOpenMonitorInfo={() => setIsMonitorInfoOpen(true)}
                                onOpenMonitorHistory={() => setIsMonitorHistoryOpen(true)}
                                onOpenRoomLogs={() => setIsRoomLogsOpen(true)}
                                isClearCoolingDown={isMonitorClearCoolingDown}
                                canClearLogs={!!roomSettings.canModify}
                                onClearMonitorLogs={clearMonitorLogs}
                                onOpenMonitorLogDetails={openMonitorLogDetails}
                            />
                        )}
                        {activeTab === 'inspection' && (
                            <WiredInspectionTabView
                                selectedFurni={selectedFurni}
                                selectedUser={selectedUser}
                                roomId={roomSession?.roomId ?? null}
                                previewRevision={furniInternalRevision}
                                previewPlaceholder={previewPlaceholder}
                                keepSelected={keepSelected}
                                onKeepSelectedChange={setKeepSelected}
                                displayedVariables={displayedVariables}
                                selectedInspectionVariableKey={selectedInspectionVariableKey}
                                onSelectInspectionVariable={(variable) => {
                                    setSelectedInspectionVariableKeys((prev) => ({ ...prev, [inspectionType]: variable.key }));
                                    beginVariableEdit(variable);
                                }}
                                onCancelVariableEdit={cancelVariableEdit}
                                onVariableInputKeyDown={onVariableInputKeyDown}
                                onBeginVariableEdit={(variable) => {
                                    setSelectedInspectionVariableKeys((prev) => ({ ...prev, [inspectionType]: variable.key }));
                                    beginVariableEdit(variable);
                                }}
                                selectedInspectionGiveDefinition={selectedInspectionGiveDefinition}
                                onSelectGiveVariable={setInspectionGiveVariableItemId}
                                availableInspectionDefinitions={availableInspectionDefinitions}
                                inspectionGiveValue={inspectionGiveValue}
                                onInspectionGiveValueChange={setInspectionGiveValue}
                                canGiveInspectionVariable={canGiveInspectionVariable}
                                onGiveInspectionVariable={() => giveInspectionVariable()}
                                canRemoveInspectionVariable={canRemoveInspectionVariable}
                                onRemoveInspectionVariable={() => removeInspectionVariable()}
                                canHighlightWireds={canHighlightConfiguredWireds}
                                isHighlightingWireds={isHighlightingConfiguredWireds && canHighlightConfiguredWireds}
                                onToggleHighlightWireds={() => setIsHighlightingConfiguredWireds((value) => !value)}
                            />
                        )}
                        {activeTab === 'variables' && (
                            <WiredVariablesTabView
                                variablePickerDefinitions={variablePickerDefinitions}
                                selectedVariableDefinition={selectedVariableDefinition}
                                onPickVariable={(key) => setSelectedVariableKeys((prev) => ({ ...prev, [variablesType]: key }))}
                                canVariableHighlight={canVariableHighlight}
                                variableManageCanOpen={variableManageCanOpen}
                                canVariableClear={canVariableClear}
                                onClearVariable={confirmClearVariable}
                                onOpenManagePanel={() => {
                                    requestUserVariables();
                                    setSelectedManagedVariableEntry(null);
                                    setIsVariableManageOpen(true);
                                }}
                                arrayInspectorCanOpen={!!selectedVariableDefinition?.itemId}
                                onOpenArrayInspector={() => setIsArrayInspectorOpen(true)}
                                selectedVariableProperties={selectedVariableProperties}
                                selectedVariableTextValues={selectedVariableTextValues}
                                onOpenWebApiExplorer={() => openVariablesExplorer({ roomId: roomSession?.roomId })}
                            />
                        )}
                        {activeTab === 'settings' && <WiredToolsSettingsTabView onOpenSelfDonation={() => setIsSelfDonationOpen(true)} />}
                        {activeTab === 'chests' && <WiredChestsTabView />}
                        {activeTab === 'share' && <WiredShareTabView />}
                    </OctaneCardContentView>
                </OctaneCardView>
                {isMonitorHistoryOpen && (
                    <OctaneCardView
                        className="octane-wired-menu min-w-[760px] max-w-[760px] max-h-[520px]"
                        theme="primary-slim"
                        uniqueKey="wired-monitor-history"
                        windowPosition={DraggableWindowPosition.TOP_LEFT}
                        offsetLeft={560}
                        offsetTop={40}
                    >
                        <OctaneCardHeaderView headerText={localizeWithFallback('wiredmenu.monitor.history.title', 'Wired Monitor Logs')} onCloseClick={() => setIsMonitorHistoryOpen(false)} />
                        <OctaneCardContentView className="text-black bg-[#f4efe3] p-3 flex flex-col gap-3" overflow="hidden">
                            <div className="flex flex-wrap items-center gap-2 text-[12px]">
                                <span className="text-[#555]">Severity:</span>
                                {['ALL', 'WARNING', 'ERROR'].map((severity) => (
                                    <BaseButton
                                        key={severity}
                                        className={`rounded border px-2 py-[2px] ${monitorHistorySeverityFilter === severity ? 'border-[#4d7892] bg-[#dbeaf4] text-[#1a4d68]' : 'border-[#b8b2a4] bg-white text-[#555]'}`}
                                        type="button"
                                        onClick={() => setMonitorHistorySeverityFilter(severity as 'ALL' | 'ERROR' | 'WARNING')}
                                    >
                                        {severity}
                                    </BaseButton>
                                ))}
                                <span className="ml-2 text-[#555]">Type:</span>
                                <Select
                                    className="rounded border border-[#b8b2a4] bg-white px-2 py-[2px] text-[12px]"
                                    value={monitorHistoryTypeFilter}
                                    onChange={(event) => setMonitorHistoryTypeFilter(event.target.value)}
                                >
                                    {monitorHistoryTypeOptions.map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                            <div className="grow overflow-y-auto border border-[#d1ccbf] rounded bg-white">
                                <table className="w-full text-[12px]">
                                    <thead className="bg-[#efede5] sticky top-0">
                                        <tr>
                                            <th className="text-left px-2 py-1">Type</th>
                                            <th className="text-left px-2 py-1">Severity</th>
                                            <th className="text-left px-2 py-1">Trigger</th>
                                            <th className="text-left px-2 py-1">Motivation</th>
                                            <th className="text-left px-2 py-1">Occurred at</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {!filteredMonitorHistoryRows.length && (
                                            <tr>
                                                <td className="px-2 py-3 text-center text-[#8b8678]" colSpan={5}>
                                                    No log history for the current filters
                                                </td>
                                            </tr>
                                        )}
                                        {filteredMonitorHistoryRows.map((row, index) => (
                                            <tr
                                                key={row.id}
                                                className={`${index % 2 === 0 ? 'bg-white' : 'bg-[#f8f6f0]'} cursor-pointer hover:bg-[#e8eefc]`}
                                                onClick={() =>
                                                    openMonitorLogDetails(row.type, {
                                                        severity: row.category,
                                                        occurredAt: row.occurredAt,
                                                        reason: row.reason,
                                                        sourceLabel: row.sourceLabel,
                                                        sourceId: row.sourceId
                                                    })
                                                }
                                            >
                                                <td className="px-2 py-1 text-[#1b57b2]">{row.type}</td>
                                                <td className="px-2 py-1">{row.category}</td>
                                                <td className="px-2 py-1">{formatMonitorSource(row.sourceLabel, row.sourceId)}</td>
                                                <td className="px-2 py-1 text-[#555]">{row.reason}</td>
                                                <td className="px-2 py-1">{row.occurredAt}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </OctaneCardContentView>
                    </OctaneCardView>
                )}
                {isMonitorInfoOpen && (
                    <OctaneCardView
                        className="octane-wired-menu min-w-[560px] max-w-[560px] max-h-[520px]"
                        theme="primary-slim"
                        uniqueKey="wired-monitor-info"
                        windowPosition={DraggableWindowPosition.TOP_LEFT}
                        offsetLeft={610}
                        offsetTop={80}
                    >
                        <OctaneCardHeaderView headerText={localizeWithFallback('wiredmenu.monitor.info.title', 'Wired Monitor Information')} onCloseClick={() => setIsMonitorInfoOpen(false)} />
                        <OctaneCardContentView className="text-black bg-[#f4efe3] p-4 flex flex-col gap-4 overflow-y-auto">
                            {monitorInfoSections.map((section) => (
                                <div key={section.title} className="flex flex-col gap-1">
                                    <Text bold>{section.title}</Text>
                                    {section.lines.map((line, index) => (
                                        <Text key={`${section.title}-${index}`}>{line}</Text>
                                    ))}
                                </div>
                            ))}
                        </OctaneCardContentView>
                    </OctaneCardView>
                )}
                {isVariableManageOpen && !!selectedVariableDefinition?.itemId && variablesType !== 'context' && (
                    <WiredVariableOwnersView
                        variableId={selectedVariableDefinition.variableId}
                        variableName={selectedVariableDefinition.key}
                        variablesType={variablesType}
                        hasValue={!!selectedVariableDefinition.hasValue}
                        describeHolder={describeVariableHolder}
                        onManage={setSelectedManagedVariableEntry}
                        onClose={() => setIsVariableManageOpen(false)}
                    />
                )}
                {isArrayInspectorOpen && !!selectedVariableDefinition?.itemId && (
                    <WiredArrayInspectorView
                        definitionItemId={selectedVariableDefinition.itemId}
                        variableName={selectedVariableDefinition.key}
                        variableType={wiredArrayVariableTypeOf(variablesType)}
                        onClose={() => setIsArrayInspectorOpen(false)}
                    />
                )}
                {isRoomLogsOpen && <WiredRoomLogsView onClose={() => setIsRoomLogsOpen(false)} />}
                {isSelfDonationOpen && <WiredSelfDonationView onClose={() => setIsSelfDonationOpen(false)} />}
                {!!selectedManagedVariableEntry && !!selectedVariableDefinition && (
                    <WiredVariableHolderPanelView
                        title={managedHolderPanelTitle}
                        warningText={managedHolderWarningText}
                        onRefresh={() => requestUserVariables()}
                        onClose={() => setSelectedManagedVariableEntry(null)}
                        preview={
                            <>
                                {variablesType === 'furni' && roomSession && (
                                    <LayoutRoomObjectImageView
                                        category={managedHolderFurniCategory}
                                        objectId={selectedManagedVariableEntry.entityId}
                                        roomId={roomSession.roomId}
                                    />
                                )}
                                {variablesType === 'user' && managedHolderUserData && (
                                    <>
                                        {managedHolderUserData.type === RoomObjectType.PET ? (
                                            <LayoutPetImageView direction={2} figure={managedHolderUserData.figure} />
                                        ) : (
                                            <LayoutAvatarImageView direction={2} figure={managedHolderUserData.figure} />
                                        )}
                                    </>
                                )}
                                {variablesType === 'global' && (
                                    <img alt="Global placeholder" className="max-w-full max-h-full object-contain p-3" src={wiredGlobalPlaceholderImage} />
                                )}
                            </>
                        }
                        infoLines={managedHolderInfoLines}
                        variablesTitle={variablesType === 'global' ? 'Room variables:' : 'Assigned variables:'}
                        entries={managedHolderVariableEntries.map((entry) => ({
                            id: String(entry.variableItemId),
                            name: entry.name,
                            availability: entry.availability,
                            hasValue: entry.hasValue,
                            value: entry.value,
                            isReadOnly: entry.isReadOnly
                        }))}
                        selectedId={selectedManagedHolderVariableEntry ? String(selectedManagedHolderVariableEntry.variableItemId) : null}
                        onSelect={(id) => setSelectedManagedHolderVariableId(Number(id))}
                        canEdit={roomSettings.canModify}
                        editingId={editingManagedHolderVariableId ? String(editingManagedHolderVariableId) : null}
                        editingValue={editingManagedHolderValue}
                        onBeginEdit={(entry) => {
                            setSelectedManagedHolderVariableId(Number(entry.id));
                            setEditingManagedHolderVariableId(Number(entry.id));
                            setEditingManagedHolderValue(String(entry.value ?? 0));
                        }}
                        onEditingValueChange={setEditingManagedHolderValue}
                        onEditBlur={() => setEditingManagedHolderVariableId(0)}
                        onEditKeyDown={onManagedHolderValueInputKeyDown}
                        isGiveOpen={isManagedGiveOpen}
                        onToggleGive={() => setIsManagedGiveOpen((value) => !value)}
                        giveOptions={availableManagedHolderDefinitions.map((definition) => ({
                            id: String(definition.itemId),
                            name: definition.name,
                            hasValue: !!definition.hasValue
                        }))}
                        giveSelectedId={selectedManagedGiveDefinition ? String(selectedManagedGiveDefinition.itemId) : ''}
                        onGiveSelect={(id) => setManagedGiveVariableItemId(Number(id))}
                        giveValue={managedGiveValue}
                        onGiveValueChange={setManagedGiveValue}
                        canGive={canGiveManagedHolderVariable}
                        onGive={() => giveManagedHolderVariable()}
                        canRemove={canRemoveManagedHolderVariable}
                        onRemove={() => removeManagedHolderVariable()}
                    />
                )}
                {!!selectedMonitorErrorInfo && (
                    <OctaneCardView
                        className="octane-wired-menu min-w-[470px] max-w-[470px] max-h-[500px]"
                        theme="primary-slim"
                        uniqueKey="wired-monitor-error-info"
                        windowPosition={DraggableWindowPosition.TOP_LEFT}
                        offsetLeft={660}
                        offsetTop={120}
                    >
                        <OctaneCardHeaderView
                            headerText={localizeWithFallback('wiredmenu.error_info.title', 'Wired Error Information')}
                            onCloseClick={() => {
                                setSelectedMonitorErrorType(null);
                                setSelectedMonitorLogDetails(null);
                            }}
                        />
                        <OctaneCardContentView className="text-black bg-[#f4efe3] p-4 flex flex-col gap-3 overflow-y-auto">
                            <div className="flex items-start justify-between gap-3">
                                <Text bold>{selectedMonitorErrorInfo.title}</Text>
                                <span
                                    className={`rounded px-2 py-[2px] text-[10px] font-semibold ${(selectedMonitorLogDetails?.severity ?? selectedMonitorErrorInfo.severity) === 'WARNING' ? 'bg-[#d4f0d0] text-[#2a6a24]' : 'bg-[#f6d7d7] text-[#8c2424]'}`}
                                >
                                    {selectedMonitorLogDetails?.severity ?? selectedMonitorErrorInfo.severity}
                                </span>
                            </div>
                            {!!selectedMonitorLogDetails && (
                                <div className="rounded border border-[#d8d2c3] bg-white/60 p-3 flex flex-col gap-1">
                                    <Text>
                                        <b>Trigger:</b> {selectedMonitorDetailSource}
                                    </Text>
                                    <Text>
                                        <b>Motivation:</b> {selectedMonitorLogDetails.reason}
                                    </Text>
                                    {!!selectedMonitorLogDetails.amount && (
                                        <Text>
                                            <b>Amount:</b> {selectedMonitorLogDetails.amount}
                                        </Text>
                                    )}
                                    {!!selectedMonitorLogDetails.latest && (
                                        <Text>
                                            <b>Latest occurrence:</b> {selectedMonitorLogDetails.latest}
                                        </Text>
                                    )}
                                    {!!selectedMonitorLogDetails.occurredAt && (
                                        <Text>
                                            <b>Occurred at:</b> {selectedMonitorLogDetails.occurredAt}
                                        </Text>
                                    )}
                                </div>
                            )}
                            {selectedMonitorErrorInfo.description.map((paragraph, index) => (
                                <Text key={index}>{paragraph}</Text>
                            ))}
                        </OctaneCardContentView>
                    </OctaneCardView>
                )}
            </>
        </NativeTextTree>
    );
};
