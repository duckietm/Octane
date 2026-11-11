/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GroupsContainerView } from './GroupsContainerView';

const createLinkEvent = vi.hoisted(() => vi.fn());

vi.mock('@octane/renderer', async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), CreateLinkEvent: createLinkEvent }));
vi.mock('../groups/views/GroupInformationView', () => ({ GroupInformationView: () => null }));

describe('GroupsContainerView without groups', () => {
    afterEach(() => {
        cleanup();
        createLinkEvent.mockClear();
    });

    it('tells the user they have no group and opens the group rooms', () => {
        render(<GroupsContainerView itsMe groups={[]} onLeaveGroup={() => undefined} />);

        expect(screen.getByText('You are not a member of any group yet.')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'View groups' }));

        expect(createLinkEvent).toHaveBeenCalledWith('navigator/search/hotel_view/group:');
    });

    it('words the caption for another user and shows the bundled group picture', () => {
        const { container } = render(<GroupsContainerView itsMe={false} groups={[]} onLeaveGroup={() => undefined} />);

        expect(screen.getByText('This user is not a member of any group.')).toBeInTheDocument();
        expect(container.querySelector('.octane-extended-profile-no-groups__picture')).toHaveAttribute('src', expect.stringContaining('ext_profile_grouppic'));
    });
});
