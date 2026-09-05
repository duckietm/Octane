import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NavigatorRoomInfoView } from './NavigatorRoomInfoView';

const mocks = vi.hoisted(() => ({
    dispatchUiEvent: vi.fn(),
    permissions: new Map<string, boolean>()
}));

vi.mock('@octane/renderer', async () => {
    const actual = await vi.importActual<typeof import('@octane/renderer')>('@octane/renderer');

    return {
        ...actual,
        GetSessionDataManager: () => ({ userId: 7 }),
        RoomControllerLevel: { GUEST: 0 },
        CreateLinkEvent: vi.fn()
    };
});

vi.mock('../../../api', async () => {
    const actual = await vi.importActual<typeof import('../../../api')>('../../../api');

    return {
        ...actual,
        DispatchUiEvent: mocks.dispatchUiEvent,
        GetConfigurationValue: (key: string) => (key === 'thumbnails.url' ? 'https://images.test/%thumbnail%.png' : ''),
        LocalizeText: (key: string) => key,
        SendMessageComposer: vi.fn(),
        UI_EVENT_DISPATCHER: { addEventListener: vi.fn(), removeEventListener: vi.fn() }
    };
});

vi.mock('../../../hooks', async () => {
    const actual = await vi.importActual<typeof import('../../../hooks')>('../../../hooks');

    return {
        ...actual,
        useHasPermission: (permission: string) => mocks.permissions.get(permission) ?? false,
        useHelp: () => ({ report: vi.fn() }),
        useNavigatorData: () => ({
            navigatorData: {
                currentRoomIsStaffPick: false,
                currentRoomRating: 0,
                enteredGuestRoom: {
                    allInRoomMuted: false,
                    description: '',
                    groupBadgeCode: '',
                    groupName: '',
                    habboGroupId: 0,
                    officialRoomPicRef: '',
                    ownerId: 7,
                    ownerName: 'tester',
                    roomId: 42,
                    roomName: 'Test room',
                    showOwner: true
                },
                homeRoomId: 0
            }
        }),
        useNavigatorFavourite: () => ({ isFavourite: false, toggle: vi.fn() }),
        useRoom: () => ({ roomSession: { controllerLevel: 0, roomId: 42 } })
    };
});

afterEach(() => {
    cleanup();
    mocks.dispatchUiEvent.mockClear();
    mocks.permissions.clear();
});

describe('AIR room thumbnail camera entry point', () => {
    it('does not expose the camera to an owner without the camera permission', () => {
        const { container } = render(<NavigatorRoomInfoView onCloseClick={vi.fn()} />);

        expect(container.querySelector('.icon-camera-small')).not.toBeInTheDocument();
    });

    it('opens the camera for an owner with the camera permission', () => {
        mocks.permissions.set('acc_camera', true);
        render(<NavigatorRoomInfoView onCloseClick={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: 'navigator.thumbnail.camera.title' }));

        expect(mocks.dispatchUiEvent).toHaveBeenCalledTimes(1);
    });
});
