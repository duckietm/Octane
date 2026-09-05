import { CreateLinkEvent } from '@octane/renderer';

export function GetGroupMembers(groupId: number, levelId?: number): void {
    if (levelId === undefined || levelId === null) CreateLinkEvent(`group-members/${groupId}/0`);
    else CreateLinkEvent(`group-members/${groupId}/${levelId}`);
}
