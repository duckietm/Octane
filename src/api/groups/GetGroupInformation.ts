import { GroupInformationComposer } from '@octane/renderer';
import { SendMessageComposer } from '../octane';

export function GetGroupInformation(groupId: number): void {
    SendMessageComposer(new GroupInformationComposer(groupId, true));
}
