import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LayoutMiniCameraView } from './LayoutMiniCameraView';

const mocks = vi.hoisted(() => ({
    createTextureFromRoom: vi.fn(() => ({ id: 'texture' }))
}));

vi.mock('@octane/renderer', async () => {
    const actual = await vi.importActual<typeof import('@octane/renderer')>('@octane/renderer');

    return {
        ...actual,
        GetRoomEngine: () => ({ createTextureFromRoom: mocks.createTextureFromRoom }),
        OctaneRectangle: class {}
    };
});

vi.mock('../../api', () => ({
    LocalizeText: (key: string) => key,
    PlaySound: vi.fn(),
    SoundNames: { CAMERA_SHUTTER: 'camera-shutter' },
    blitRoomCanvasToViewfinder: vi.fn(),
    getViewfinderRoomFrame: vi.fn(() => ({ x: 3, y: 30, width: 110, height: 110 }))
}));

describe('AIR room thumbnail viewfinder', () => {
    it('submits at most one screenshot while the server request is pending', () => {
        const textureReceiver = vi.fn(() => new Promise<void>(() => undefined));
        render(<LayoutMiniCameraView roomId={42} textureReceiver={textureReceiver} onClose={vi.fn()} />);

        const saveButton = screen.getByRole('button', { name: 'navigator.thumbeditor.save' });
        fireEvent.click(saveButton);
        fireEvent.click(saveButton);

        expect(textureReceiver).toHaveBeenCalledTimes(1);
        expect(saveButton).toBeDisabled();
    });
});
