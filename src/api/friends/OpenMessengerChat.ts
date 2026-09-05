import { CreateLinkEvent } from '@octane/renderer';

export function OpenMessengerChat(friendId: number = 0): void {
    if (friendId === 0) CreateLinkEvent('friends-messenger/toggle');
    else CreateLinkEvent(`friends-messenger/${friendId}`);
}
