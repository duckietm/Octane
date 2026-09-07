/* @vitest-environment jsdom */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AddLinkEventTracker } from '@octane/renderer';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFriends } from '../../../../hooks';
import { FriendsListView } from './FriendsListView';

vi.mock('../../../../hooks', () => ({ useFriends: vi.fn() }));

vi.mock('./FriendsListSearchView', () => ({
    FriendsSearchView: () => <div data-testid="friend-search">search</div>
}));

vi.mock('./friends-list-group/FriendsListGroupView', () => ({
    FriendsListGroupView: () => <div data-testid="friend-group">friends</div>
}));

vi.mock('./friends-list-request/FriendsListRequestView', () => ({
    FriendsListRequestView: () => <div data-testid="friend-requests">requests</div>
}));

describe('Habbo friend-list information architecture', () => {
    const requestResponse = vi.fn();

    beforeEach(() => {
        vi.mocked(AddLinkEventTracker).mockClear();
        requestResponse.mockClear();
        vi.mocked(useFriends).mockReturnValue({
            onlineFriends: [],
            offlineFriends: [],
            requests: [{ id: 11 }, { id: 12 }],
            requestFriend: vi.fn(),
            requestResponse,
            settings: { categories: [] }
        } as unknown as ReturnType<typeof useFriends>);
    });

    afterEach(cleanup);

    const renderOpen = () => {
        const result = render(<FriendsListView />);
        const tracker = vi.mocked(AddLinkEventTracker).mock.calls[0][0];

        act(() => tracker.linkReceived('friends/show'));

        return { ...result, container: result.baseElement };
    };

    it('uses the original expanded friends tab structure', () => {
        const { container } = renderOpen();

        expect(container.querySelector('.hfl-panel-header')).toBeNull();
        expect(container.querySelector('.hfl-category-current')).not.toBeNull();
        expect(container.querySelector('.hfl-content [data-testid="friend-group"]')).not.toBeNull();
        expect(container.querySelector('.hfl-request-strip')).not.toBeNull();
        expect(container.querySelector('.hfl-search-strip')).not.toBeNull();
        expect(container.querySelector('[data-testid="friends-footer"]')).not.toBeNull();
    });

    it('switches the lower request and search tabs while keeping their contextual controls', () => {
        const { container } = renderOpen();

        fireEvent.click(container.querySelector<HTMLButtonElement>('.hfl-request-strip'));

        expect(container.querySelector('[data-testid="friend-group"]')).toBeNull();
        expect(container.querySelector('[data-testid="friend-requests"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="requests-footer"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="friends-footer"]')).toBeNull();

        fireEvent.click(container.querySelector<HTMLButtonElement>('[data-action="accept-all"]'));
        fireEvent.click(container.querySelector<HTMLButtonElement>('[data-action="dismiss-all"]'));

        expect(requestResponse).toHaveBeenCalledWith(11, true);
        expect(requestResponse).toHaveBeenCalledWith(12, true);
        expect(requestResponse).toHaveBeenCalledWith(11, false);
        expect(requestResponse).toHaveBeenCalledWith(12, false);

        fireEvent.click(container.querySelector<HTMLButtonElement>('.hfl-search-strip'));

        expect(container.querySelector('[data-testid="friend-requests"]')).toBeNull();
        expect(container.querySelector('[data-testid="friend-search"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="requests-footer"]')).toBeNull();
    });

    it('does not reserve a request tab when there are no pending requests', () => {
        vi.mocked(useFriends).mockReturnValue({
            onlineFriends: [],
            offlineFriends: [],
            requests: [],
            requestFriend: vi.fn(),
            requestResponse,
            settings: { categories: [] }
        } as unknown as ReturnType<typeof useFriends>);

        const { container } = renderOpen();

        expect(container.querySelector('.hfl-request-strip')).toBeNull();
        expect(container.querySelector('.hfl-search-strip')).not.toBeNull();
    });

    it('collapses and reopens the selected friends tab', () => {
        const { container } = renderOpen();
        const friendsTab = container.querySelector<HTMLButtonElement>('.hfl-category-current');

        expect(friendsTab).toHaveAttribute('aria-expanded', 'true');

        fireEvent.click(friendsTab);

        expect(container.querySelector('.habbo-friend-list')).toHaveClass('collapsed-mode');
        expect(friendsTab).toHaveAttribute('aria-expanded', 'false');
        expect(container.querySelector('.hfl-content')).toBeNull();
        expect(container.querySelector('[data-testid="friends-footer"]')).toBeNull();
        expect(container.querySelector('.hfl-search-strip')).not.toBeNull();

        fireEvent.click(friendsTab);

        expect(container.querySelector('.habbo-friend-list')).not.toHaveClass('collapsed-mode');
        expect(friendsTab).toHaveAttribute('aria-expanded', 'true');
        expect(container.querySelector('.hfl-content')).not.toBeNull();
        expect(container.querySelector('[data-testid="friends-footer"]')).not.toBeNull();
    });

    it('uses the original fixed geometry instead of stretching the window', () => {
        const css = readFileSync(join(process.cwd(), 'src/components/friends/views/friends-list/FriendsListView.css'), 'utf8');

        expect(css).toMatch(/\.habbo-friend-list\s*\{[\s\S]*?width:\s*230px;/);
        expect(css).toMatch(/grid-template-rows:\s*24px 17px minmax\(0, 1fr\) 41px 17px 33px;/);
        expect(css).toMatch(/\.hfl-footer-border\s*\{[\s\S]*?width:\s*calc\(100% - 10px\);/);
        expect(css).toMatch(/\.habbo-friend-list\.collapsed-mode\s*\{[^}]*height:\s*auto;/s);
    });
});
