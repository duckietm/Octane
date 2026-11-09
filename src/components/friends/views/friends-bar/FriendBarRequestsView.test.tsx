/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFriends } from '../../../../hooks';
import { FriendBarRequestsView } from './FriendBarRequestsView';

vi.mock('../../../../hooks', () => ({ useFriends: vi.fn() }));
vi.mock('../../../../common/layout/LayoutAvatarImageView', () => ({ LayoutAvatarImageView: () => null }));

const request = (id: number, name: string) => ({ id, name, requesterUserId: id * 10, figureString: '' });

describe('Friend bar requests tab (AIR FriendRequestsTab / NewFriendRequestTab)', () => {
    const requestResponse = vi.fn();
    const requestResponseAll = vi.fn();

    const mockRequests = (requests: ReturnType<typeof request>[]) =>
        vi.mocked(useFriends).mockReturnValue({
            requests,
            requestResponse,
            requestResponseAll,
            isFriendListFull: () => false,
            showFriendListFullAlert: vi.fn()
        } as unknown as ReturnType<typeof useFriends>);

    beforeEach(() => {
        requestResponse.mockClear();
        requestResponseAll.mockClear();
    });

    afterEach(cleanup);

    it('opens the bubble of a single request and accepts or declines it', () => {
        mockRequests([request(1, 'DuckieTM')]);
        const { container } = render(<FriendBarRequestsView />);

        fireEvent.click(screen.getByText('DuckieTM'));
        expect(container.querySelector('.friend-bar-requests-bubble.is-single')).not.toBeNull();

        fireEvent.click(container.querySelectorAll('.friend-bar-requests-shiny')[0]);
        fireEvent.click(container.querySelector('.friend-bar-requests-link'));

        expect(requestResponse).toHaveBeenNthCalledWith(1, 1, true);
        expect(requestResponse).toHaveBeenNthCalledWith(2, 1, false);
    });

    it('lists several requests with a counter, and answers them all at once', () => {
        mockRequests([request(1, 'DuckieTM'), request(2, 'Anna')]);
        const { container } = render(<FriendBarRequestsView />);

        expect(container.querySelector('.friend-bar-requests-counter')).toHaveTextContent('2');

        fireEvent.click(container.querySelector('.friend-bar-request'));
        expect(container.querySelectorAll('.friend-bar-requests-row')).toHaveLength(2);

        fireEvent.click(container.querySelector('.friend-bar-requests-accept-all'));
        fireEvent.click(container.querySelector('.friend-bar-requests-footer .friend-bar-requests-link'));

        expect(requestResponseAll).toHaveBeenNthCalledWith(1, true);
        expect(requestResponseAll).toHaveBeenNthCalledWith(2, false);
    });
});
