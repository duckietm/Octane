import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../api', () => ({ GetUserProfile: vi.fn(), LocalizeText: (key: string) => key }));
vi.mock('../object-location/ObjectLocationView', () => ({ ObjectLocationView: (props: { children: ReactNode }) => <div>{props.children}</div> }));

const { FriendRequestDialogView } = await import('./FriendRequestDialogView');

const request = { id: 3, requesterUserId: 7, name: 'Alice' } as never;

describe('FriendRequestDialogView', () => {
    afterEach(() => cleanup());

    it('declines, accepts and hides from their own controls', () => {
        const hide = vi.fn();
        const respond = vi.fn();

        render(<FriendRequestDialogView roomIndex={1} request={request} hideFriendRequest={hide} requestResponse={respond} />);
        fireEvent.click(screen.getByText('widget.friendrequest.decline'));
        fireEvent.click(screen.getByText(/widget\.friendrequest\.accept/));
        fireEvent.click(screen.getByRole('button', { name: 'generic.close' }));

        expect(respond).toHaveBeenNthCalledWith(1, 3, false);
        expect(respond).toHaveBeenNthCalledWith(2, 3, true);
        expect(hide).toHaveBeenCalledWith(7);
    });
});
