export interface IHousekeepingUser {
    id: number;
    username: string;
    motto: string;
    figure: string;
    rank: number;
    rankName: string;
    online: boolean;
    lastOnlineAt: number | null;
    creditsBalance: number;
    ducketsBalance: number;
    diamondsBalance: number;
    email: string;
    ipLast: string;
    isBanned: boolean;
    isMuted: boolean;
    isTradeLocked: boolean;
    /** Profile block; null when the server predates it. */
    profile: IHousekeepingUserProfile | null;
}

export interface IHousekeepingWornBadge {
    slot: number;
    code: string;
}

export interface IHousekeepingUserProfile {
    accountCreatedAt: number | null;
    achievementScore: number;
    friendsCount: number;
    groupsCount: number;
    wornBadges: IHousekeepingWornBadge[];
}

/** The editable settings of a room, sent with the room detail only. */
export interface IHousekeepingRoomSettings {
    categoryId: number;
    tradeMode: number;
    /** 0 open, 1 locked, 2 password, 3 invisible. */
    state: number;
    tags: string[];
}

export interface IHousekeepingRoomSettingsInput {
    name: string;
    description: string;
    maxUsers: number;
    categoryId: number;
    tradeMode: number;
    tags: string[];
}

export interface IHousekeepingRoom {
    id: number;
    name: string;
    description: string;
    ownerId: number;
    ownerName: string;
    userCount: number;
    maxUsers: number;
    isLocked: boolean;
    isMuted: boolean;
    isPublic: boolean;
    createdAt: number;
    /** Present on a room detail from a server that sends it; null on list rows. */
    settings: IHousekeepingRoomSettings | null;
}

export interface IHousekeepingActionResult {
    ok: boolean;
    actionId: number | null;
    message: string;
}

export interface IHousekeepingActionLogEntry {
    id: number;
    timestamp: number;
    actorId: number;
    actorName: string;
    targetType: 'user' | 'room' | 'hotel';
    targetId: number | null;
    targetLabel: string;
    action: string;
    detail: string;
    success: boolean;
}

export interface IHousekeepingUserSummary {
    id: number;
    username: string;
    figure: string;
    online: boolean;
    rank: number;
}

export interface IHousekeepingRoomSummary {
    id: number;
    name: string;
    userCount: number;
    ownerName: string;
}

export interface IHousekeepingDashboard {
    onlineUsers: number;
    totalUsers: number;
    activeRooms: number;
    totalRooms: number;
    peakOnlineToday: number;
    peakOnlineAllTime: number;
    pendingTickets: number;
    sanctionsLast24h: number;
    serverUptimeSeconds: number;
    serverVersion: string;
}

/** A dangerous action waiting for the operator to type its target before it runs. */
export interface IHousekeepingDangerRequest {
    message: string;
    /** What the operator has to type, e.g. the room id or the username. */
    expected: string;
    confirmLabel: string;
    onConfirm: () => void;
}

/** One list from the server as a table: column keys and one string per column in each row. */
export interface IHousekeepingList {
    listKey: string;
    targetId: number;
    ok: boolean;
    message: string;
    columns: string[];
    rows: string[][];
}

/** Maintenance as the server reports it; countdownEndsAt is unix seconds, 0 when no countdown runs. */
export interface IHousekeepingMaintenanceStatus {
    enabled: boolean;
    minRank: number;
    message: string;
    countdownEndsAt: number;
}
