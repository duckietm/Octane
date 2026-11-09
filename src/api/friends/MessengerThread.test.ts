import { describe, expect, it } from 'vitest';
import { MessengerFriend } from './MessengerFriend';
import { MessengerThread } from './MessengerThread';
import { MessengerThreadChat } from './MessengerThreadChat';

const makeThread = (participantId: number): MessengerThread => {
    const friend = new MessengerFriend();
    friend.id = participantId;
    return new MessengerThread(friend);
};

describe('MessengerThread.setMessagesReadFromUser', () => {
    it("marks only the given user's messages as READ", () => {
        const thread = makeThread(7);
        const mine = thread.addMessage(100, 'a', 0, null, MessengerThreadChat.CHAT);
        const theirs = thread.addMessage(7, 'b', 0, null, MessengerThreadChat.CHAT);

        thread.setMessagesReadFromUser(100);

        expect(mine.status).toBe(MessengerThreadChat.READ);
        expect(theirs.status).toBe(MessengerThreadChat.SENT);
    });
});

describe('MessengerThread, AIR MainView rules', () => {
    it('lights the conversation only for chat lines and invites, not for online / offline lines or warnings', () => {
        const thread = makeThread(7);

        thread.addMessage(null, 'offline', 0, null, MessengerThreadChat.STATUS_NOTIFICATION);
        thread.addMessage(null, 'moderation', 0, null, MessengerThreadChat.SECURITY_NOTIFICATION);
        expect(thread.unreadCount).toBe(0);

        thread.addMessage(7, 'hi', 0, null, MessengerThreadChat.CHAT);
        thread.addMessage(null, 'come over', 0, null, MessengerThreadChat.ROOM_INVITE);
        expect(thread.unreadCount).toBe(2);
    });

    it('combines lines from the same sender only within 10 minutes', () => {
        const thread = makeThread(7);

        thread.addMessage(7, 'old', 1200, null, MessengerThreadChat.CHAT);
        thread.addMessage(7, 'new', 0, null, MessengerThreadChat.CHAT);
        thread.addMessage(7, 'newer', 0, null, MessengerThreadChat.CHAT);

        expect(thread.groups.map((group) => group.chats.map((chat) => chat.message))).toEqual([['old'], ['new', 'newer']]);
    });

    it('puts history above the messages already shown, without lighting the conversation', () => {
        const thread = makeThread(7);

        thread.addMessage(7, 'live', 0, null, MessengerThreadChat.CHAT);
        thread.setRead();
        thread.addHistoryMessages([
            { senderId: 100, message: 'first', secondsSinceSent: 3600, extraData: null, type: MessengerThreadChat.CHAT },
            { senderId: 7, message: 'second', secondsSinceSent: 3000, extraData: null, type: MessengerThreadChat.CHAT }
        ]);

        expect(thread.groups.flatMap((group) => group.chats.map((chat) => chat.message))).toEqual(['first', 'second', 'live']);
        expect(thread.unreadCount).toBe(0);
    });
});

describe('MessengerThread.clone', () => {
    it('gives a state update its own lists, so running the update twice adds the line once', () => {
        const previous = makeThread(7);

        previous.addMessage(7, 'hallo', 0, null, MessengerThreadChat.CHAT);

        // React StrictMode calls a state updater twice with the same previous state.
        const update = () => {
            const next = previous.clone();

            next.addMessage(100, 'hoi', 0, null, MessengerThreadChat.CHAT);

            return next;
        };

        update();
        const next = update();

        expect(previous.groups.flatMap((group) => group.chats.map((chat) => chat.message))).toEqual(['hallo']);
        expect(next.groups.flatMap((group) => group.chats.map((chat) => chat.message))).toEqual(['hallo', 'hoi']);
    });

    it('marks a refused line on the copy only', () => {
        const previous = makeThread(7);

        previous.addMessage(100, '2', 0, null, MessengerThreadChat.CHAT);
        previous.addMessage(100, '2', 0, null, MessengerThreadChat.CHAT);

        const mark = () => {
            const next = previous.clone();

            next.markOwnMessageFailed(100, '2', 'failed');

            return next;
        };

        mark();
        const next = mark();

        expect(next.groups[0].chats.map((chat) => chat.failed)).toEqual([false, true]);
        expect(previous.groups[0].chats.some((chat) => chat.failed)).toBe(false);
    });
});
