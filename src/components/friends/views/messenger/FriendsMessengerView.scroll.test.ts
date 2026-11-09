import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('FriendsMessengerView routing and scroll behavior', () => {
    it('does not dereference the legacy message box when the persistent view is mounted', () => {
        const source = readFileSync(join(process.cwd(), 'src/components/friends/views/messenger/FriendsMessengerView.tsx'), 'utf8');

        expect(source).toMatch(/if\s*\(!messagesBox\.current\)\s*return;/);
    });

    it('routes Staff Chat and direct chats through the same persistent window', () => {
        const source = readFileSync(join(process.cwd(), 'src/components/friends/views/messenger/FriendsMessengerView.tsx'), 'utf8');

        expect(source).not.toContain('isLegacyStaffChat');
        expect(source).not.toContain('shouldUseLegacyStaffChat');

        // Staff Chat must not get its own branch: both it and direct chats resolve a
        // thread and open the same window, so there is a single routing path.
        expect(source).not.toContain('if(participantId === -1)');
        expect(source).toContain('const thread = getMessageThread(participantId);');
        expect(source).toContain('setActiveThreadId(thread.threadId);');
        expect(source.match(/setActiveThreadId\(thread\.threadId\);/g)).toHaveLength(1);
    });

    it('clears the field before the translation, so text typed meanwhile is not wiped', () => {
        const source = readFileSync(join(process.cwd(), 'src/components/friends/views/messenger/FriendsMessengerView.tsx'), 'utf8');

        const clear = source.indexOf("setMessageText('');", source.indexOf('sendingRef.current = true;'));
        const translate = source.indexOf('await translateOutgoing(text)');

        expect(clear).toBeGreaterThan(-1);
        expect(translate).toBeGreaterThan(clear);
        expect(source.indexOf("setMessageText('');", translate)).toBe(-1);
    });

    it('uses final component names instead of implementation-origin prefixes', () => {
        const files = [
            'src/components/friends/views/friends-list/FriendsListView.tsx',
            'src/components/friends/views/messenger/FriendsMessengerView.tsx',
            'src/components/friends/views/messenger/FriendsMessengerHabbiconPickerView.tsx',
            'src/components/friends/views/messenger/messenger-thread/FriendsMessengerThreadGroup.tsx'
        ];

        for (const file of files) {
            const source = readFileSync(join(process.cwd(), file), 'utf8');

            expect(source).not.toMatch(/\b(?:swf|air)-/);
        }
    });
});
