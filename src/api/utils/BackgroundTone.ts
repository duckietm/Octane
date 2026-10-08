export type BackgroundTone = 'light' | 'dark';

/** Below this mean luminance (0..1) the dark copy would not read; switch to the light set. */
export const DARK_TONE_THRESHOLD = 0.45;

/**
 * Mean relative luminance of the opaque pixels in an RGBA buffer, 0 (black) to 1 (white).
 * Transparent pixels are ignored; a fully transparent buffer counts as light.
 */
export const meanLuminance = (rgba: ArrayLike<number>, step: number = 1): number => {
    let total = 0;
    let weight = 0;

    for (let i = 0; i + 3 < rgba.length; i += 4 * Math.max(1, step)) {
        const alpha = rgba[i + 3] / 255;

        if (alpha <= 0) continue;

        const luminance = (0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]) / 255;

        total += luminance * alpha;
        weight += alpha;
    }

    return weight > 0 ? total / weight : 1;
};

export const toneForLuminance = (luminance: number): BackgroundTone => (luminance < DARK_TONE_THRESHOLD ? 'dark' : 'light');

/** Share of the opaque pixels (0..1) whose luminance is below the dark threshold. */
export const darkPixelShare = (rgba: ArrayLike<number>, step: number = 1): number => {
    let dark = 0;
    let count = 0;

    for (let i = 0; i + 3 < rgba.length; i += 4 * Math.max(1, step)) {
        if (rgba[i + 3] <= 0) continue;

        const luminance = (0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]) / 255;

        if (luminance < DARK_TONE_THRESHOLD) dark++;
        count++;
    }

    return count > 0 ? dark / count : 0;
};

/**
 * The tone of a sampled background. A pattern is dark when most of its pixels are dark, even
 * when a few bright accents (dots, stars, glitter) pull the mean up; a mean below the
 * threshold is dark regardless.
 */
export const toneForPixels = (rgba: ArrayLike<number>, step: number = 1): BackgroundTone =>
    darkPixelShare(rgba, step) >= 0.5 || meanLuminance(rgba, step) < DARK_TONE_THRESHOLD ? 'dark' : 'light';

/** The url inside a CSS `background-image: url("...")` value, or null when there is none. */
export const backgroundImageUrl = (backgroundImage: string): string => {
    if (!backgroundImage) return null;

    const match = /url\((['"]?)(.*?)\1\)/.exec(backgroundImage);

    return match && match[2] ? match[2] : null;
};

/**
 * Mean luminance of the colour stops in a CSS gradient value (`rgb(...)`, `rgba(...)` or
 * `#rrggbb`), or null when the value holds no colour. Gradients cannot be drawn on a canvas
 * without rendering the element, and their stops are a fair measure of how dark they are.
 */
export const gradientLuminance = (backgroundImage: string): number => {
    if (!backgroundImage || !/gradient\(/.test(backgroundImage)) return null;

    const colors: number[][] = [];

    for (const match of backgroundImage.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/g)) {
        colors.push([Number(match[1]), Number(match[2]), Number(match[3]), match[4] === undefined ? 255 : Math.round(Number(match[4]) * 255)]);
    }

    for (const match of backgroundImage.matchAll(/#([0-9a-f]{6})(?![0-9a-f])/gi)) {
        const hex = match[1];

        colors.push([parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), 255]);
    }

    if (!colors.length) return null;

    return meanLuminance(colors.flat());
};

/** Luminance of a computed CSS colour (`rgb(...)` / `rgba(...)`), or null when transparent or unknown. */
export const cssColorLuminance = (color: string): number => {
    if (!color) return null;

    const match = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/.exec(color);

    if (!match) return null;
    if (match[4] !== undefined && Number(match[4]) <= 0) return null;

    return meanLuminance([Number(match[1]), Number(match[2]), Number(match[3]), 255]);
};

/**
 * Tone of a gradient background painted over `backgroundColor`. Dotted and striped patterns
 * leave part of the tile transparent, so the base colour is what the eye sees behind the
 * text: when the gradient has transparent stops the base colour decides; otherwise the
 * stops and the base colour are averaged together.
 */
export const gradientTone = (backgroundImage: string, backgroundColor: string): BackgroundTone => {
    const stops = gradientLuminance(backgroundImage);

    if (stops === null) return null;

    const base = cssColorLuminance(backgroundColor);
    const seeThrough = /transparent|rgba\([^)]*,\s*0?\.\d+\s*\)|rgba\([^)]*,\s*0\s*\)/.test(backgroundImage);

    if (seeThrough && base !== null) return toneForLuminance(base);
    if (base === null) return toneForLuminance(stops);

    return toneForLuminance((stops + base) / 2);
};
