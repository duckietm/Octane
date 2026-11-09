import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getFollowErrorTextKey, getInstantMessageErrorTextKey } from './messengerErrors';
import { MessengerFriend } from './MessengerFriend';
import { MessengerThread } from './MessengerThread';
import { MessengerThreadChat } from './MessengerThreadChat';

// The hotel's text pack, at the repository root next to the client.
const externalTextsPath = resolve(__dirname, '../../../../texts/ExternalTexts.json');
const externalTexts = (existsSync(externalTextsPath) ? JSON.parse(readFileSync(externalTextsPath, 'utf8')) : null) as Record<string, string>;

describe('getFollowErrorTextKey', () => {
    it('maps every StalkErrorComposer code to its own text', () => {
        expect(getFollowErrorTextKey(0)).toBe('friendlist.followerror.notfriend');
        expect(getFollowErrorTextKey(1)).toBe('friendlist.followerror.offline');
        expect(getFollowErrorTextKey(2)).toBe('friendlist.followerror.hotelview');
        expect(getFollowErrorTextKey(3)).toBe('friendlist.followerror.prevented');
    });

    it('falls back to the hotel view text for unknown codes', () => {
        expect(getFollowErrorTextKey(42)).toBe('friendlist.followerror.hotelview');
    });

    it.skipIf(!externalTexts)('only uses texts that exist', () => {
        for (const code of [0, 1, 2, 3]) expect(externalTexts[getFollowErrorTextKey(code)]).toBeTruthy();
    });
});

describe('getInstantMessageErrorTextKey', () => {
    it('maps the codes the server sends for refused console messages', () => {
        expect(getInstantMessageErrorTextKey(4)).toBe('messenger.error.sendermuted');
        expect(getInstantMessageErrorTextKey(6)).toBe('messenger.error.notfriend');
        expect(getInstantMessageErrorTextKey(10)).toBe('messenger.error.offline_failed');
    });

    it('treats unknown codes as a failed send', () => {
        expect(getInstantMessageErrorTextKey(99)).toBe('messenger.error.offline_failed');
    });

    it.skipIf(!externalTexts)('only uses texts that exist', () => {
        for (let code = 0; code <= 12; code++) expect(externalTexts[getInstantMessageErrorTextKey(code)]).toBeTruthy();
    });
});

describe('MessengerThread.markOwnMessageFailed', () => {
    const makeThread = (): MessengerThread => {
        const friend = new MessengerFriend();
        friend.id = 7;
        return new MessengerThread(friend);
    };

    it('marks the newest own line with the refused text', () => {
        const thread = makeThread();
        const older = thread.addMessage(100, 'hi', 0, null, MessengerThreadChat.CHAT);
        thread.addMessage(7, 'hi', 0, null, MessengerThreadChat.CHAT);
        const newer = thread.addMessage(100, 'hi', 0, null, MessengerThreadChat.CHAT);

        expect(thread.markOwnMessageFailed(100, ' hi ', 'muted')).toBe(newer);
        expect(newer.failed).toBe(true);
        expect(newer.failureText).toBe('muted');
        expect(older.failed).toBe(false);

        expect(thread.markOwnMessageFailed(100, 'hi', 'muted')).toBe(older);
    });

    it('leaves the thread alone when no own line matches', () => {
        const thread = makeThread();
        const theirs = thread.addMessage(7, 'hi', 0, null, MessengerThreadChat.CHAT);

        expect(thread.markOwnMessageFailed(100, 'hi', 'muted')).toBeNull();
        expect(theirs.failed).toBe(false);
    });
});
