import type { AvatarInfoFurni } from '../../api';

export type WiredToolsTab = 'monitor' | 'variables' | 'inspection' | 'chests' | 'settings' | 'share';
export type InspectionElementType = 'furni' | 'user' | 'global';
export type VariablesElementType = InspectionElementType | 'context';

export interface InspectionElementButton {
    key: InspectionElementType;
    label: string;
    icon: string;
}

export interface VariablesElementButton {
    key: VariablesElementType;
    label: string;
    icon: string;
    disabled?: boolean;
}

export interface InspectionFurniSelection {
    objectId: number;
    category: number;
    info: AvatarInfoFurni;
}

export interface InspectionFurniLiveState {
    positionX: number;
    positionY: number;
    altitude: number;
    rotation: number;
    state: number;
}

export interface InspectionUserSelection {
    kind: 'user' | 'bot' | 'rentable_bot' | 'pet';
    roomIndex: number;
    name: string;
    figure: string;
    gender: string;
    userId: number;
    level: number;
    achievementScore: number;
    isHC: boolean;
    hasRights: boolean;
    isOwner: boolean;
    favouriteGroupId: number;
    roomEntryMethod: string;
    roomEntryTeleportId: number;
    posture?: string;
}

export interface InspectionUserLiveState {
    positionX: number;
    positionY: number;
    altitude: number;
    direction: number;
}

export interface MonitorStat {
    label: string;
    value: string;
    /** The official statistics colour of the value (WIRED_MONITOR_COLOR), as a CSS colour. */
    color?: string;
}

export interface MonitorLog {
    /** AIR's error id; it picks the info text `wiredmenu.error_info.<id>`. */
    errorId: number;
    type: string;
    category: string;
    amount: string;
    latest: string;
    latestReason: string;
    latestSourceId: number;
    latestSourceLabel: string;
}

/** AIR WiredRoomStatsData room counters: each count with its limit, from the server's room stats packet (1891). */
export interface MonitorRoomStats {
    floorCount: number;
    floorLimit: number;
    wallCount: number;
    wallLimit: number;
    permanentFurniVariables: number;
    permanentFurniVariablesLimit: number;
    permanentUserVariables: number;
    permanentUserVariablesLimit: number;
    permanentGlobalVariables: number;
    permanentGlobalVariablesLimit: number;
}

/** The whole AIR room stats packet: the room counters plus the wired usage against its limit and the heavy flag. */
export interface MonitorRoomStatsData extends MonitorRoomStats {
    usage: number;
    usageLimit: number;
    isHeavy: boolean;
}

export interface MonitorSnapshot {
    usageCurrentWindow: number;
    usageLimitPerWindow: number;
    isHeavy: boolean;
    delayedEventsPending: number;
    delayedEventsLimit: number;
    averageExecutionMs: number;
    peakExecutionMs: number;
    recursionDepthCurrent: number;
    recursionDepthLimit: number;
    killedRemainingSeconds: number;
    usageWindowMs: number;
    overloadAverageThresholdMs: number;
    overloadPeakThresholdMs: number;
    heavyUsageThresholdPercent: number;
    heavyConsecutiveWindowsThreshold: number;
    overloadConsecutiveWindowsThreshold: number;
    heavyDelayedThresholdPercent: number;
    /** Our monitor packet (5101): the detail behind the latest occurrence of each diagnostic type. */
    logs: Array<{
        latestReason: string;
        latestSourceId: number;
        latestSourceLabel: string;
        type: string;
    }>;
    history: Array<{
        occurredAtSeconds: number;
        reason: string;
        sourceId: number;
        sourceLabel: string;
        severity: string;
        type: string;
    }>;
    /** The server's room stats (AIR's own packet, 1891); null until the server answers one. */
    roomStats: MonitorRoomStatsData | null;
    /** The server's error list (AIR's own packet, 15, asked with 1132); empty until the server answers one. */
    errors: MonitorErrorLog[];
}

/** One row of AIR's monitor error list (WiredErrorLogs, 15). */
export interface MonitorErrorLog {
    errorId: number;
    name: string;
    category: string;
    amount: number;
    /** When the latest one happened (client clock, ms), from the server's "ms since"; -1 while it never happened. */
    latestOccurredAtMs: number;
}

export interface MonitorLogDetails {
    /** AIR's error id of a monitor row, for its `wiredmenu.error_info.<id>` text; absent for a history row. */
    errorId?: number;
    amount?: string;
    latest?: string;
    occurredAt?: string;
    reason: string;
    severity: string;
    sourceId: number;
    sourceLabel: string;
    type: string;
}

export interface InspectionVariable {
    key: string;
    value: string;
    /** A text connector label shown after the value as "value (label)"; editing keeps the bare value. */
    label?: string;
    editable?: boolean;
    valueClassName?: string;
}

export interface VariableDefinition {
    key: string;
    /** The server's variable id (`user:12`, `-125`, `~133`) of a catalogue variable. */
    variableId?: string;
    itemId?: number;
    target: 'Furni' | 'User' | 'Global' | 'Context';
    /** The official target (0 furni, 1 user, -10 global, -20 context) of a catalogue variable. */
    variableTarget?: number;
    type: string;
    /** The official type id (0 created, 1 internal, 2 sub, 3 smart) of a catalogue variable. */
    variableType?: number;
    /** The official availability id of a catalogue variable. */
    availabilityType?: number;
    hasValue: boolean;
    isReadOnly?: boolean;
    availability: string;
    canWriteTo: boolean;
    canCreateDelete: boolean;
    canIntercept: boolean;
    hasCreationTime: boolean;
    hasUpdateTime: boolean;
    isTextConnected: boolean;
    isAlwaysAvailable?: boolean;
    /** The value-to-text table of a text connected custom variable, as the server sent it. */
    textConnector?: VariableTextValue[];
    /** AIR requiresExecutionContext: a pointer, which only exists while a stack runs, so it has no holders to show. */
    requiresExecutionContext?: boolean;
}

export interface VariableTextValue {
    value: string;
    text: string;
}

export interface VariableManageEntry {
    categoryLabel: string;
    createdAt: number;
    entityId: number;
    entityName: string;
    manageLabel: string;
    updatedAt: number;
    value: number | null;
}

export interface VariableHighlightTarget {
    category: number;
    hasValue: boolean;
    objectId: number;
    value: number | null;
}

export interface VariableHighlightOverlay extends VariableHighlightTarget {
    key: string;
    x: number;
    y: number;
}

export interface ManagedHolderVariableEntry {
    availability: string;
    createdAt: number;
    hasValue: boolean;
    name: string;
    isReadOnly?: boolean;
    updatedAt: number;
    value: number | null;
    variableItemId: number;
}

export interface InspectionUserTeamData {
    colorId: number;
    typeId: number;
    score: number;
}

export interface TeamEffectData {
    colorId: number;
    typeId: number;
}

export interface ParsedWallLocation {
    width: number;
    height: number;
    localX: number;
    localY: number;
    direction: string;
}

export interface HotelDateTimeParts {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    millisecond: number;
}
