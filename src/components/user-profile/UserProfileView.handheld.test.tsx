/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../state/handheldStore';

const mocks = vi.hoisted(() => ({
    handlers: new Map<unknown, (event: unknown) => void>(),
    send: vi.fn(),
    createLinkEvent: vi.fn(),
    showConfirm: vi.fn(),
    blocked: false
}));

vi.mock('@octane/renderer', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    CreateLinkEvent: mocks.createLinkEvent,
    GetSessionDataManager: () => ({ userId: 7, userName: 'DeployCheck', blockUser: vi.fn(), unblockUser: vi.fn() }),
    UserProfileEvent: class UserProfileEvent {},
    UserCurrentBadgesEvent: class UserCurrentBadgesEvent {},
    RelationshipStatusInfoEvent: class RelationshipStatusInfoEvent {},
    ExtendedProfileChangedMessageEvent: class ExtendedProfileChangedMessageEvent {},
    UserCurrentBadgesComposer: class {},
    UserRelationshipsComposer: class {},
    RequestFriendComposer: class {
        constructor(public name: string) {}
    },
    FindNewFriendsMessageComposer: class {},
    RelationshipStatusEnum: { NONE: 0, HEART: 1, SMILE: 2, BOBBA: 3, RELATIONSHIP_NAMES: ['NONE', 'HEART', 'SMILE', 'BOBBA'] }
}));

vi.mock('../../api', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    applyUserAccent: () => undefined,
    restoreUserAccent: () => undefined,
    CreateLinkEvent: mocks.createLinkEvent,
    ensureBadgeLeaderboardLoaded: () => Promise.resolve({}),
    getBadgesRank: () => 52,
    GetUserProfile: vi.fn(),
    loadProfileCustomizationData: () => Promise.resolve({ banners: [{ id: 1, image: 'reception/nl.png' }], cards: [], borders: [], backgrounds: [], stands: [], overlays: [] }),
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    profileImageUrl: (file: string) => `https://assets/profile-images/${file}`,
    resolveProfileBannerUrl: (image: string) => `https://assets/${image}`,
    SendMessageComposer: mocks.send
}));

vi.mock('../../hooks', () => ({
    useBackgroundTone: () => null,
    useIsUserBlocked: () => mocks.blocked,
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => mocks.handlers.set(type, handler),
    useNotification: () => ({ showConfirm: mocks.showConfirm }),
    useOctaneEvent: () => undefined
}));

vi.mock('../../common', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    LayoutAvatarImageView: ({ figure, direction, style }: { figure: string; direction: number; style?: object }) => (
        <div className="avatar-image" data-direction={direction} data-figure={figure} style={style} />
    ),
    LayoutBadgeImageView: ({ badgeCode }: { badgeCode: string }) => <div className="badge-image" data-code={badgeCode} />
}));
vi.mock('../groups/views/GroupInformationView', () => ({
    GroupInformationView: ({ groupInformation }: { groupInformation: { title: string } }) => <div className="group-details">{groupInformation.title}</div>
}));
vi.mock('./ProfileCustomizeView', () => ({ ProfileCustomizeView: () => <div className="customize-stub" /> }));

import { GroupInformationEvent, RelationshipStatusInfoEvent, UserCurrentBadgesEvent, UserProfileEvent } from '@octane/renderer';
import { UserProfileView } from './UserProfileView';

const profile = (overrides: object = {}) => ({
    id: 7,
    username: 'DeployCheck',
    motto: 'Octane',
    figure: 'hd-180-1.ch-210-66',
    registration: '04/10/2026',
    secondsSinceLastVisit: 120,
    achievementPoints: 8,
    isOnline: true,
    isMyFriend: false,
    requestSent: false,
    isHidden: false,
    friendsCount: 3,
    totalBadges: 5,
    groups: [],
    features: 7,
    bannerId: 1,
    bannerImage: '',
    backgroundImage: '7_background_0123.jpg',
    backgroundStyle: '',
    cardBackgroundId: 0,
    backgroundId: 3,
    standId: 2,
    overlayId: 0,
    borderId: 5,
    accentId: 4,
    avatarDirection: 4,
    avatarOffsetX: 6,
    avatarOffsetY: -3,
    ...overrides
});

const relationships = (userId: number, entries: Record<number, object> = {}) => ({
    userId,
    relationshipStatusMap: { hasKey: (type: number) => type in entries, getValue: (type: number) => entries[type] }
});

const fire = (type: unknown, parser: object) => act(() => mocks.handlers.get(type)?.({ getParser: () => parser }));

const show = async (overrides: object = {}) => {
    const view = render(<UserProfileView />);
    const data = profile(overrides);

    fire(UserProfileEvent, data);
    fire(UserCurrentBadgesEvent, { userId: data.id, badges: ['ACH_1', 'ACH_2'] });
    fire(RelationshipStatusInfoEvent, relationships(data.id, { 1: { friendCount: 2, randomFriendId: 9, randomFriendName: 'Frank', randomFriendFigure: 'hd-1' } }));
    // The banner gallery and the badge rank arrive a tick later.
    await act(async () => undefined);

    return view;
};

const phone = (orientation: 'portrait' | 'landscape' = 'portrait') => act(() => useHandheldStore.setState({ layout: { active: true, orientation } }));

beforeEach(() => phone());

afterEach(() => {
    cleanup();
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
    vi.clearAllMocks();
    mocks.handlers.clear();
    mocks.blocked = false;
});

describe('UserProfileView on a phone, own profile', () => {
    it('is one sheet in the phone look with a profile and a groups tab', async () => {
        await show();

        const sheet = document.querySelector('.octane-handheld-sheet.octane-handheld-profile') as HTMLElement;

        expect(document.querySelector('.octane-extended-profile-window')).toBeNull();
        expect(sheet).not.toBeNull();
        expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['extendedprofile.caption', 'Groups']);
        expect(screen.getByRole('tab', { name: 'extendedprofile.caption' })).toHaveAttribute('aria-selected', 'true');
        expect([...sheet.querySelector('.octane-handheld-profile__columns').children].map((child) => child.className)).toEqual([
            'octane-handheld-profile__main',
            'octane-handheld-profile__card is-friends'
        ]);
    });

    it('keeps our customisation: accent, window background, banner, and the avatar in its picture with its pose', async () => {
        await show();

        const sheet = document.querySelector('.octane-handheld-profile') as HTMLElement;

        // The accent colours the frame, the uploaded background lies behind the cards.
        expect(sheet).toHaveClass('has-profile-accent');
        expect(sheet.style.getPropertyValue('--profile-accent')).toBe('#c9a227');
        expect(screen.getByTestId('profile-backdrop')).toHaveClass('octane-extended-profile-window__content--custom-background');
        expect(screen.getByTestId('profile-backdrop').style.backgroundImage).toContain('7_background_0123.jpg');

        // The banner is the top of the profile card.
        const hero = sheet.querySelector('.octane-handheld-profile__card.is-hero');

        expect(hero).toHaveClass('has-banner');
        expect(hero.firstElementChild).toBe(screen.getByTestId('profile-banner'));
        expect(screen.getByTestId('profile-banner')).toHaveClass('octane-extended-profile__banner--gallery');

        // The picture: background, stand, border, and the avatar turned and moved as the pose tab left it.
        const picture = screen.getByTestId('profile-picture');

        expect(picture.querySelector('.profile-background.background-3')).not.toBeNull();
        expect(picture.querySelector('.profile-stand.stand-2')).not.toBeNull();
        expect(within(picture).getByTestId('profile-border')).toHaveClass('border-5');
        expect(picture.querySelector('.avatar-image')).toHaveAttribute('data-direction', '4');
        expect((picture.querySelector('.avatar-image') as HTMLElement).style.translate).toBe('6px -3px');
    });

    it('shows the own details, the worn badges and the own actions', async () => {
        await show();

        expect(screen.getByText('Octane')).toBeInTheDocument();
        expect(screen.getByText('extendedprofile.me')).toBeInTheDocument();
        expect(document.querySelectorAll('.octane-handheld-profile__badge-slot')).toHaveLength(5);
        expect(document.querySelectorAll('.octane-handheld-profile__badge-slot .badge-image')).toHaveLength(2);
        expect(screen.queryByRole('button', { name: 'extendedprofile.addasafriend' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Block user' })).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'extended.profile.change.looks' }));
        expect(mocks.createLinkEvent).toHaveBeenCalledWith('avatar-editor/show');
        fireEvent.click(screen.getByRole('button', { name: 'extended.profile.change.badges' }));
        expect(mocks.createLinkEvent).toHaveBeenCalledWith('inventory/show/badges');
    });

    it('opens the customiser from the banner and from its button', async () => {
        await show();

        expect(document.querySelector('.customize-stub')).toBeNull();
        fireEvent.click(within(screen.getByTestId('profile-banner')).getByRole('button', { name: 'Customise profile' }));
        expect(document.querySelector('.customize-stub')).not.toBeNull();
        expect(document.querySelector('.octane-handheld-profile__actions')).toHaveTextContent('Customise profile');
    });

    it('lists the relationships and opens the rooms, the badge ranking and the achievements from the three cells', async () => {
        await show();

        const friends = document.querySelector('.octane-handheld-profile__card.is-friends') as HTMLElement;

        expect(friends.querySelectorAll('.octane-extended-profile__relationship')).toHaveLength(3);
        expect(within(friends).getByRole('button', { name: 'Frank' })).toBeInTheDocument();
        fireEvent.click(within(friends).getAllByRole('button', { name: 'extendedprofile.add.friends' })[0]);
        expect(mocks.showConfirm).toHaveBeenCalledTimes(1);

        const cells = document.querySelectorAll('.octane-handheld-profile__cell');

        expect(cells).toHaveLength(3);
        expect(cells[1]).toHaveTextContent('5 (#52)');
        expect(cells[2]).toHaveTextContent('8');
        fireEvent.click(cells[0]);
        expect(mocks.createLinkEvent).toHaveBeenCalledWith('navigator/search/hotel_view/owner:DeployCheck');
        fireEvent.click(cells[1]);
        expect(mocks.createLinkEvent).toHaveBeenCalledWith('badge-leaderboard/show');
        fireEvent.click(cells[2]);
        expect(mocks.createLinkEvent).toHaveBeenCalledWith('achievements/toggle');
    });

    it('shows the groups with our group details on their own tab', async () => {
        await show({ groups: [{ groupId: 31, badgeCode: 'b1', favourite: true }, { groupId: 32, badgeCode: 'b2', favourite: false }] });

        fireEvent.click(screen.getByRole('tab', { name: 'Groups' }));

        expect(document.querySelector('.octane-handheld-profile__columns')).toBeNull();
        expect(document.querySelectorAll('.octane-handheld-profile__card.is-groups .octane-extended-profile-groups__item')).toHaveLength(2);

        fire(GroupInformationEvent, { id: 31, flag: false, title: 'Builders' });
        expect(document.querySelector('.group-details')).toHaveTextContent('Builders');

        // Somebody without groups gets the explanation instead.
        cleanup();
        await show();
        fireEvent.click(screen.getByRole('tab', { name: 'Groups' }));
        expect(screen.getByText('You are not a member of any group yet.')).toBeInTheDocument();
    });

    it('closes from the round button', async () => {
        await show();
        fireEvent.click(document.querySelector('.octane-handheld-sheet__caption-button.is-close'));

        expect(document.querySelector('.octane-handheld-profile')).toBeNull();
    });
});

describe('UserProfileView on a phone, somebody else', () => {
    it('offers the friend request and the block instead of the own actions', async () => {
        await show({ id: 9, username: 'Frank', accentId: 0, backgroundImage: '', features: 0 });

        expect(document.querySelector('.octane-handheld-profile')).not.toHaveClass('has-profile-accent');
        expect(screen.queryByTestId('profile-banner')).toBeNull();
        expect(screen.queryByRole('button', { name: 'extended.profile.change.looks' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Customise profile' })).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'extendedprofile.addasafriend' }));
        expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ name: 'Frank' }));
        expect(screen.getByText('extendedprofile.friendrequestsent')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Block user' }));
        expect(mocks.showConfirm).toHaveBeenCalledTimes(1);
    });

    it('says a friend is a friend, and covers a blocked user', async () => {
        mocks.blocked = true;
        await show({ id: 9, username: 'Frank', isMyFriend: true });

        expect(screen.getByText('extendedprofile.friend')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Unblock user' })).toHaveAttribute('aria-pressed', 'true');
        expect(document.querySelector('.octane-handheld-profile .octane-extended-profile__blocked-overlay')).not.toBeNull();
    });

    it('leaves the counts and the groups out of a hidden profile', async () => {
        await show({ id: 9, username: 'Frank', isHidden: true, friendsCount: -1 });

        expect(document.querySelector('.octane-handheld-profile__card.is-friends')).toHaveTextContent('The full profile of this user is hidden');
        expect(document.querySelector('.octane-extended-profile__relationship')).toBeNull();

        fireEvent.click(screen.getByRole('tab', { name: 'Groups' }));
        expect(document.querySelector('.octane-handheld-profile__card.is-groups')).toHaveTextContent('The full profile of this user is hidden');
    });
});

describe('UserProfileView on the desktop', () => {
    it('keeps the AIR window, with the groups under the profile', async () => {
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
        await show();

        expect(document.querySelector('.octane-handheld-sheet')).toBeNull();
        expect(document.querySelector('.octane-extended-profile-window .octane-extended-profile-window__content--custom-background')).not.toBeNull();
        expect(document.querySelector('.octane-extended-profile__top .octane-extended-profile__avatar-frame')).not.toBeNull();
        expect(document.querySelector('.octane-extended-profile__summary-bar')).not.toBeNull();
        expect(document.querySelector('.octane-extended-profile-window__body--groups .octane-extended-profile-no-groups')).not.toBeNull();
        expect(screen.queryByRole('tab')).toBeNull();
        expect(document.querySelector('.octane-extended-profile__banner-edit')).not.toBeNull();
    });
});
