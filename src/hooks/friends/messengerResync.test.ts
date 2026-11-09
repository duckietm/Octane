import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * After an automatic reconnection the messenger was never initialised again: private messages received while the
 * socket was down sat in the server's offline queue until the next full login.
 */
describe('messenger after a reconnection', () => {
    const source = readFileSync('src/hooks/friends/useFriends.ts', 'utf8');
    const start = source.indexOf('useOctaneEvent(OctaneEventType.SOCKET_REAUTHENTICATED');
    const handler = source.slice(start, source.indexOf('});', start));

    it('starts the messenger over when the socket re-authenticates', () => {
        expect(start).toBeGreaterThan(0);
        expect(handler).toContain('SendMessageComposer(new MessengerInitComposer());');
    });

    it('forgets the friends and requests it had, so removals made meanwhile disappear', () => {
        expect(handler).toContain('setFriends([]);');
        expect(handler).toContain('setRequests([]);');
        expect(handler).toContain('friendsRef.current = [];');
    });

    it('lets the fresh friend list ask for the offline messages, as at login', () => {
        expect(source).toContain('setOfflineMessagesReady(true)');
        expect(source).toContain('SendMessageComposer(new RequestOfflineMessagesComposer());');
    });
});
