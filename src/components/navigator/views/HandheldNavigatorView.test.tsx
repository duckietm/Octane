import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../../api/handheld/handheldLayout';
import { useNavigatorRoomInfoPopupStore, useNavigatorUiStore } from '../../../hooks';
import { useHandheldStore } from '../../../state/handheldStore';

const spies = vi.hoisted(() => ({ createRoomSession: vi.fn(), createLinkEvent: vi.fn() }));

const TEXTS: Record<string, string> = {
    'generic.close': 'Close',
    'generic.help': 'Help',
    'navigator.create.room': 'Create Room',
    'navigator.filter.input.placeholder': 'filter rooms by...',
    'navigator.promote.room': 'Promote room',
    'navigator.random.room': 'Somewhere new',
    'navigator.room.popup.room.info': 'Room info',
    'navigator.toplevelview.hotel_view': 'All Rooms',
    'navigator.toplevelview.myworld_view': 'My World',
    'navigator.toplevelview.official_view': 'Public',
    'navigator.toplevelview.roomads_view': 'Events'
};

vi.mock('@octane/renderer', async () => {
    const actual = await vi.importActual<typeof import('@octane/renderer')>('@octane/renderer');

    return {
        ...actual,
        GetSessionDataManager: () => ({ userId: 7 }),
        NavigatorCategoryListModeComposer: class {},
        NavigatorSearchCloseComposer: class {},
        NavigatorSearchOpenComposer: class {},
        RoomDataParser: { DOORBELL_STATE: 1, INVISIBLE_STATE: 3, OPEN_STATE: 0, PASSWORD_STATE: 2 }
    };
});

vi.mock('../../../api', async () => {
    const actual = await vi.importActual<typeof import('../../../api')>('../../../api');
    const text = (key: string) => TEXTS[key] ?? key;

    return {
        ...actual,
        CreateLinkEvent: spies.createLinkEvent,
        CreateRoomSession: spies.createRoomSession,
        GetConfigurationValue: (key: string, fallback?: unknown) => (key === 'thumbnails.url' ? 'https://thumbnails.test/%thumbnail%.png' : fallback),
        LocalizeText: text,
        SendMessageComposer: vi.fn(),
        localizeWithFallback: (key: string, fallback: string) => TEXTS[key] ?? fallback
    };
});

vi.mock('../../../hooks', async () => {
    const actual = await vi.importActual<typeof import('../../../hooks')>('../../../hooks');

    return {
        ...actual,
        useDoorState: () => ({ setSnapshot: vi.fn() }),
        useNavigatorData: () => ({ topLevelContext: { code: 'official_view' } }),
        usePerkAllowed: () => true
    };
});

import { HandheldNavigatorView, HandheldNavigatorViewProps } from './HandheldNavigatorView';

const room = (roomId: number, roomName: string, ownerName: string, userCount: number, extra: object = {}) =>
    ({ description: '', doorMode: 0, habboGroupId: 0, maxUserCount: 25, officialRoomPicRef: '', ownerId: 3, ownerName, roomId, roomName, showOwner: true, tags: [], userCount, ...extra }) as any;

const searchResult = {
    code: 'official_view',
    data: '',
    results: [
        { code: 'official-root', data: 'Public rooms', action: 0, closed: false, mode: 0, rooms: [room(1, 'Welcome', 'dennis', 0), room(2, 'Picnic', 'frank', 12)] },
        { code: 'popular', data: 'Popular rooms', action: 1, closed: false, mode: 0, rooms: [room(3, 'Rooftop', 'ann', 25, { doorMode: 1 })] }
    ]
} as any;

const tabs = ['official_view', 'hotel_view', 'roomads_view', 'myworld_view'].map((code) => ({ code })) as any;

const handlers = { onCreateRoom: vi.fn(), onPromoteRoom: vi.fn(), onRandomRoom: vi.fn() };

const view = (overrides: Partial<HandheldNavigatorViewProps> = {}) => (
    <HandheldNavigatorView
        activeTabCode="official_view"
        isCreatorOpen={false}
        isFetching={false}
        liftedRooms={[]}
        resultsRef={createRef<HTMLDivElement>()}
        searchResult={searchResult}
        showPromote={false}
        tabs={tabs}
        title="Navigator"
        {...handlers}
        {...overrides}
    />
);

beforeEach(() => {
    act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
    useNavigatorUiStore.setState({ collapsedResultCodes: [], expandedResultCodes: [], resultViewModes: {}, currentTabCode: 'official_view', currentFilter: '' });
});

afterEach(() => {
    cleanup();
    act(() => {
        useHandheldStore.setState({ layout: DESKTOP_LAYOUT });
        useNavigatorRoomInfoPopupStore.getState().hide();
    });
    Object.values(spies).forEach((spy) => spy.mockClear());
    Object.values(handlers).forEach((spy) => spy.mockClear());
});

describe('HandheldNavigatorView', () => {
    it('is one sheet: caption, tabs, then search, rooms and the two buttons in that order', () => {
        const { container } = render(view());
        const sheet = container.querySelector('.octane-handheld-nav');

        expect(container.querySelector('.octane-navigator-air')).toBeNull();
        expect(sheet.firstElementChild).toHaveClass('octane-handheld-nav__caption');
        expect(sheet.children[1].querySelector('.octane-handheld-nav__tabs')).not.toBeNull();
        expect(sheet.lastElementChild).toHaveClass('octane-handheld-nav__body');
        // The same three children serve portrait (stacked) and landscape (search and buttons left of the rooms).
        expect([...container.querySelector('.octane-handheld-nav__body').children].map((child) => child.className.split(' ')[0])).toEqual([
            'octane-handheld-nav__search',
            'octane-handheld-nav__results',
            'octane-handheld-nav__actions'
        ]);
        expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Public', 'All Rooms', 'Events', 'My World']);
        expect(screen.getByRole('tab', { name: 'Public' })).toHaveClass('is-active');
        expect(screen.getByPlaceholderText('filter rooms by...')).toBeInTheDocument();
    });

    it('enters a room on a tap on its card and opens the room info from the i button only', () => {
        render(view());

        const cards = document.querySelectorAll('.octane-handheld-room');

        expect(cards).toHaveLength(3);
        expect(within(cards[0] as HTMLElement).getByText('dennis')).toBeInTheDocument();

        fireEvent.click(within(cards[1] as HTMLElement).getByRole('button', { name: 'Room info' }));

        expect(spies.createRoomSession).not.toHaveBeenCalled();
        expect(useNavigatorRoomInfoPopupStore.getState()).toMatchObject({ visible: true, hovered: true, room: { roomId: 2 } });

        fireEvent.click(screen.getByRole('button', { name: 'Picnic' }));

        expect(spies.createRoomSession).toHaveBeenCalledWith(2);
    });

    it('switches a block between room cards and the compact list, and keeps the more-rooms button', () => {
        render(view());

        expect(document.querySelectorAll('.octane-handheld-room__thumb')).toHaveLength(3);

        fireEvent.click(screen.getAllByRole('button', { name: 'Show rooms as a list' })[0]);

        expect(useNavigatorUiStore.getState().resultViewModes).toEqual({ 'official-root': 0 });
        expect(document.querySelectorAll('.octane-handheld-room.is-compact')).toHaveLength(2);
        expect(document.querySelectorAll('.octane-handheld-room__thumb')).toHaveLength(1);
        expect(screen.getByRole('button', { name: 'Show rooms as tiles' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'navigator.more.rooms' })).toBeInTheDocument();
    });

    it('runs the caption, tab and bottom buttons', () => {
        useNavigatorUiStore.setState({ isVisible: true });
        render(view());

        fireEvent.click(screen.getByRole('button', { name: 'Create Room' }));
        fireEvent.click(screen.getByRole('button', { name: 'Somewhere new' }));

        expect(handlers.onCreateRoom).toHaveBeenCalledTimes(1);
        expect(handlers.onRandomRoom).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('button', { name: 'Promote room' })).toBeNull();

        fireEvent.click(screen.getByRole('tab', { name: 'My World' }));

        expect(useNavigatorUiStore.getState().currentTabCode).toBe('myworld_view');

        fireEvent.click(screen.getByRole('button', { name: 'Help' }));

        expect(spies.createLinkEvent).toHaveBeenCalledWith('habbopages/navigator');

        fireEvent.click(screen.getByRole('button', { name: 'Close' }));

        expect(useNavigatorUiStore.getState().isVisible).toBe(false);
    });

    it('offers the room promotion instead of somewhere new where the desktop navigator does', () => {
        render(view({ showPromote: true }));

        fireEvent.click(screen.getByRole('button', { name: 'Promote room' }));

        expect(handlers.onPromoteRoom).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('button', { name: 'Somewhere new' })).toBeNull();
    });
});
