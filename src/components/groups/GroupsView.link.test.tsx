import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { trackers, sendMessage } = vi.hoisted(() => ({
    trackers: [] as { linkReceived: (url: string) => void; eventUrlPrefix: string }[],
    sendMessage: vi.fn()
}));

vi.mock('@octane/renderer', () => ({
    AddLinkEventTracker: (tracker: { linkReceived: (url: string) => void; eventUrlPrefix: string }) => trackers.push(tracker),
    GroupInformationComposer: class {
        constructor(public groupId: number, public flag: boolean) {}
    },
    GroupPurchasedEvent: class {},
    GroupSettingsComposer: class {
        constructor(public groupId: number) {}
    },
    HabboGroupJoinFailedMessageEvent: class {},
    RemoveLinkEventTracker: vi.fn()
}));

vi.mock('../../api', () => ({
    GetGroupInformation: vi.fn(),
    GetRoomSession: () => ({ roomId: 1 }),
    SendMessageComposer: sendMessage,
    TryVisitRoom: vi.fn(),
    getGroupFailureFallback: () => '',
    getGroupFailureTextKey: () => '',
    getGroupFailureTitleKey: () => '',
    localizeWithFallback: (key: string) => key,
    parsePositiveId: (value: string) => (Number(value) > 0 ? Number(value) : null)
}));

vi.mock('../../hooks', () => ({
    useGroup: () => ({}),
    useGroupMemberRemovalSink: () => undefined,
    useMessageEvent: () => undefined
}));

vi.mock('../../common/native-text/NativeTextTree', () => ({ NativeTextTree: ({ children }: { children?: unknown }) => <>{children}</> }));
vi.mock('./views/GroupCreatedView', () => ({ GroupCreatedView: () => <div>created</div> }));
vi.mock('./views/GroupCreatorView', () => ({ GroupCreatorView: () => <div>creator</div> }));
vi.mock('./views/GroupHcRequiredView', () => ({ GroupHcRequiredView: () => <div>hc</div> }));
vi.mock('./views/GroupInformationStandaloneView', () => ({ GroupInformationStandaloneView: () => null }));
vi.mock('./views/GroupManagerView', () => ({ GroupManagerView: () => null }));
vi.mock('./views/GroupMembersView', () => ({ GroupMembersView: () => null }));
vi.mock('./views/GroupNativeAlertView', () => ({ GroupNativeAlertView: () => <div>alert</div> }));

import { GroupSettingsComposer } from '@octane/renderer';
import { GroupsView } from './GroupsView';

const groupsTracker = () => trackers.find((tracker) => tracker.eventUrlPrefix === 'groups/');

describe('GroupsView links', () => {
    beforeEach(() => {
        trackers.length = 0;
        sendMessage.mockClear();
    });

    afterEach(() => cleanup());

    it('opens the group creator for the catalog purchase button link', () => {
        render(<GroupsView />);

        expect(screen.queryByText('creator')).toBeNull();

        act(() => groupsTracker().linkReceived('groups/create'));

        expect(screen.getByText('creator')).toBeInTheDocument();
    });

    it('asks for the group settings behind groups/manage/<id>', () => {
        render(<GroupsView />);

        act(() => groupsTracker().linkReceived('groups/manage/42'));

        const composer = sendMessage.mock.calls.find(([sent]) => sent instanceof GroupSettingsComposer)?.[0] as GroupSettingsComposer;

        expect(composer?.groupId).toBe(42);
    });
});
