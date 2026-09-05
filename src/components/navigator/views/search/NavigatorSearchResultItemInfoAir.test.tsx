import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNavigatorRoomInfoPopupStore } from '../../../../hooks';
import { NavigatorRoomInfoPopupView } from './NavigatorRoomInfoPopupView';

vi.mock('@octane/renderer', async () => {
    const actual = await vi.importActual<typeof import('@octane/renderer')>('@octane/renderer');

    return {
        ...actual,
        GetSessionDataManager: () => ({ userId: 7 }),
        RoomSettingsComposer: class {},
        UpdateHomeRoomMessageComposer: class {}
    };
});

vi.mock('../../../../hooks', async () => {
    const actual = await vi.importActual<typeof import('../../../../hooks')>('../../../../hooks');

    return {
        ...actual,
        useHelp: () => ({ report: vi.fn() }),
        useNavigatorData: () => ({ navigatorData: { homeRoomId: 0 } }),
        useNavigatorFavourite: () => ({ isFavourite: false, toggle: vi.fn() })
    };
});

vi.mock('../../../../api', async () => {
    const actual = await vi.importActual<typeof import('../../../../api')>('../../../../api');

    return {
        ...actual,
        LocalizeText: (key: string) => key
    };
});

const room = {
    roomId: 42,
    roomName: 'lol',
    description: '',
    ownerId: 7,
    ownerName: 'fornela',
    showOwner: true,
    officialRoomPicRef: '/room.png',
    habboGroupId: 0,
    groupBadgeCode: '',
    groupName: '',
    doorMode: 0,
    tradeMode: 0,
    maxUserCount: 50,
    userCount: 0,
    tags: [],
    ranking: 0,
    roomAdExpiresInMin: 0
} as any;

const renderPopup = (roomData = room) => {
    useNavigatorRoomInfoPopupStore.setState({
        room: roomData,
        visible: true,
        x: 10,
        y: 20,
        hovered: false
    });
    return render(<NavigatorRoomInfoPopupView />);
};

afterEach(() => {
    cleanup();
    useNavigatorRoomInfoPopupStore.getState().hide();
});

describe('AIR navigator room popover', () => {
    it('keeps the official 374px bubble width so metadata and actions do not collapse', () => {
        renderPopup();

        expect(screen.getByRole('dialog')).toHaveClass('octane-navigator-air__room-bubble');
        expect(screen.getByRole('dialog')).toHaveStyle({ width: '374px' });
    });

    it('hides the owner link when AIR marks the room owner as private', () => {
        renderPopup({ ...room, showOwner: false });

        expect(screen.queryByText('fornela')).not.toBeInTheDocument();
    });

    it('shows AIR room-ad details only while the room event is active', () => {
        renderPopup({ ...room, roomAdExpiresInMin: 15, roomAdName: 'Pizza party', roomAdDescription: 'Come join us' });

        expect(screen.getByText(/Pizza party/)).toBeInTheDocument();
        expect(screen.getByText(/Come join us/)).toBeInTheDocument();
    });

    it('uses all three AIR room trading levels', () => {
        const { rerender } = renderPopup({ ...room, tradeMode: 1 });

        expect(screen.getByText('trading.mode.controller')).toBeInTheDocument();

        useNavigatorRoomInfoPopupStore.setState({ room: { ...room, tradeMode: 2 } });
        rerender(<NavigatorRoomInfoPopupView />);

        expect(screen.getByText('trading.mode.free')).toBeInTheDocument();
    });
});
