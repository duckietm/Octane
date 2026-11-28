/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../../state/handheldStore';

const mocks = vi.hoisted(() => ({
    camera: {
        cameraRoll: [null, null, null, null, null] as unknown[],
        setCameraRoll: vi.fn(),
        selectedPictureIndex: -1,
        setSelectedPictureIndex: vi.fn(),
        activePictureSlotIndex: 0,
        setActivePictureSlotIndex: vi.fn()
    },
    simpleAlert: vi.fn(),
    createLinkEvent: vi.fn(),
    getViewfinderRoomFrame: vi.fn((_canvas: unknown, _width: number, _height: number): unknown => null)
}));

vi.mock('@octane/renderer', async () => {
    const actual = await vi.importActual<Record<string, unknown>>('@octane/renderer');

    // No room canvas in jsdom: the live viewfinder (stream and fallback blit) stays off, only reasoned about.
    return { ...actual, CreateLinkEvent: mocks.createLinkEvent, GetRenderer: () => null };
});

vi.mock('../../../api', () => ({
    blitRoomCanvasToViewfinder: vi.fn(),
    CameraPicture: class {},
    CaptureCameraRenderMessage: vi.fn(),
    GetCameraRenderMode: () => 'upload',
    GetRoomSession: () => ({ roomId: 1 }),
    getViewfinderRoomFrame: mocks.getViewfinderRoomFrame,
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string, params: string[] = [], values: string[] = []) =>
        (params ?? []).reduce((text, param, index) => text.replace(`%${param}%`, values[index]), fallback),
    NotificationAlertType: { WINDOW: 'window' },
    PlaySound: vi.fn(),
    SoundNames: { CAMERA_SHUTTER: 'shutter' }
}));

vi.mock('../../../hooks', () => ({
    useCamera: () => mocks.camera,
    useNotification: () => ({ simpleAlert: mocks.simpleAlert }),
    useRoom: () => ({ roomBackgroundColor: 0 })
}));

vi.mock('../../../common', () => ({
    Column: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
    DraggableWindow: ({ children, handheldScale }: { children: React.ReactNode; handheldScale?: number }) => (
        <div data-scale={String(handheldScale)} data-testid="desktop-window">
            {children}
        </div>
    )
}));

// The window itself is DraggableWindow's business (and tested there); here it is a plain box that shows what it was given.
vi.mock('../../../common/draggable-window', () => ({
    DraggableWindow: ({ children, handheldSheet }: { children: React.ReactNode; handheldSheet?: boolean }) => (
        <div data-sheet={String(!!handheldSheet)} data-testid="window">
            {children}
        </div>
    )
}));

const { CameraWidgetCaptureView } = await import('./CameraWidgetCaptureView');

const picture = (name: string) => ({ imageUrl: `${name}.png`, texture: null, renderRoomMessage: null });
const phone = (orientation: 'portrait' | 'landscape' = 'portrait') => act(() => useHandheldStore.setState({ layout: { active: true, orientation } }));
const renderCapture = (onClose = vi.fn(), onEdit = vi.fn(), onDelete = vi.fn()) => ({
    onClose,
    onEdit,
    onDelete,
    ...render(<CameraWidgetCaptureView onClose={onClose} onDelete={onDelete} onEdit={onEdit} />)
});

beforeEach(() => {
    mocks.camera.cameraRoll = [picture('first'), null, picture('third'), null, null];
    mocks.camera.selectedPictureIndex = -1;
    mocks.camera.activePictureSlotIndex = 1;
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
});

describe('the camera viewfinder on a phone', () => {
    it('is a full-screen layer with a 320 px viewfinder, the roll and the shutter', () => {
        phone();
        const { container } = renderCapture();

        expect(screen.getByTestId('window').dataset.sheet).toBe('true');
        expect(container.querySelector('.octane-camera-capture')).toBeNull();

        const canvas = container.querySelector('.octane-handheld-camera .octane-camera-viewfinder canvas') as HTMLCanvasElement;

        expect(canvas.width).toBe(320);
        expect(canvas.height).toBe(320);
        expect(container.querySelector('.octane-camera-viewfinder__stream')).not.toBeNull();
        expect(container.querySelectorAll('.octane-handheld-camera__slot')).toHaveLength(5);
        expect(screen.getByRole('button', { name: 'Picture 1' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Free slot 2' })).toBeTruthy();
        expect(container.querySelectorAll('.octane-handheld-camera__slot.is-free')).toHaveLength(3);
        expect(container.querySelector('.octane-handheld-camera__slot.is-active')).toBe(container.querySelectorAll('.octane-handheld-camera__slot')[1]);
        // No picture looked at: no edit or delete yet.
        expect(screen.queryByText('camera.editor.button.text')).toBeNull();
        expect(screen.queryByText('camera.delete.button.text')).toBeNull();
    });

    it('captures from the phone viewfinder at 320 x 320 with the same shutter', async () => {
        phone();
        const { container } = renderCapture();
        const canvas = container.querySelector('.octane-handheld-camera canvas');

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'camera.take.photo.button.tooltip' }));
        });

        expect(mocks.getViewfinderRoomFrame).toHaveBeenCalledWith(canvas, 320, 320);
        // jsdom has no room: no frame, the desktop's alert.
        expect(mocks.simpleAlert).toHaveBeenCalledWith('camera.error.creation', 'window', null, null, 'generic.alert.title');
    });

    it('picks a slot of the roll as the desktop does', () => {
        phone();
        const { container } = renderCapture();
        const slots = container.querySelectorAll('.octane-handheld-camera__slot');

        fireEvent.click(slots[2]);
        expect(mocks.camera.setActivePictureSlotIndex).toHaveBeenCalledWith(2);
        expect(mocks.camera.setSelectedPictureIndex).toHaveBeenCalledWith(2);

        fireEvent.click(slots[3]);
        expect(mocks.camera.setActivePictureSlotIndex).toHaveBeenCalledWith(3);
        expect(mocks.camera.setSelectedPictureIndex).toHaveBeenCalledWith(-1);
    });

    it('offers edit and delete for the picture looked at, and the shutter goes back to the viewfinder', async () => {
        mocks.camera.selectedPictureIndex = 2;
        phone('landscape');
        const { container, onEdit, onDelete } = renderCapture();

        expect(container.querySelector('.octane-handheld-camera.is-previewing .octane-camera-viewfinder__photo')?.getAttribute('src')).toBe('third.png');
        expect(container.querySelector('.octane-handheld-camera canvas')).toBeNull();
        expect(container.querySelectorAll('.octane-handheld-camera__slot')[2].getAttribute('aria-pressed')).toBe('true');

        fireEvent.click(screen.getByText('camera.editor.button.text'));
        expect(onEdit).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByText('camera.delete.button.text'));
        expect(onDelete).toHaveBeenCalledTimes(1);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'camera.take.photo.button.tooltip' }));
        });
        expect(mocks.camera.setSelectedPictureIndex).toHaveBeenCalledWith(-1);
        expect(mocks.getViewfinderRoomFrame).not.toHaveBeenCalled();
    });

    it('closes and opens the help page', () => {
        phone();
        const { onClose } = renderCapture();

        fireEvent.click(screen.getByRole('button', { name: 'generic.close' }));
        expect(onClose).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: 'generic.help' }));
        expect(mocks.createLinkEvent).toHaveBeenCalledWith('habbopages/camera');
    });
});

describe('the camera viewfinder on the desktop', () => {
    it('keeps the AIR window', () => {
        const { container } = renderCapture();

        expect(screen.getByTestId('desktop-window').dataset.scale).toBe('1');
        expect(screen.queryByTestId('window')).toBeNull();
        expect(container.querySelector('.octane-handheld-camera')).toBeNull();
        expect(container.querySelector('.octane-camera-capture .octane-camera-viewfinder canvas')).not.toBeNull();
        expect(container.querySelectorAll('.octane-camera-roll__slot')).toHaveLength(5);
    });
});
