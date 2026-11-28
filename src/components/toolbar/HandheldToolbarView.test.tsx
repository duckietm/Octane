import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useHandheldHudStore } from '../../state/handheldHudStore';
import { HandheldToolbarExtra, HandheldToolbarView } from './HandheldToolbarView';
import { ToolbarMeView } from './ToolbarMeView';

const mocks = vi.hoisted(() => ({
    links: [] as string[],
    selectRoomObject: vi.fn()
}));

afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    act(() => useHandheldHudStore.setState({ chatOpen: false }));
    vi.clearAllMocks();
    mocks.links.length = 0;
});

vi.mock('@octane/renderer', () => ({
    CreateLinkEvent: (link: string) => mocks.links.push(link),
    GetRoomEngine: () => ({ selectRoomObject: mocks.selectRoomObject }),
    GetSessionDataManager: () => ({ userId: 1 }),
    RoomObjectCategory: { UNIT: 100 }
}));

vi.mock('../../api', () => ({
    DispatchUiEvent: vi.fn(),
    GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
    GetRoomSession: () => ({ roomId: 7, ownRoomIndex: 3 }),
    GetUserProfile: vi.fn(),
    getRewardTrackMenuTarget: () => null,
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

vi.mock('../../common', async () => {
    const { LayoutItemCountView } = await import('../../common/layout/LayoutItemCountView');
    const { Flex } = await import('../../common/Flex');

    return { Flex, LayoutItemCountView, LayoutAvatarImageView: ({ figure }: { figure: string }) => <i data-testid="head" data-figure={figure} /> };
});

vi.mock('../../events', () => ({
    GuideToolEvent: class {
        static TOGGLE_GUIDE_TOOL = 'toggle';
    }
}));

vi.mock('../../hooks', () => ({
    useDailyTasks: () => ({ unseenCount: 0 }),
    useRewardTracks: () => ({ tracks: [] })
}));

vi.mock('../../hooks/collectibles/useCollectibles', () => ({ isCollectiblesEnabled: () => false }));

vi.mock('../../state/groupForumUnreadStore', () => ({
    useGroupForumUnreadStore: (select: (state: { unreadForumsCount: number }) => number) => select({ unreadForumsCount: 0 })
}));

vi.mock('./ToolbarNewAdditionsLabel', () => ({ ToolbarNewAdditionsLabel: () => null }));

const camera = vi.fn();
const modTools = vi.fn();

const EXTRAS: HandheldToolbarExtra[] = [
    { key: 'camera', icon: 'camera', label: 'Camera', onClick: camera },
    { key: 'mod_tools', icon: 'modtools', label: 'Mod tools', count: 4, onClick: modTools }
];

const dock = (overrides: Partial<ComponentProps<typeof HandheldToolbarView>> = {}) => {
    const props: ComponentProps<typeof HandheldToolbarView> = {
        isInRoom: true,
        hasRoomChat: true,
        figure: 'hd-180-1',
        inventoryCount: 0,
        meCount: 0,
        friendRequestCount: 0,
        messengerUnreadCount: 0,
        isMeOpen: false,
        setMeOpen: vi.fn(),
        unseenAchievementCount: 0,
        useGuideTool: false,
        extras: EXTRAS,
        onMessenger: vi.fn(),
        ...overrides
    };

    render(<HandheldToolbarView {...props} />);

    return props;
};

const buttonNames = () => within(screen.getByRole('toolbar')).getAllByRole('button').map((button) => button.getAttribute('data-dock'));
const countOf = (name: string) => screen.getByRole('toolbar').querySelector(`[data-dock="${name}"] .octane-handheld-dock__count`)?.textContent ?? null;

describe('HandheldToolbarView (phone dock)', () => {
    it('shows one row of six icons in a room, the room chat last, without labels', () => {
        dock();

        expect(buttonNames()).toEqual(['navigator', 'catalog', 'inventory', 'me', 'friends', 'chat']);
        expect(screen.getByRole('toolbar').textContent).toBe('');
        expect(screen.getByTestId('head').getAttribute('data-figure')).toBe('hd-180-1');
        expect(screen.getByRole('toolbar').querySelector('.icon-rooms, .icon-catalog, .icon-inventory, .icon-friendall')).not.toBeNull();
        expect(screen.getByRole('button', { name: 'Chat' }).querySelector('svg.octane-handheld-dock__chat-art')).not.toBeNull();
    });

    it('has no chat button in the hotel view: the last cell is the messenger there, and the inventory is left out', () => {
        dock({ isInRoom: false, hasRoomChat: false });

        expect(buttonNames()).toEqual(['navigator', 'catalog', 'me', 'friends', 'messenger']);
        expect(screen.queryByRole('button', { name: 'Chat' })).toBeNull();
    });

    it('keeps the icons in one pill and stands the last cell apart as a round button of its own', () => {
        dock();

        const pill = screen.getByRole('toolbar').querySelector('.octane-handheld-dock__pill');
        const chat = screen.getByRole('button', { name: 'Chat' });

        expect(Array.from(pill.children).map((cell) => cell.getAttribute('data-dock'))).toEqual(['navigator', 'catalog', 'inventory', 'me', 'friends']);
        expect(chat.parentElement).toBe(screen.getByRole('toolbar'));
        expect(chat).toHaveClass('is-lead');
        expect(pill.querySelector('.is-lead')).toBeNull();
        // The head says whether its menu is open, which the stylesheet lights its ring from.
        expect(screen.getByRole('button', { name: 'Me' })).toHaveAttribute('aria-expanded', 'false');

        cleanup();
        dock({ hasRoomChat: false, isMeOpen: true });

        expect(screen.getByRole('button', { name: 'Messenger' })).toHaveClass('is-lead');
        expect(screen.getByRole('button', { name: 'Me' })).toHaveAttribute('aria-expanded', 'true');
    });

    it('keeps the messenger in the last cell for a spectator, who cannot write in the room', () => {
        dock({ hasRoomChat: false });

        expect(buttonNames()).toEqual(['navigator', 'catalog', 'inventory', 'me', 'friends', 'messenger']);
    });

    it('opens the chat composer from the chat button, straight from the tap', () => {
        document.body.insertAdjacentHTML('beforeend', '<div id="toolbar-chat-input-container"><input type="text" /></div>');

        const props = dock();

        fireEvent.click(screen.getByRole('button', { name: 'Chat' }));

        expect(useHandheldHudStore.getState().chatOpen).toBe(true);
        expect(document.activeElement).toBe(document.querySelector('#toolbar-chat-input-container input'));
        expect(props.setMeOpen).toHaveBeenCalledWith(false);
    });

    it('opens nothing while no composer is mounted', () => {
        dock();

        fireEvent.click(screen.getByRole('button', { name: 'Chat' }));

        expect(useHandheldHudStore.getState().chatOpen).toBe(false);
    });

    it('is not drawn while the chat composer is open, and comes back when it closes', () => {
        const props = dock({ composerOpen: true });

        expect(screen.queryByRole('toolbar')).toBeNull();
        expect(document.querySelector('.octane-handheld-dock')).toBeNull();

        cleanup();
        render(<HandheldToolbarView {...props} composerOpen={false} />);

        expect(screen.getByRole('toolbar')).not.toBeNull();
    });

    it('puts a red count on the inventory, the head and the friends; unread messages count on the friends in a room', () => {
        dock({ inventoryCount: 3, meCount: 2, friendRequestCount: 6, messengerUnreadCount: 1 });

        expect(countOf('inventory')).toBe('3');
        expect(countOf('me')).toBe('2');
        expect(countOf('friends')).toBe('7');
        expect(countOf('navigator')).toBeNull();
        expect(countOf('catalog')).toBeNull();
        expect(countOf('chat')).toBeNull();
    });

    it('counts unread messages on the messenger itself in the hotel view', () => {
        dock({ isInRoom: false, hasRoomChat: false, friendRequestCount: 6, messengerUnreadCount: 1 });

        expect(countOf('friends')).toBe('6');
        expect(countOf('messenger')).toBe('1');
    });

    it('keeps the messenger reachable in a room: an entry of the Me popup with its unread count', () => {
        const messenger = vi.fn();
        const props = dock({ isMeOpen: true, extras: [{ key: 'messenger', icon: 'message', label: 'Messenger', count: 3, onClick: messenger }, ...EXTRAS] });
        const entry = within(document.querySelector<HTMLElement>('.octane-handheld-dock__me')).getByRole('button', { name: 'Messenger' });

        expect(entry.querySelector('.octane-toolbar-count').textContent).toBe('3');
        expect(entry.querySelector('.octane-icon.icon-message')).not.toBeNull();

        fireEvent.click(entry);

        expect(messenger).toHaveBeenCalledTimes(1);
        expect(props.setMeOpen).toHaveBeenCalledWith(false);
    });

    it('shows no count while nothing is waiting', () => {
        dock();

        expect(screen.getByRole('toolbar').querySelector('.octane-handheld-dock__count')).toBeNull();
    });

    it('opens what each icon stands for and folds the room tools', () => {
        const props = dock({ hasRoomChat: false });

        fireEvent.click(screen.getByRole('button', { name: 'Navigator' }));
        fireEvent.click(screen.getByRole('button', { name: 'Catalogue' }));
        fireEvent.click(screen.getByRole('button', { name: 'Inventory' }));
        fireEvent.click(screen.getByRole('button', { name: 'Friends' }));
        fireEvent.click(screen.getByRole('button', { name: 'Messenger' }));

        expect(mocks.links.filter((link) => link !== 'room-tools/collapse')).toEqual(['navigator/toggle', 'catalog/toggle/normal', 'inventory/toggle', 'friends/toggle']);
        expect(mocks.links.filter((link) => link === 'room-tools/collapse')).toHaveLength(5);
        expect(props.onMessenger).toHaveBeenCalledTimes(1);
    });

    it('toggles the Me popup from the head', () => {
        const props = dock();

        expect(document.querySelector('.octane-handheld-dock__me')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Me' }));

        const toggle = vi.mocked(props.setMeOpen).mock.calls[0][0] as (value: boolean) => boolean;

        expect(toggle(false)).toBe(true);
        expect(toggle(true)).toBe(false);
    });

    it('lists the Me entries and the other desktop toolbar entries in the popup', () => {
        dock({ isMeOpen: true });

        const popup = document.querySelector<HTMLElement>('.octane-handheld-dock__me');
        const names = Array.from(popup.querySelectorAll('.octane-toolbar-me-item')).map((item) => item.getAttribute('data-name'));

        expect(names).toEqual(expect.arrayContaining(['achievements', 'profile', 'clothes', 'settings', 'forums', 'camera', 'mod_tools']));
        expect(names.indexOf('forums')).toBeLessThan(names.indexOf('camera'));
        expect(within(popup).getByRole('button', { name: 'Mod tools' }).querySelector('.octane-toolbar-count').textContent).toBe('4');
        expect(within(popup).getByRole('button', { name: 'Camera' }).querySelector('.octane-toolbar-count')).toBeNull();
        expect(within(popup).getByRole('button', { name: 'Camera' }).querySelector('.octane-icon.icon-camera')).not.toBeNull();
    });

    it('runs an entry and closes the popup with the same tap', () => {
        const props = dock({ isMeOpen: true });
        const popup = document.querySelector<HTMLElement>('.octane-handheld-dock__me');

        fireEvent.click(within(popup).getByRole('button', { name: 'Camera' }));

        expect(camera).toHaveBeenCalledTimes(1);
        expect(props.setMeOpen).toHaveBeenCalledWith(false);

        vi.mocked(props.setMeOpen).mockClear();
        fireEvent.click(within(popup).getByRole('button', { name: 'Achievements' }));

        expect(mocks.links).toContain('achievements/toggle');
        expect(props.setMeOpen).toHaveBeenCalledWith(false);
    });

    it('does not select the own avatar from the phone popup, which would open the info sheet', () => {
        dock({ isMeOpen: true });

        expect(mocks.selectRoomObject).not.toHaveBeenCalled();
    });

    it('keeps the desktop Me menu selecting the own avatar', () => {
        render(<ToolbarMeView setMeExpanded={vi.fn()} unseenAchievementCount={0} useGuideTool={false} />);

        expect(mocks.selectRoomObject).toHaveBeenCalledWith(7, 3, 100);
    });
});
