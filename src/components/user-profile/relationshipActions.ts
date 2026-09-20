export type RelationshipAction = 'whisper' | 'follow' | 'invite' | 'ignore' | 'unignore';

export interface RelationshipActionContext {
    /** Web id of the friend shown on the relationship row. */
    targetId: number;
    /** The viewer's own web id. */
    selfId: number;
    /** The viewer's messenger entry for the target, or null when they are not friends. */
    friend: { online: boolean } | null;
    /** The target avatar is in the room the viewer is currently in. */
    targetInRoom: boolean;
    /** The viewer is inside a room at all. */
    viewerInRoom: boolean;
    /** The target is on the viewer's ignore list. */
    isIgnored: boolean;
}

/**
 * Which inline actions a relationship row offers for the friend it shows.
 *
 * The row can show anyone the profile owner is related to, not only the
 * viewer's own friends, so each action is gated on what the viewer can
 * actually do: whisper needs the target in the same room, follow and
 * invite need a friendship (and follow makes no sense when already in the
 * same room), ignore works by name for anyone but the viewer.
 */
export const resolveRelationshipActions = (context: RelationshipActionContext): RelationshipAction[] => {
    const { targetId, selfId, friend, targetInRoom, viewerInRoom, isIgnored } = context;

    if (targetId <= 0 || targetId === selfId) return [];

    const actions: RelationshipAction[] = [];

    if (targetInRoom) actions.push('whisper');

    if (friend && !targetInRoom) {
        if (friend.online) actions.push('follow');
        if (viewerInRoom) actions.push('invite');
    }

    actions.push(isIgnored ? 'unignore' : 'ignore');

    return actions;
};
