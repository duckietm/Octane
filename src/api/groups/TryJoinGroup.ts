import { GroupJoinComposer } from '@octane/renderer';
import { SendMessageComposer } from '../octane';

export const TryJoinGroup = (groupId: number) => SendMessageComposer(new GroupJoinComposer(groupId));
