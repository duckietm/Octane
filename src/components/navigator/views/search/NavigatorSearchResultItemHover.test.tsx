import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNavigatorRoomInfoPopupStore } from '../../../../hooks';
import { NavigatorRoomInfoPopupView } from './NavigatorRoomInfoPopupView';
import { NavigatorSearchResultItemView } from './NavigatorSearchResultItemView';

vi.mock('@octane/renderer', async () => {
    const actual = await vi.importActual<typeof import('@octane/renderer')>('@octane/renderer');

    return {
        ...actual,
        GetSessionDataManager: () => ({ userId: 7 }),
        RoomDataParser: { DOORBELL_STATE: 1, INVISIBLE_STATE: 3, OPEN_STATE: 0, PASSWORD_STATE: 2 }
    };
});

vi.mock('../../../../api', async () => {
    const actual = await vi.importActual<typeof import('../../../../api')>('../../../../api');

    return {
        ...actual,
        GetConfigurationValue: (key: string, fallback?: unknown) => {
            if (key === 'thumbnails.url') return 'https://thumbnails.test/%thumbnail%.png';
            return fallback;
        },
        LocalizeText: (key: string) => key
    };
});

vi.mock('../../../../hooks', async () => {
    const actual = await vi.importActual<typeof import('../../../../hooks')>('../../../../hooks');

    return {
        ...actual,
        useDoorState: () => ({ setSnapshot: vi.fn() }),
        useHelp: () => ({ report: vi.fn() }),
        useNavigatorData: () => ({ navigatorData: { homeRoomId: 0 } }),
        useNavigatorFavourite: () => ({ isFavourite: false, toggle: vi.fn() })
    };
});

const room = {
    description: 'Room description',
    doorMode: 0,
    groupBadgeCode: '',
    groupName: '',
    habboGroupId: 0,
    maxUserCount: 50,
    officialRoomPicRef: '',
    ownerId: 7,
    ownerName: 'tester',
    roomAdExpiresInMin: 0,
    roomId: 42,
    roomName: 'Hover room',
    showOwner: true,
    tags: [],
    tradeMode: 0,
    userCount: 3
} as any;

const Harness = () => (
    <>
        <NavigatorSearchResultItemView roomData={room} />
        <NavigatorRoomInfoPopupView />
    </>
);

afterEach(() => {
    vi.useRealTimers();
    cleanup();
    useNavigatorRoomInfoPopupStore.getState().hide();
});

describe('AIR navigator room information hover', () => {
    it('does not open the room information popup on the first mouse hover', () => {
        render(<Harness />);

        fireEvent.mouseEnter(screen.getByRole('button', { name: 'Hover room' }));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('opens the room information popup on the info-region click', () => {
        render(<Harness />);

        fireEvent.click(screen.getByRole('button', { name: 'navigator.room.popup.room.info' }));

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Room description')).toBeInTheDocument();
    });

    it('closes the room information popup after the AIR 4s leave timeout', () => {
        vi.useFakeTimers();
        render(<Harness />);
        fireEvent.click(screen.getByRole('button', { name: 'navigator.room.popup.room.info' }));

        act(() => vi.advanceTimersByTime(4100));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('keeps the popup open while the pointer stays on the bubble after the timer', () => {
        vi.useFakeTimers();
        render(<Harness />);
        fireEvent.click(screen.getByRole('button', { name: 'navigator.room.popup.room.info' }));
        const dialog = screen.getByRole('dialog');

        fireEvent.mouseEnter(dialog);
        act(() => vi.advanceTimersByTime(4100));
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        fireEvent.mouseLeave(dialog);
        act(() => vi.advanceTimersByTime(300));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
