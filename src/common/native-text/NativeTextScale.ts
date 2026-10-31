import { useSyncExternalStore } from 'react';

/**
 * Native text is rasterised like Flash, in whole pixels. On a scaled display (devicePixelRatio above 1)
 * it is rendered at the next whole multiple and drawn at its CSS size, so the browser scales a sharp raster
 * down instead of stretching a 1x one. At 1 the output stays pixel-identical to the client's.
 */
export const getNativeTextScale = (): number => Math.min(4, Math.max(1, Math.ceil((globalThis.devicePixelRatio || 1) - 0.01)));

/**
 * The scale a native raster is drawn at: the device pixel ratio itself, so every raster pixel is one screen pixel. On a fractional ratio
 * (Windows display scaling of 125 % or 150 %, browser zoom) a raster drawn at the next whole scale is shrunk by the browser, which
 * softens every glyph edge; drawn at the ratio it is not resampled at all. Whole ratios give the same value as getNativeTextScale.
 */
export const getNativeTextRasterScale = (): number => Math.min(4, Math.max(1, Math.round((globalThis.devicePixelRatio || 1) * 100) / 100));

const subscribe = (onChange: () => void) => {
    if (typeof matchMedia !== 'function') return () => {};

    let query: MediaQueryList = null;

    const listen = () => {
        query = matchMedia(`(resolution: ${globalThis.devicePixelRatio || 1}dppx)`);
        query.addEventListener('change', handleChange, { once: true });
    };

    // A resolution query only fires once, when that resolution stops matching (zoom, other monitor).
    function handleChange() {
        onChange();
        listen();
    }

    listen();

    return () => query?.removeEventListener('change', handleChange);
};

/** The native text scale, updated when the window moves to a display with another pixel ratio or zooms. */
export const useNativeTextScale = (): number => useSyncExternalStore(subscribe, getNativeTextScale, () => 1);

/** The raster scale (see getNativeTextRasterScale), updated like useNativeTextScale. */
export const useNativeTextRasterScale = (): number => useSyncExternalStore(subscribe, getNativeTextRasterScale, () => 1);

/**
 * Sampling of a native-resolution raster (a text drawn at 1x that the browser enlarges). The native stage is enlarged without smoothing
 * on an integer device pixel ratio and smoothed on a fractional one (launcher app init: imageRendering pixelated / auto), so the
 * answer depends on integer-ness, not on the rounded raster scale, and it is re-read when the pixel ratio changes.
 */
export const getNativeTextSampling = (): 'pixelated' | 'auto' => {
    const ratio = globalThis.devicePixelRatio;

    return Number.isInteger(Number.isFinite(ratio) && ratio > 0 ? ratio : 1) ? 'pixelated' : 'auto';
};

const subscribeNothing = () => () => {};

/** Only a native-resolution text follows the pixel ratio; every other text keeps its constant answer and subscribes to nothing. */
export const useNativeTextSampling = (enabled: boolean): 'pixelated' | 'auto' => useSyncExternalStore(enabled ? subscribe : subscribeNothing, enabled ? getNativeTextSampling : () => 'pixelated', () => 'pixelated');
