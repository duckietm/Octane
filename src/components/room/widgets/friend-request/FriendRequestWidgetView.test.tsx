import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ full: false, respond: vi.fn(), alert: vi.fn() }));

vi.mock('../../../../api', () => ({ GetUserProfile: vi.fn(), LocalizeText: (key: string) => key }));
vi.mock('../object-location/ObjectLocationView', () => ({ ObjectLocationView: (props: { children: ReactNode }) => <div>{props.children}</div> }));
vi.mock('../../../../hooks', () => ({
    useFriendRequestWidget: () => ({ displayedRequests: [{ request: { id: 3, requesterUserId: 7, name: 'Alice' }, roomIndex: 1 }], hideFriendRequest: vi.fn() }),
    useFriends: () => ({ requestResponse: state.respond, isFriendListFull: () => state.full, showFriendListFullAlert: state.alert })
}));

const { FriendRequestWidgetView } = await import('./FriendRequestWidgetView');

describe('FriendRequestWidgetView', () => {
    afterEach(() => {
        cleanup();
        state.respond.mockClear();
        state.alert.mockClear();
    });

    it('answers the request by its request id', () => {
        state.full = false;
        render(<FriendRequestWidgetView />);
        fireEvent.click(screen.getByText(/widget\.friendrequest\.accept/));

        expect(state.respond).toHaveBeenCalledWith(3, true);
    });

    it('refuses to accept with a full friend list, as the friends list does', () => {
        state.full = true;
        render(<FriendRequestWidgetView />);
        fireEvent.click(screen.getByText(/widget\.friendrequest\.accept/));
        fireEvent.click(screen.getByText('widget.friendrequest.decline'));

        expect(state.alert).toHaveBeenCalledOnce();
        expect(state.respond).toHaveBeenCalledTimes(1);
        expect(state.respond).toHaveBeenCalledWith(3, false);
    });
});
