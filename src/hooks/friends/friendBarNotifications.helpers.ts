/**
 * AIR friend bar activity: `HabboFriendBarData.makeNotification` keeps a friend's notifications, and the friend
 * entity (`new_friend_entity_xml`) turns each into a token: an icon on the tab and, while the tab is open, a
 * `message_piece_xml` line. Pure state, kept by `friendBarNotificationsStore`.
 */

/** AIR `FriendNotification` type codes (FriendToolbarNotification 3082). */
export const FriendNotificationType = {
    MESSENGER: -1,
    ROOM_EVENT: 0,
    ACHIEVEMENT: 1,
    QUEST: 2,
    PLAYING_GAME: 3,
    FINISHED_GAME: 4
} as const;

export interface FriendBarNotification {
    /** React key, unique for the session. */
    id: number;
    type: number;
    message: string;
    /** Removed when the friend's open tab is closed again (every type but a game in progress). */
    viewOnce: boolean;
}

export interface FriendBarNotificationsState {
    byFriend: Readonly<Record<number, ReadonlyArray<FriendBarNotification>>>;
    /** Friend ids moved to the front of the bar, most recently notified first (AIR `setFriendAt(friend, 0)`). */
    order: ReadonlyArray<number>;
    nextId: number;
}

export const emptyFriendBarNotifications: FriendBarNotificationsState = { byFriend: {}, order: [], nextId: 1 };

const TOKEN_TYPES: ReadonlyArray<number> = [
    FriendNotificationType.ROOM_EVENT,
    FriendNotificationType.ACHIEVEMENT,
    FriendNotificationType.QUEST,
    FriendNotificationType.PLAYING_GAME
];

const withFriend = (state: FriendBarNotificationsState, friendId: number, list: FriendBarNotification[]): FriendBarNotificationsState['byFriend'] => {
    const byFriend = { ...state.byFriend };

    if (list.length) byFriend[friendId] = list;
    else delete byFriend[friendId];

    return byFriend;
};

/**
 * One FriendToolbarNotification. A token replaces the friend's token of the same type and is shown first; a new
 * one moves the friend to the front of the bar. A game already shown only changes its game (AIR passes
 * notifyIfExisting = false for it), and a finished game removes the playing token without moving the friend.
 * Messenger notifications have no token (the messenger shows them).
 */
export const receiveFriendNotification = (state: FriendBarNotificationsState, friendId: number, type: number, message: string): FriendBarNotificationsState => {
    if (!friendId) return state;

    const current = state.byFriend[friendId] ?? [];

    if (type === FriendNotificationType.FINISHED_GAME) {
        if (!current.some((entry) => entry.type === FriendNotificationType.PLAYING_GAME)) return state;

        return { ...state, byFriend: withFriend(state, friendId, current.filter((entry) => entry.type !== FriendNotificationType.PLAYING_GAME)) };
    }

    if (!TOKEN_TYPES.includes(type)) return state;

    const text = message ?? '';
    const existing = current.find((entry) => entry.type === type);

    if (existing && type === FriendNotificationType.PLAYING_GAME) {
        if (existing.message === text) return state;

        return { ...state, byFriend: withFriend(state, friendId, current.map((entry) => (entry === existing ? { ...entry, message: text } : entry))) };
    }

    const notification: FriendBarNotification = { id: state.nextId, type, message: text, viewOnce: type !== FriendNotificationType.PLAYING_GAME };

    return {
        byFriend: withFriend(state, friendId, [notification, ...current.filter((entry) => entry.type !== type)]),
        order: [friendId, ...state.order.filter((id) => id !== friendId)],
        nextId: state.nextId + 1
    };
};

/** AIR entity `deselect`: closing an open tab drops the notifications that are shown once. */
export const dismissViewedNotifications = (state: FriendBarNotificationsState, friendId: number): FriendBarNotificationsState => {
    const current = state.byFriend[friendId];

    if (!current || !current.some((entry) => entry.viewOnce)) return state;

    return { ...state, byFriend: withFriend(state, friendId, current.filter((entry) => !entry.viewOnce)) };
};

/** A friend who leaves the bar (went offline, removed) loses their notifications, as AIR recycles the entity. */
export const pruneFriendNotifications = (state: FriendBarNotificationsState, onlineIds: ReadonlyArray<number>): FriendBarNotificationsState => {
    const online = new Set(onlineIds);
    const gone = Object.keys(state.byFriend).map(Number).filter((id) => !online.has(id));
    const order = state.order.filter((id) => online.has(id));

    if (!gone.length && order.length === state.order.length) return state;

    const byFriend = { ...state.byFriend };

    for (const id of gone) delete byFriend[id];

    return { ...state, byFriend, order };
};

/** The bar order: notified friends first (most recent first), the others in their usual order. */
export const orderFriendsForBar = <T extends { id: number }>(friends: ReadonlyArray<T>, order: ReadonlyArray<number>): T[] => {
    if (!order.length) return [...friends];

    const rank = new Map(order.map((id, index) => [id, index]));

    return friends
        .map((friend, index) => ({ friend, index, rank: rank.get(friend.id) ?? Number.MAX_SAFE_INTEGER }))
        .sort((a, b) => a.rank - b.rank || a.index - b.index)
        .map((entry) => entry.friend);
};
