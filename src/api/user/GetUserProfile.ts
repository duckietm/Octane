import { UserProfileComposer } from '@octane/renderer';
import { SendMessageComposer } from '../octane';

export function GetUserProfile(userId: number): void {
    SendMessageComposer(new UserProfileComposer(userId));
}
