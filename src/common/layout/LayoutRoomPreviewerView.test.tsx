import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LayoutRoomPreviewerView } from './LayoutRoomPreviewerView';

const previewMocks = vi.hoisted(() => ({
    add: vi.fn(),
    createRenderTexture: vi.fn((width: number, height: number) => ({ width, height, destroy: vi.fn() })),
    getPixels: vi.fn((texture: { width: number; height: number }) => ({
        pixels: new Uint8ClampedArray(texture.width * texture.height * 4),
        width: texture.width,
        height: texture.height
    })),
    remove: vi.fn(),
    render: vi.fn()
}));

vi.mock('@octane/renderer', () => ({
    GetRenderer: () => ({
        render: previewMocks.render,
        texture: { getPixels: previewMocks.getPixels }
    }),
    GetTicker: () => ({ add: previewMocks.add, remove: previewMocks.remove }),
    OctaneLogger: { error: vi.fn() },
    TextureUtils: { createRenderTexture: previewMocks.createRenderTexture }
}));

let resizeCallback: ResizeObserverCallback;

class ResizeObserverMock {
    public constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
    }

    public observe = vi.fn();
    public disconnect = vi.fn();
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

const context = {
    createImageData: vi.fn((width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
        width,
        height
    })),
    putImageData: vi.fn()
};

const createRoomPreviewer = () => {
    const renderingCanvas = { canvasUpdated: true, master: {} };

    return {
        changeRoomObjectDirection: vi.fn(),
        changeRoomObjectState: vi.fn(),
        cycleAvatarAction: vi.fn(),
        getPreviewCapabilities: () => ({ mode: 'avatar' }),
        getRenderingCanvas: vi.fn(() => renderingCanvas),
        getRoomCanvas: vi.fn(),
        modifyRoomCanvas: vi.fn(),
        updatePreviewRoomView: vi.fn()
    } as any;
};

const renderPreview = (roomPreviewer: ReturnType<typeof createRoomPreviewer>, height = 240, initialWidth = 360) => {
    const container = document.createElement('div');
    let width = initialWidth;

    Object.defineProperty(container, 'clientWidth', { configurable: true, get: () => width });
    document.body.appendChild(container);

    const view = render(<LayoutRoomPreviewerView height={height} roomPreviewer={roomPreviewer} />, { container });

    return {
        ...view,
        setWidth(nextWidth: number) {
            width = nextWidth;
            resizeCallback([], {} as ResizeObserver);
        }
    };
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as never);
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('LayoutRoomPreviewerView presentation canvas', () => {
    it('recreates its render target only when the measured width changes', () => {
        const roomPreviewer = createRoomPreviewer();
        const view = renderPreview(roomPreviewer);
        const firstTexture = previewMocks.createRenderTexture.mock.results[0].value;

        view.setWidth(360);

        expect(previewMocks.createRenderTexture).toHaveBeenCalledTimes(1);
        expect(roomPreviewer.modifyRoomCanvas).not.toHaveBeenCalled();

        view.setWidth(680);

        expect(previewMocks.createRenderTexture).toHaveBeenLastCalledWith(680, 240);
        expect(roomPreviewer.modifyRoomCanvas).toHaveBeenCalledOnce();
        expect(roomPreviewer.modifyRoomCanvas).toHaveBeenCalledWith(680, 240);
        expect(firstTexture.destroy).toHaveBeenCalledWith(true);
    });
});

describe('LayoutRoomPreviewerView interactions', () => {
    it('keeps furniture state on a single click', () => {
        const roomPreviewer = createRoomPreviewer();
        const view = renderPreview(roomPreviewer, 200);

        fireEvent.click(view.container.querySelector('.shadow-room-previewer')!);

        expect(roomPreviewer.changeRoomObjectState).toHaveBeenCalledOnce();
    });

    it('keeps preview clicks dedicated to furniture state even with modifier keys', () => {
        const roomPreviewer = createRoomPreviewer();
        const view = renderPreview(roomPreviewer, 200);

        fireEvent.click(view.container.querySelector('.shadow-room-previewer')!, { shiftKey: true });

        expect(roomPreviewer.changeRoomObjectDirection).not.toHaveBeenCalled();
        expect(roomPreviewer.changeRoomObjectState).toHaveBeenCalledOnce();
    });

    it('does not cycle avatar actions from the preview surface', () => {
        const roomPreviewer = createRoomPreviewer();
        const view = renderPreview(roomPreviewer, 200);

        fireEvent.click(view.container.querySelector('.shadow-room-previewer')!);

        expect(roomPreviewer.cycleAvatarAction).not.toHaveBeenCalled();
        expect(roomPreviewer.changeRoomObjectState).toHaveBeenCalledOnce();
    });
});
