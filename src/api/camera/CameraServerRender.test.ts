import { describe, expect, it, vi } from 'vitest';

const config = vi.hoisted(() => ({ values: {} as Record<string, unknown> }));

vi.mock('../octane/GetConfigurationValue', () => ({
    GetConfigurationValue: (key: string, fallback: unknown) => ((key in config.values) ? config.values[key] : fallback)
}));

const { FinishCameraRenderMessage, GetCameraEffectDataJson, GetCameraRenderMode } = await import('./CameraServerRender');

const effect = (name: string, type: string) => ({ name, type }) as never;
const selected = (name: string, type: string, strength: number) => ({ effect: effect(name, type), strength }) as never;

describe('camera server render helpers', () => {
    it('reads camera.render.mode, server unless it says upload', () => {
        config.values = {};
        expect(GetCameraRenderMode()).toBe('server');
        config.values = { 'camera.render.mode': 'upload' };
        expect(GetCameraRenderMode()).toBe('upload');
        config.values = { 'camera.render.mode': 'something' };
        expect(GetCameraRenderMode()).toBe('server');
    });

    it('writes the effects like AIR getEffectDataJson: lab order, int(strength * 255), frames last without alpha', () => {
        const available = [ effect('dark_sepia', 'colormatrix'), effect('hearts_hardlight_02', 'composite'), effect('frame_gold', 'frame') ];

        expect(GetCameraEffectDataJson([
            selected('frame_gold', 'frame', 1),
            selected('hearts_hardlight_02', 'composite', 0.999),
            selected('dark_sepia', 'colormatrix', 0.5)
        ], available)).toBe('[{"name":"dark_sepia","alpha":127},{"name":"hearts_hardlight_02","alpha":254},{"name":"frame_gold"}]');
        expect(GetCameraEffectDataJson([], available)).toBe('[]');
    });

    it('adds the effects and zoom to the captured scene and packs it again', () => {
        const composer = { addEffectData: vi.fn(), setZoom: vi.fn(), compressData: vi.fn(), isSendable: vi.fn(() => true) };

        expect(FinishCameraRenderMessage(composer as never, '[]', 2)).toBe(true);
        expect(composer.addEffectData).toHaveBeenCalledWith('[]');
        expect(composer.setZoom).toHaveBeenCalledWith(2);
        expect(composer.compressData).toHaveBeenCalledOnce();
        expect(FinishCameraRenderMessage(null, '[]', 1)).toBe(false);
    });
});
