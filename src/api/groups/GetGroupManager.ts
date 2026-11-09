import { CreateLinkEvent } from '@octane/renderer';

export function GetGroupManager(groupId: number): void {
    CreateLinkEvent(`groups/manage/${groupId}`);
}
