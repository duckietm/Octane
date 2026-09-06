import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CameraWidgetView } from './CameraWidgetView';

const mocks = vi.hoisted(() => ({
    linkTracker: null as null | { linkReceived: (url: string) => void },
    photoReady: vi.fn(() => true),
    simpleAlert: vi.fn(),
    zoomHandlers: [] as ((event: { roomId: number }) => void)[]
}));

vi.mock('@octane/renderer', async () => {
    const actual = await vi.importActual<typeof import('@octane/renderer')>('@octane/renderer');

    return {
        ...actual,
        AddLinkEventTracker: (tracker: { linkReceived: (url: string) => void }) => {
            mocks.linkTracker = tracker;
        },
        RemoveLinkEventTracker: () => undefined,
        RoomEngineEvent: { ROOM_ZOOMED: 'REE_ROOM_ZOOMED' },
        RoomSessionEvent: { ENDED: 'RSE_ENDED' }
    };
});

vi.mock('../../api', () => ({
    GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
    LocalizeText: (key: string) => key
}));

vi.mock('../../hooks', () => ({
    useAchievements: () => ({ achievementCategories: [] }),
    useCamera: () => ({ setSelectedPictureIndex: () => undefined, setActivePictureSlotIndex: () => undefined, setCameraRoll: () => undefined, cameraRoll: [] }),
    useOctaneEvent: (type: string, handler: (event: { roomId: number }) => void) => {
        if (type === 'REE_ROOM_ZOOMED') mocks.zoomHandlers.push(handler);
    },
    useNotification: () => ({ simpleAlert: mocks.simpleAlert }),
    useRoom: () => ({ roomSession: { roomId: 42 } })
}));

vi.mock('../room/widgets/room-tools/roomZoom.helpers', () => ({
    isRoomZoomPhotoReady: mocks.photoReady
}));

vi.mock('./CameraAirUtilities', () => ({ getCameraAchievementLevel: () => 1 }));
vi.mock('./views/CameraWidgetCaptureView', () => ({ CameraWidgetCaptureView: () => <div role="dialog" aria-label="camera-capture" /> }));
vi.mock('./views/CameraWidgetCheckoutView', () => ({ CameraWidgetCheckoutView: () => null }));
vi.mock('./views/editor/CameraWidgetEditorView', () => ({ CameraWidgetEditorView: () => null }));

afterEach(() => {
    cleanup();
    mocks.linkTracker = null;
    mocks.zoomHandlers.length = 0;
    mocks.photoReady.mockReset();
    mocks.photoReady.mockReturnValue(true);
    mocks.simpleAlert.mockClear();
});

const openCamera = () => act(() => mocks.linkTracker?.linkReceived('camera/show'));

describe('AIR camera zoom gate', () => {
    it('opens the viewfinder when the room is photo ready', () => {
        render(<CameraWidgetView />);
        openCamera();

        expect(mocks.photoReady).toHaveBeenCalledWith(42);
        expect(screen.getByRole('dialog', { name: 'camera-capture' })).toBeInTheDocument();
        expect(mocks.simpleAlert).not.toHaveBeenCalled();
    });

    it('refuses to open while zoomed out or flipped, with the official alert', () => {
        mocks.photoReady.mockReturnValue(false);

        render(<CameraWidgetView />);
        openCamera();

        expect(screen.queryByRole('dialog', { name: 'camera-capture' })).not.toBeInTheDocument();
        expect(mocks.simpleAlert).toHaveBeenCalledWith('camera.zoom.missing.body', null, null, null, 'camera.zoom.missing.header');
    });

    it('closes the viewfinder when the room zooms out of the allowed range', () => {
        render(<CameraWidgetView />);
        openCamera();

        act(() => mocks.zoomHandlers.forEach((handler) => handler({ roomId: 42 })));

        expect(screen.getByRole('dialog', { name: 'camera-capture' })).toBeInTheDocument();

        mocks.photoReady.mockReturnValue(false);
        act(() => mocks.zoomHandlers.forEach((handler) => handler({ roomId: 42 })));

        expect(screen.queryByRole('dialog', { name: 'camera-capture' })).not.toBeInTheDocument();
    });
});
