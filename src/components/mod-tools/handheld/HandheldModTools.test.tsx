/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    sent: [] as { name: string; args: unknown[] }[],
    links: [] as string[],
    visits: [] as number[],
    trackers: [] as { linkReceived: (url: string) => void; eventUrlPrefix: string }[],
    handlers: new Map<unknown, Set<(event: unknown) => void>>(),
    octane: new Set<(event: unknown) => void>(),
    permissions: new Set<string>(),
    modTools: { settings: null as unknown, cfhCategories: [] as unknown[], issueSanctions: {}, sanctionLog: {}, recordSanction: null as unknown },
    picks: [] as number[][],
    releases: [] as number[][]
}));

vi.mock('@octane/renderer', async () => {
    const actual = await vi.importActual<Record<string, unknown>>('@octane/renderer');
    const make = (name: string) =>
        class {
            static NAME = name;
            name = name;
            args: unknown[];
            constructor(...args: unknown[]) {
                this.args = args;
            }
        };
    const names = [
        'HabboSearchComposer',
        'HabboSearchResultEvent',
        'UserClassificationMessageEvent',
        'GetModeratorUserInfoMessageComposer',
        'ModeratorUserInfoEvent',
        'GetModeratorRoomInfoMessageComposer',
        'ModeratorRoomInfoEvent',
        'ModerateRoomMessageComposer',
        'CfhChatlogEvent',
        'RoomChatlogEvent',
        'UserChatlogEvent',
        'GetRoomChatlogMessageComposer',
        'GetUserChatlogMessageComposer',
        'GetCfhChatlogMessageComposer',
        'CloseIssuesMessageComposer',
        'CloseIssueDefaultActionMessageComposer',
        'CfhSanctionMessageEvent',
        'DefaultSanctionMessageComposer',
        'ModAlertMessageComposer',
        'ModBanMessageComposer',
        'ModKickMessageComposer',
        'ModMessageMessageComposer',
        'ModMuteMessageComposer',
        'ModTradingLockMessageComposer',
        'GetRoomVisitsMessageComposer',
        'RoomVisitsEvent',
        'GetModeratorUserRecordsMessageComposer',
        'ModeratorUserRecordsEvent'
    ];
    const ModeratorActionMessageComposer = Object.assign(make('ModeratorActionMessageComposer'), {
        ACTION_ALERT: 1,
        ACTION_KICK: 2,
        ACTION_MESSAGE: 3,
        ACTION_MESSAGE_AND_SOFT_KICK: 4
    });
    const ChatRecordData = Object.assign(make('ChatRecordData'), {
        TYPE_SIMPLE: 0,
        TYPE_ROOM_CHAT: 1,
        TYPE_IM_SESSION: 2,
        TYPE_DISCUSSION_THREAD: 3,
        TYPE_DISCUSSION_MESSAGE: 4,
        TYPE_SELFIE: 5,
        TYPE_PHOTO: 6
    });

    return {
        ...actual,
        ...Object.fromEntries(names.map((name) => [name, make(name)])),
        ModeratorActionMessageComposer,
        ChatRecordData,
        AddLinkEventTracker: (tracker: (typeof state.trackers)[number]) => state.trackers.push(tracker),
        RemoveLinkEventTracker: (tracker: (typeof state.trackers)[number]) => state.trackers.splice(state.trackers.indexOf(tracker), 1),
        CreateLinkEvent: (url: string) => {
            state.links.push(url);
            for (const tracker of [...state.trackers]) if (url.startsWith(tracker.eventUrlPrefix)) tracker.linkReceived(url);
        }
    };
});

vi.mock('../../../api', async () => {
    const actual = await vi.importActual<Record<string, unknown>>('../../../api');

    return {
        ...actual,
        SendMessageComposer: (composer: { name: string; args: unknown[] }) => state.sent.push({ name: composer.name, args: composer.args }),
        LocalizeText: (key: string) => key,
        localizeWithFallback: (_key: string, fallback: string, params: string[] = [], values: string[] = []) =>
            (params ?? []).reduce((text, param, index) => text.replace(`%${param}%`, values[index]), fallback),
        TryVisitRoom: (roomId: number) => state.visits.push(roomId),
        GetRoomSession: () => null,
        isHousekeepingEnabled: () => false,
        OpenUrl: () => undefined,
        PlaySound: () => undefined
    };
});

vi.mock('../../../hooks', async () => {
    const React = await vi.importActual<typeof import('react')>('react');
    const tracker = await vi.importActual<Record<string, unknown>>('../../../hooks/mod-tools/modWindowTrackerStore');
    const alerts = await vi.importActual<Record<string, unknown>>('../../../hooks/mod-tools/modAlertStore');
    const issues = await vi.importActual<Record<string, unknown>>('../../../hooks/mod-tools/issueManagerStore');
    const useSubscription = (set: Set<(event: unknown) => void>, handler: (event: unknown) => void) => {
        const ref = React.useRef(handler);

        React.useLayoutEffect(() => {
            ref.current = handler;
        });
        React.useEffect(() => {
            const entry = (event: unknown) => ref.current(event);

            set.add(entry);

            return () => {
                set.delete(entry);
            };
        }, [set]);
    };
    const setOf = (type: unknown) => {
        if (!state.handlers.has(type)) state.handlers.set(type, new Set());

        return state.handlers.get(type);
    };

    return {
        ...tracker,
        ...alerts,
        ...issues,
        useModTools: () => state.modTools,
        useIssueManager: () => context,
        useOpenIssueCount: () => 0,
        useHasPermission: (key: string) => state.permissions.has(key),
        useMessageEvent: (type: unknown, handler: (event: unknown) => void) => useSubscription(setOf(type), handler),
        useOctaneEvent: (_types: unknown, handler: (event: unknown) => void) => useSubscription(state.octane, handler),
        useObjectSelectedEvent: () => undefined,
        useRoomUserListSnapshot: () => []
    };
});

vi.mock('../../../common/draggable-window', () => ({
    DraggableWindow: ({ children, handheldSheet }: { children: ReactNode; handheldSheet?: boolean }) => (
        <div data-sheet={String(!!handheldSheet)}>{children}</div>
    )
}));
vi.mock('../../../common/layout/LayoutAvatarImageView', () => ({ LayoutAvatarImageView: () => <i data-testid="head" /> }));
vi.mock('../views/StartPanelView', () => ({ StartPanelView: () => <div data-testid="desktop-start" /> }));

import * as renderer from '@octane/renderer';
import { DESKTOP_LAYOUT } from '../../../api/handheld/handheldLayout';
import { ISSUE_STATE_OPEN, ISSUE_STATE_PICKED, onIssueInfo, resetTrackedIssues } from '../../../hooks/mod-tools/issueManagerStore';
import { useModAlertStore } from '../../../hooks/mod-tools/modAlertStore';
import { MOD_WINDOW_SIZE, useModWindowTrackerStore } from '../../../hooks/mod-tools/modWindowTrackerStore';
import { useHandheldStore } from '../../../state/handheldStore';
import { selectOption } from '../../../test-utils/selectOption';
import { ModToolsView } from '../ModToolsView';

const R = renderer as unknown as Record<string, unknown>;
const MY_ID = 1;
const context = {
    userId: MY_ID,
    pick: (issueIds: number[]) => state.picks.push(issueIds),
    release: (issueIds: number[]) => state.releases.push(issueIds),
    openHandler: (bundleId: number) =>
        useModWindowTrackerStore.getState().show({ type: 'issueHandler', key: `${bundleId}`, ...MOD_WINDOW_SIZE.issueHandler, parent: null }),
    closeHandler: (bundleId: number) => useModWindowTrackerStore.getState().close('issueHandler', `${bundleId}`),
    refreshHandler: () => undefined,
    notifyNewIssue: () => undefined,
    isBrowserOpen: () => false
};

const settings = (overrides: Record<string, unknown> = {}) => ({
    cfhPermission: true,
    chatlogsPermission: true,
    alertPermission: true,
    kickPermission: true,
    banPermission: true,
    roomAlertPermission: true,
    roomKickPermission: true,
    messageTemplates: ['Be nice'],
    roomMessageTemplates: ['Room rule'],
    issues: [],
    ...overrides
});

const emit = (name: string, parser: unknown) =>
    act(() => {
        for (const handler of [...(state.handlers.get(R[name]) ?? [])]) handler({ getParser: () => parser });
    });
const enterRoom = (roomId: number) =>
    act(() => {
        for (const handler of [...state.octane]) handler({ type: (renderer.RoomEngineEvent as unknown as Record<string, string>).INITIALIZED, roomId });
    });
const sentOf = (name: string) => state.sent.filter((entry) => entry.name === name);
const phone = (orientation: 'portrait' | 'landscape' = 'portrait') => act(() => useHandheldStore.setState({ layout: { active: true, orientation } }));
const tab = (name: string | RegExp) => screen.getByRole('tab', { name });
const page = () => document.querySelector<HTMLElement>('.octane-handheld-modtools__page:not([hidden])');

const userInfo = (userId: number, userName: string) => ({
    data: {
        userId,
        userName,
        registrationAgeInMinutes: 600,
        minutesSinceLastLogin: 3,
        online: true,
        cfhCount: 2,
        abusiveCfhCount: 0,
        cautionCount: 1,
        banCount: 0,
        tradingLockCount: 0,
        identityRelatedBanCount: 0,
        tradingExpiryDate: '',
        lastPurchaseDate: '',
        primaryEmailAddress: 'someone@example.com',
        userClassification: '',
        lastSanctionTime: '',
        sanctionAgeHours: 100
    }
});

const issue = (issueId: number, overrides: Record<string, unknown> = {}) => ({
    issueId,
    state: ISSUE_STATE_OPEN,
    categoryId: 1,
    reportedCategoryId: 104,
    issueAgeInMilliseconds: 60_000,
    priority: 3,
    groupingId: 0,
    reporterUserId: 10,
    reporterUserName: 'caller',
    reportedUserId: 20,
    reportedUserName: 'reported',
    pickerUserId: -1,
    pickerUserName: '',
    message: 'Please help',
    chatRecordId: 0,
    ...overrides
});

/** A user picked by name from the start page's search. */
const pickUserByName = async (name: string, userId: number) => {
    vi.useFakeTimers();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), { target: { value: name } });
    act(() => vi.advanceTimersByTime(400));
    vi.useRealTimers();
    expect(sentOf('HabboSearchComposer')[0].args).toEqual([name]);
    emit('HabboSearchResultEvent', {
        friends: [],
        others: [{ avatarId: userId, avatarName: name, avatarFigure: '', avatarGender: 'M', isAvatarOnline: true }]
    });
    fireEvent.click(within(screen.getByTestId('mod-search-results')).getByRole('button', { name }));
};

const start = (overrides: Record<string, unknown> = {}) => {
    state.modTools = { ...state.modTools, settings: settings(overrides) };
    return render(<ModToolsView />);
};

describe('ModToolsView on a phone', () => {
    beforeEach(() => {
        state.sent.length = 0;
        state.links.length = 0;
        state.visits.length = 0;
        state.trackers.length = 0;
        state.handlers.clear();
        state.octane.clear();
        state.permissions.clear();
        state.picks.length = 0;
        state.releases.length = 0;
        state.modTools = {
            settings: null,
            cfhCategories: [{ topics: [{ id: 104 }, { id: 106 }] }],
            issueSanctions: {},
            sanctionLog: {},
            recordSanction: vi.fn()
        };
        useModWindowTrackerStore.setState({ windows: [] });
        useModAlertStore.setState({ alerts: [] });
        resetTrackedIssues();
    });

    afterEach(() => {
        cleanup();
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
    });

    it('keeps the desktop start panel and no sheet when not on a phone', () => {
        start();

        expect(screen.getByTestId('desktop-start')).toBeInTheDocument();
        expect(document.querySelector('.octane-handheld-modtools')).toBeNull();
    });

    it('shows the start page with the tools greyed exactly as on the desktop', () => {
        phone();
        start();

        expect(screen.queryByTestId('desktop-start')).toBeNull();
        expect(screen.getByTestId('mod-start')).toBeVisible();
        expect(screen.getByTestId('mod-tile-room')).toBeDisabled();
        expect(screen.getByTestId('mod-tile-chatlog')).toBeDisabled();
        expect(screen.getByTestId('mod-tile-user')).toBeDisabled();
        expect(screen.getByTestId('mod-tile-tickets')).toBeEnabled();

        enterRoom(55);

        expect(screen.getByTestId('mod-tile-room')).toBeEnabled();
        expect(screen.getByTestId('mod-tile-chatlog')).toBeEnabled();
    });

    it('greys the ticket queue and the room chatlog without their permissions', () => {
        phone();
        start({ cfhPermission: false, chatlogsPermission: false });
        enterRoom(55);

        expect(screen.getByTestId('mod-tile-tickets')).toBeDisabled();
        expect(screen.getByTestId('mod-tile-chatlog')).toBeDisabled();
        expect(screen.getByTestId('mod-tile-room')).toBeEnabled();
    });

    it('opens the room tool as a page, goes back, and switches to it again from its tab without asking twice', () => {
        phone();
        start();
        enterRoom(55);
        fireEvent.click(screen.getByTestId('mod-tile-room'));

        expect(sentOf('GetModeratorRoomInfoMessageComposer').map((entry) => entry.args)).toEqual([[55]]);
        expect(page()).toHaveAttribute('data-page', 'roomTool:55');
        expect(screen.getByTestId('mod-start').closest('[hidden]')).not.toBeNull();

        emit('ModeratorRoomInfoEvent', {
            data: {
                flatId: 55,
                ownerId: 9,
                ownerName: 'owner',
                userCount: 4,
                ownerInRoom: true,
                room: { exists: true, name: 'Lobby', desc: 'A room', tags: ['fun'] }
            }
        });

        expect(within(page()).getByTestId('mod-room')).toHaveTextContent('Lobby');
        expect(tab('Lobby')).toBeInTheDocument();

        fireEvent.click(within(page()).getByRole('button', { name: /Back/ }));
        expect(page()).toBeNull();
        expect(screen.getByTestId('mod-start')).toBeVisible();

        // the room tile again (the desktop's toggle link) brings the open page back instead of closing it
        fireEvent.click(screen.getByTestId('mod-tile-room'));
        expect(page()).toHaveAttribute('data-page', 'roomTool:55');
        fireEvent.click(tab(/Start/));
        fireEvent.click(tab('Lobby'));
        expect(page()).toHaveAttribute('data-page', 'roomTool:55');
        expect(sentOf('GetModeratorRoomInfoMessageComposer')).toHaveLength(1);
    });

    it('sends the room caution with the checked actions and closes the page', () => {
        phone();
        start();
        enterRoom(55);
        fireEvent.click(screen.getByTestId('mod-tile-room'));
        emit('ModeratorRoomInfoEvent', {
            data: { flatId: 55, ownerId: 9, ownerName: 'owner', userCount: 4, ownerInRoom: true, room: { exists: true, name: 'Lobby', desc: '', tags: [] } }
        });

        const text = within(page()).getByTestId('mod-room-text');

        fireEvent.focus(text);
        fireEvent.change(text, { target: { value: 'Stop it' } });
        fireEvent.click(within(page()).getByRole('checkbox', { name: /doorbell/ }));
        fireEvent.click(within(page()).getByTestId('mod-room-caution'));

        expect(sentOf('ModeratorActionMessageComposer').map((entry) => entry.args)).toEqual([[1, 'Stop it', '']]);
        expect(sentOf('ModerateRoomMessageComposer').map((entry) => entry.args)).toEqual([[55, 1, 0, 0]]);
        expect(useModWindowTrackerStore.getState().windows).toHaveLength(0);
    });

    it('keeps the room sends off for a room the moderator is not in', () => {
        phone();
        start();
        enterRoom(55);
        act(() => useModWindowTrackerStore.getState().show({ type: 'roomTool', key: '77', ...MOD_WINDOW_SIZE.roomTool }));
        emit('ModeratorRoomInfoEvent', {
            data: { flatId: 77, ownerId: 9, ownerName: 'owner', userCount: 4, ownerInRoom: false, room: { exists: true, name: 'Other', desc: '', tags: [] } }
        });

        expect(within(page()).getByTestId('mod-room-caution')).toBeDisabled();
        expect(within(page()).getByTestId('mod-room-message')).toBeDisabled();
    });

    it('shows a picked user as rows with the desktop buttons and their permission rules', async () => {
        phone();
        start({ alertPermission: false, kickPermission: false, banPermission: false, chatlogsPermission: false });
        await pickUserByName('target', 7);

        expect(screen.getByTestId('mod-selected-user')).toHaveTextContent('target');
        fireEvent.click(screen.getByTestId('mod-tile-user'));
        expect(sentOf('GetModeratorUserInfoMessageComposer').map((entry) => entry.args)).toEqual([[7]]);
        expect(within(page()).getByTestId('mod-user-loading')).toBeInTheDocument();

        emit('ModeratorUserInfoEvent', userInfo(7, 'target'));

        const facts = within(page()).getByTestId('mod-user-facts');

        expect(within(facts).getByText('Cautions').parentElement).toHaveTextContent('1view');
        expect(within(page()).getByTestId('mod-user-message')).toBeDisabled();
        expect(within(page()).getByTestId('mod-user-modaction')).toBeDisabled();
        expect(within(page()).getByTestId('mod-user-chatlog')).toBeDisabled();
        expect(within(page()).getByTestId('mod-user-roomvisits')).toBeEnabled();

        // the records behind a count open as a page of their own
        fireEvent.click(within(facts).getByRole('button', { name: 'view' }));
        expect(sentOf('GetModeratorUserRecordsMessageComposer').map((entry) => entry.args)).toEqual([[7, 0]]);
        expect(page()).toHaveAttribute('data-page', 'userRecords:7:0');
        expect(tab('target')).toBeInTheDocument();
    });

    it('applies a custom ban only after the confirmation, with the same packet', async () => {
        phone();
        start();
        await pickUserByName('target', 7);
        fireEvent.click(screen.getByTestId('mod-tile-user'));
        emit('ModeratorUserInfoEvent', userInfo(7, 'target'));
        fireEvent.click(within(page()).getByTestId('mod-user-modaction'));

        expect(page()).toHaveAttribute('data-page', 'modAction:target');
        selectOption(within(page()).getByRole('combobox', { name: 'CFH topic:' }), 'help.cfh.topic.104');
        fireEvent.click(within(page()).getByRole('radio', { name: 'Ban 18h' }));
        fireEvent.click(within(page()).getByTestId('mod-action-custom'));

        expect(sentOf('ModBanMessageComposer')).toHaveLength(0);
        expect(screen.getByTestId('mod-confirm')).toHaveTextContent('Ban 18h: target');

        fireEvent.click(screen.getByTestId('mod-confirm-apply'));

        expect(sentOf('ModBanMessageComposer').map((entry) => entry.args)).toEqual([[7, 'help.cfh.topic.104', 104, 3, false]]);
        expect(useModWindowTrackerStore.getState().get('modAction', 'target')).toBeNull();
    });

    it('refuses a ban without the ban permission, as the desktop does, with a phone alert', async () => {
        phone();
        start({ banPermission: false });
        await pickUserByName('target', 7);
        fireEvent.click(screen.getByTestId('mod-tile-user'));
        emit('ModeratorUserInfoEvent', userInfo(7, 'target'));
        fireEvent.click(within(page()).getByTestId('mod-user-modaction'));
        selectOption(within(page()).getByRole('combobox', { name: 'CFH topic:' }), 'help.cfh.topic.104');
        fireEvent.click(within(page()).getByRole('radio', { name: 'Ban 18h' }));
        fireEvent.click(within(page()).getByTestId('mod-action-custom'));
        fireEvent.click(screen.getByTestId('mod-confirm-apply'));

        expect(sentOf('ModBanMessageComposer')).toHaveLength(0);
        expect(screen.getByTestId('mod-alert')).toHaveTextContent('You have insufficient permissions.');
        fireEvent.click(screen.getByTestId('mod-alert-ok'));
        expect(screen.queryByTestId('mod-alert')).toBeNull();
    });

    it('picks a ticket from the list, handles it and closes it as resolved', () => {
        phone();
        start();
        act(() => onIssueInfo(issue(31) as never, context));
        fireEvent.click(screen.getByTestId('mod-tile-tickets'));

        expect(page()).toHaveAttribute('data-page', 'issueBrowser:main');
        fireEvent.click(within(page()).getByTestId('mod-ticket-pick-1'));
        expect(state.picks).toEqual([[31]]);
        // a second tap at once does not pick again
        fireEvent.click(within(page()).getByTestId('mod-ticket-pick-1'));
        expect(state.picks).toHaveLength(1);

        // the server answers the pick: the handler opens by itself, as on the desktop, in front of the browser
        act(() => onIssueInfo(issue(31, { state: ISSUE_STATE_PICKED, pickerUserId: MY_ID, pickerUserName: 'me' }) as never, context));
        expect(page()).toHaveAttribute('data-page', expect.stringMatching(/^issueHandler:/));

        // the browser is still open on its tab; its "my issues" list hands the ticket to the handler too
        fireEvent.click(tab('Issue browser'));
        fireEvent.click(within(page()).getByTestId('mod-tickets-tab-my'));

        const card = within(page()).getByTestId(/^mod-ticket-\d+$/);

        expect(card).toHaveTextContent('Normal');
        fireEvent.click(within(card).getByRole('button', { name: 'handle' }));

        expect(page()).toHaveAttribute('data-page', expect.stringMatching(/^issueHandler:/));
        expect(sentOf('GetCfhChatlogMessageComposer').at(-1).args).toEqual([31]);
        expect(within(page()).getByText('caller: Please help')).toBeInTheDocument();

        fireEvent.click(within(page()).getByTestId('mod-handler-part-chatlog'));
        emit('CfhChatlogEvent', {
            data: {
                issueId: 31,
                callerUserId: 10,
                reportedUserId: 20,
                chatRecordId: 5,
                chatRecord: {
                    recordType: 1,
                    roomId: 55,
                    roomName: 'Lobby',
                    chatlog: [{ timestamp: '12:01', userId: 20, userName: 'reported', message: 'bad words', hasHighlighting: true }]
                }
            }
        });
        expect(within(page()).getByTestId('mod-chatlog')).toHaveTextContent('bad words');

        fireEvent.click(within(page()).getByTestId('mod-handler-resolved'));
        expect(sentOf('CloseIssuesMessageComposer').map((entry) => entry.args)).toEqual([[[31], 3]]);
    });

    it('puts the start page beside the tool on its side, without Back', () => {
        phone('landscape');
        start();
        enterRoom(55);
        fireEvent.click(screen.getByTestId('mod-tile-room'));

        expect(screen.getByTestId('mod-start')).toBeVisible();
        expect(page()).toHaveAttribute('data-page', 'roomTool:55');
        expect(within(page()).queryByRole('button', { name: /Back/ })).toBeNull();
    });
});
