import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RoomWidgetThumbnailEvent } from '../../../../events';
import { RoomThumbnailWidgetView } from './RoomThumbnailWidgetView';

const mocks = vi.hoisted(() => ({
    messageHandler: null as null | ((event: any) => void),
    refreshRoomThumbnail: vi.fn(),
    saveTextureAsScreenshot: vi.fn(() => Promise.resolve()),
    sendMessageComposer: vi.fn(),
    simpleAlert: vi.fn(),
    uiHandler: null as null | ((event: { type: string }) => void)
}));

vi.mock('@octane/renderer', async () => {
    const actual = await vi.importActual<typeof import('@octane/renderer')>('@octane/renderer');

    return {
        ...actual,
        GetRoomEngine: () => ({ saveTextureAsScreenshot: mocks.saveTextureAsScreenshot })
    };
});

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    RefreshRoomThumbnail: mocks.refreshRoomThumbnail,
    SendMessageComposer: mocks.sendMessageComposer
}));

vi.mock('../../../../common', () => ({
    LayoutMiniCameraView: ({ isSaving, onClose, textureReceiver }: any) => (
        <div role="dialog" aria-label="room-thumbnail-camera">
            <button type="button" disabled={isSaving} onClick={() => textureReceiver({ id: 'texture' })}>
                navigator.thumbeditor.save
            </button>
            <button type="button" disabled={isSaving} onClick={onClose}>
                cancel
            </button>
        </div>
    )
}));

vi.mock('../../../../hooks', () => ({
    useMessageEvent: (_eventType: unknown, handler: (event: any) => void) => {
        mocks.messageHandler = handler;
    },
    useNotification: () => ({ simpleAlert: mocks.simpleAlert }),
    useRoom: () => ({ roomSession: { roomId: 42 } }),
    useUiEvent: (_types: string[], handler: (event: { type: string }) => void) => {
        mocks.uiHandler = handler;
    }
}));

afterEach(() => {
    vi.useRealTimers();
    cleanup();
    mocks.messageHandler = null;
    mocks.refreshRoomThumbnail.mockClear();
    mocks.saveTextureAsScreenshot.mockClear();
    mocks.sendMessageComposer.mockClear();
    mocks.simpleAlert.mockClear();
    mocks.uiHandler = null;
});

const openCamera = () => {
    render(<RoomThumbnailWidgetView />);
    act(() => mocks.uiHandler?.({ type: RoomWidgetThumbnailEvent.SHOW_THUMBNAIL }));
};

describe('AIR room thumbnail server handshake', () => {
    it('keeps the camera open and locked until the server acknowledges the upload', async () => {
        openCamera();

        fireEvent.click(screen.getByRole('button', { name: 'navigator.thumbeditor.save' }));

        await waitFor(() => expect(screen.getByRole('dialog', { name: 'room-thumbnail-camera' })).toBeInTheDocument());
        expect(screen.getByRole('button', { name: 'navigator.thumbeditor.save' })).toBeDisabled();
    });

    it('closes and refreshes the saved room thumbnail after server success', async () => {
        openCamera();
        fireEvent.click(screen.getByRole('button', { name: 'navigator.thumbeditor.save' }));
        await waitFor(() => expect(mocks.saveTextureAsScreenshot).toHaveBeenCalledTimes(1));

        act(() => mocks.messageHandler?.({ getParser: () => ({ isRenderLimitHit: false, ok: true }) }));

        expect(screen.queryByRole('dialog', { name: 'room-thumbnail-camera' })).not.toBeInTheDocument();
        expect(mocks.refreshRoomThumbnail).toHaveBeenCalledWith(42);
        expect(mocks.simpleAlert).toHaveBeenCalledWith('navigator.thumbnail.camera.success');
    });

    it('keeps the camera usable when the server rejects the thumbnail', async () => {
        openCamera();
        fireEvent.click(screen.getByRole('button', { name: 'navigator.thumbeditor.save' }));
        await waitFor(() => expect(mocks.saveTextureAsScreenshot).toHaveBeenCalledTimes(1));

        act(() => mocks.messageHandler?.({ getParser: () => ({ isRenderLimitHit: true, ok: false }) }));

        expect(screen.getByRole('dialog', { name: 'room-thumbnail-camera' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'navigator.thumbeditor.save' })).toBeEnabled();
        expect(mocks.simpleAlert).toHaveBeenCalledWith('camera.render.count.info');
    });

    it('unlocks the camera if the server never sends a thumbnail status', async () => {
        vi.useFakeTimers();
        openCamera();
        fireEvent.click(screen.getByRole('button', { name: 'navigator.thumbeditor.save' }));
        await act(async () => Promise.resolve());

        act(() => vi.advanceTimersByTime(10_000));

        expect(screen.getByRole('button', { name: 'navigator.thumbeditor.save' })).toBeEnabled();
        expect(mocks.simpleAlert).toHaveBeenCalledWith('camera.error.creation');
    });
});
