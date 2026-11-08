/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    handlers: new Map<unknown, (event: unknown) => void>(),
    sent: [] as unknown[],
    opened: [] as string[]
}));

vi.mock('@octane/renderer', () => ({
    GetConfiguration: () => ({ getValue: (_key: string, fallback: unknown) => fallback }),
    GetModeratorUserInfoMessageComposer: class {
        constructor(public userId: number) {}
    },
    ModeratorUserInfoEvent: class {}
}));
vi.mock('../../../api', () => ({
    SendMessageComposer: (composer: unknown) => state.sent.push(composer),
    OpenUrl: (url: string) => state.opened.push(url),
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));
vi.mock('../../../hooks', () => ({
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => state.handlers.set(type, handler),
    useRoomUserListSnapshot: () => []
}));
vi.mock('./UserRecordsView', () => ({ USER_RECORD_KIND: { cautions: 0, bans: 1, bannedAccounts: 2, tradeLocks: 3 } }));
vi.mock('../../../common/native-text/NativeTextTree', () => ({ NativeTextTree: ({ children }: { children?: ReactNode }) => <>{children}</> }));
vi.mock('../native/NativeWindow0', () => ({
    Native0Border: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    Native0Button: ({ label, onClick }: { label: string; onClick?: () => void }) => (
        <button type="button" onClick={onClick}>
            {label}
        </button>
    ),
    Native0Text: ({ text, onClick }: { text: string; onClick?: () => void }) =>
        onClick ? (
            <button type="button" onClick={onClick}>
                {text}
            </button>
        ) : (
            <span>{text}</span>
        )
}));

import { ModeratorInitData, ModeratorUserInfoEvent } from '@octane/renderer';
import { UserInfoPanel } from './UserInfoPanel';

const settings = { alertPermission: true, kickPermission: true, banPermission: true, chatlogsPermission: true } as unknown as ModeratorInitData;

const userInfo = (counts: { cautionCount: number; banCount: number; tradingLockCount: number; identityRelatedBanCount: number }) => ({
    userId: 7,
    userName: 'target',
    registrationAgeInMinutes: 60,
    minutesSinceLastLogin: 5,
    online: true,
    cfhCount: 0,
    abusiveCfhCount: 0,
    tradingExpiryDate: '',
    lastPurchaseDate: '',
    identityId: 99,
    primaryEmailAddress: 'someone@example.com',
    userClassification: '',
    lastSanctionTime: '',
    sanctionAgeHours: 100,
    ...counts
});

const renderPanel = (onOpenRecords: (kind: number, userName: string) => void) =>
    render(
        <UserInfoPanel
            settings={settings}
            userId={7}
            onOpenChatlog={() => undefined}
            onOpenModAction={() => undefined}
            onOpenRecords={onOpenRecords}
            onOpenRoomVisits={() => undefined}
            onOpenSendMessage={() => undefined}
        />
    );

describe('UserInfoPanel', () => {
    afterEach(cleanup);

    beforeEach(() => {
        state.handlers.clear();
        state.sent.length = 0;
        state.opened.length = 0;
    });

    it('opens the records window of the matching kind from each "view" link', () => {
        const onOpenRecords = vi.fn();

        renderPanel(onOpenRecords);
        act(() =>
            state.handlers.get(ModeratorUserInfoEvent)?.({
                getParser: () => ({ data: userInfo({ cautionCount: 2, banCount: 1, tradingLockCount: 1, identityRelatedBanCount: 3 }) })
            })
        );

        const links = screen.getAllByRole('button', { name: 'view' });

        expect(links).toHaveLength(4);
        links.forEach((link) => fireEvent.click(link));

        // cautions, bans, trade locks and the banned accounts, in the order the rows are laid out
        expect(onOpenRecords.mock.calls).toEqual([
            [0, 'target'],
            [1, 'target'],
            [3, 'target'],
            [2, 'target']
        ]);
        expect(state.opened).toEqual([]);
    });

    it('shows no "view" link for a count of zero, the banned accounts included', () => {
        renderPanel(vi.fn());
        act(() =>
            state.handlers.get(ModeratorUserInfoEvent)?.({
                getParser: () => ({ data: userInfo({ cautionCount: 0, banCount: 0, tradingLockCount: 0, identityRelatedBanCount: 0 }) })
            })
        );

        expect(screen.queryByRole('button', { name: 'view' })).toBeNull();
    });
});
