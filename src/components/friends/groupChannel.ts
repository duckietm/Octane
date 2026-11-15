/**
 * A console chat channel tied to a group, such as a plugin's gang chat: a friend with a negative id whose figure is
 * `group|<groupId>|<badgeCode>|<roomId>`. It shows the group's badge instead of a head, and offers the group's room
 * and the group's information instead of following and the profile.
 */
export interface GroupChannel {
    groupId: number;
    badgeCode: string;
    roomId: number;
}

const PREFIX = 'group|';

export const groupChannelOf = (entry: { id?: number; figure?: string } | null | undefined): GroupChannel | null => {
    if (!entry || !(entry.id < 0) || typeof entry.figure !== 'string' || !entry.figure.startsWith(PREFIX)) return null;

    const [, group, badgeCode = '', room = '0'] = entry.figure.split('|');
    const groupId = Number.parseInt(group, 10);
    const roomId = Number.parseInt(room, 10);

    if (!Number.isFinite(groupId) || groupId <= 0) return null;

    return { groupId, badgeCode, roomId: Number.isFinite(roomId) && roomId > 0 ? roomId : 0 };
};
