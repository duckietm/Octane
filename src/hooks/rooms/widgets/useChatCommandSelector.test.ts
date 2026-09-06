/* @vitest-environment jsdom */

import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../api', () => ({
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

vi.mock('../../events', () => ({
    useMessageEvent: vi.fn()
}));

import { CLIENT_COMMANDS, useChatCommandSelector } from './useChatCommandSelector';

// The client-side commands of the official ChatInputWidgetHandler that the
// selector has to offer even when the server sends no command list.
const OFFICIAL_CLIENT_COMMANDS = [
    'visit',
    'roomid',
    'cam',
    'fs',
    'ignore',
    'unignore',
    'mutepets',
    'moonwalk',
    'habnam',
    'hidemouse',
    'wf',
    'wired',
    'var',
    'inspect',
    'link'
];

describe('useChatCommandSelector', () => {
    afterEach(cleanup);

    it('registers every official client command with an English description', () => {
        const byKey = new Map(CLIENT_COMMANDS.map((command) => [command.key, command]));

        for (const key of OFFICIAL_CLIENT_COMMANDS) {
            expect(byKey.has(key), `missing :${key}`).toBe(true);
            expect(byKey.get(key).fallback.length).toBeGreaterThan(0);
        }
    });

    it('suggests :visit while the user is typing it', () => {
        const { result } = renderHook(() => useChatCommandSelector(':vis'));

        expect(result.current.isVisible).toBe(true);
        expect(result.current.filteredCommands.map((command) => command.key)).toContain('visit');
    });
});
