/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MessengerFriend } from '../../../../../api';
import { useFriends } from '../../../../../hooks';
import { FriendsListGroupItemView } from './FriendsListGroupItemView';

vi.mock('../../../../../hooks', () => ({
    useFriends: vi.fn()
}));

vi.mock('../../../../../common/layout/avatarImageCrop', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../common/layout/avatarImageCrop')>()),
    cropTransparentImageUrl: vi.fn(async () => 'data:image/png;base64,cropped')
}));

const makeFriend = () => {
    const friend = new MessengerFriend();

    friend.id = 42;
    friend.name = 'tester1';
    friend.figure = 'hd-180-1.ch-210-66.lg-270-82.sh-290-80';
    friend.gender = 0;
    friend.online = true;

    return friend;
};

describe('Friends list relationship menu', () => {
    const updateRelationship = vi.fn();

    beforeEach(() => {
        updateRelationship.mockClear();
        vi.mocked(useFriends).mockReturnValue({ followFriend: vi.fn(), updateRelationship } as unknown as ReturnType<typeof useFriends>);
    });

    afterEach(cleanup);

    it('opens under the relationship button, applies a pick without selecting the row, and closes', async () => {
        const selectFriend = vi.fn();
        const friend = makeFriend();
        const { container } = render(<FriendsListGroupItemView friend={friend} selected={false} selectFriend={selectFriend} />);

        expect(document.querySelector('.hfl-relationship-menu')).toBeNull();

        fireEvent.click(container.querySelector('.hfl-relationship') as HTMLElement);

        const menu = await waitFor(() => {
            const found = document.querySelector('.hfl-relationship-menu');

            expect(found).not.toBeNull();

            return found as HTMLElement;
        });

        fireEvent.click(menu.querySelector('button.heart') as HTMLElement);

        expect(updateRelationship).toHaveBeenCalledWith(friend, MessengerFriend.RELATIONSHIP_HEART);
        expect(selectFriend).not.toHaveBeenCalled();
        await waitFor(() => expect(document.querySelector('.hfl-relationship-menu')).toBeNull());
    });

    it('closes on Escape and on a press outside', async () => {
        const { container } = render(<FriendsListGroupItemView friend={makeFriend()} selected={false} selectFriend={vi.fn()} />);
        const trigger = container.querySelector('.hfl-relationship') as HTMLElement;

        fireEvent.click(trigger);
        await waitFor(() => expect(document.querySelector('.hfl-relationship-menu')).not.toBeNull());

        fireEvent.keyDown(screen.getAllByRole('button', { hidden: true })[0], { key: 'Escape' });
        await waitFor(() => expect(document.querySelector('.hfl-relationship-menu')).toBeNull());

        fireEvent.click(trigger);
        await waitFor(() => expect(document.querySelector('.hfl-relationship-menu')).not.toBeNull());

        fireEvent.pointerDown(document.body);
        fireEvent.mouseDown(document.body);
        fireEvent.click(document.body);
        await waitFor(() => expect(document.querySelector('.hfl-relationship-menu')).toBeNull());
    });
});
