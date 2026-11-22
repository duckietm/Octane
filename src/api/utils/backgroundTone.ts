/**
 * Whether text on a background should be light or dark. Players pick the backgrounds (a card background, an
 * uploaded picture, an accent colour), so no fixed text colour is readable on all of them: the background's
 * average colour is measured and the text colour with the higher WCAG contrast is used.
 */
export type BackgroundTone = 'light' | 'dark';

export interface Rgb {
    r: number;
    g: number;
    b: number;
}

const LIGHT_TEXT: Rgb = { r: 255, g: 255, b: 255 };
const DARK_TEXT: Rgb = { r: 17, g: 17, b: 17 };

const channel = (value: number) => {
    const c = value / 255;

    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

/** WCAG relative luminance, 0 (black) to 1 (white). */
export const relativeLuminance = ({ r, g, b }: Rgb): number => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

export const contrastRatio = (a: Rgb, b: Rgb): number => {
    const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);

    return (high + 0.05) / (low + 0.05);
};

/** 'dark' when light text reads better on this colour, 'light' when dark text does. */
export const toneOf = (color: Rgb): BackgroundTone => (contrastRatio(color, LIGHT_TEXT) >= contrastRatio(color, DARK_TEXT) ? 'dark' : 'light');

/** Every colour written in a CSS value (hex, rgb(), rgba()), with its alpha. */
export const parseCssColors = (value: string): (Rgb & { a: number })[] => {
    const colors: (Rgb & { a: number })[] = [];

    for (const match of value.matchAll(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)|#([0-9a-f]{3,8})\b/gi)) {
        if (match[5]) {
            const hex = match[5].length <= 4 ? [...match[5]].map((digit) => digit + digit).join('') : match[5];

            colors.push({ r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1 });
            continue;
        }

        const alpha = match[4] === undefined ? 1 : match[4].endsWith('%') ? parseFloat(match[4]) / 100 : parseFloat(match[4]);

        colors.push({ r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: alpha });
    }

    return colors;
};

/** The average of some colours, each weighted by its alpha and laid over a base. */
export const blendOver = (colors: (Rgb & { a: number })[], base: Rgb): Rgb => {
    if (!colors.length) return base;

    const mix = (key: keyof Rgb) => colors.reduce((sum, color) => sum + color[key] * color.a + base[key] * (1 - color.a), 0) / colors.length;

    return { r: mix('r'), g: mix('g'), b: mix('b') };
};

const imageAverages = new Map<string, Promise<(Rgb & { a: number }) | null>>();

/** The average colour of a picture, read from a 16 x 16 copy; null when it cannot be read (an origin that refuses it). */
export const averageImageColor = (url: string): Promise<(Rgb & { a: number }) | null> => {
    const cached = imageAverages.get(url);

    if (cached) return cached;

    const result = new Promise<(Rgb & { a: number }) | null>((resolve) => {
        const image = new Image();

        image.crossOrigin = 'anonymous';
        image.onload = () => {
            try {
                const canvas = document.createElement('canvas');

                canvas.width = 16;
                canvas.height = 16;

                const context = canvas.getContext('2d');

                if (!context) return resolve(null);

                context.drawImage(image, 0, 0, 16, 16);

                const pixels = context.getImageData(0, 0, 16, 16).data;
                let r = 0;
                let g = 0;
                let b = 0;
                let a = 0;

                for (let index = 0; index < pixels.length; index += 4) {
                    const alpha = pixels[index + 3] / 255;

                    r += pixels[index] * alpha;
                    g += pixels[index + 1] * alpha;
                    b += pixels[index + 2] * alpha;
                    a += alpha;
                }

                const count = pixels.length / 4;

                resolve(a ? { r: r / a, g: g / a, b: b / a, a: a / count } : { r: 0, g: 0, b: 0, a: 0 });
            } catch {
                resolve(null);
            }
        };
        image.onerror = () => resolve(null);
        image.src = url;
    });

    imageAverages.set(url, result);

    return result;
};

/** The colour an element's own background paints, from its computed style: colour, gradients and pictures. */
export const measureBackground = async (element: HTMLElement, fallback: Rgb): Promise<Rgb> => {
    const style = window.getComputedStyle(element);
    const base = parseCssColors(style.backgroundColor)[0];
    const baseColor = base && base.a > 0 ? blendOver([base], fallback) : fallback;
    const image = style.backgroundImage;

    if (!image || image === 'none') return baseColor;

    const layers: (Rgb & { a: number })[] = [];

    for (const url of image.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
        const average = await averageImageColor(url[1]);

        if (average) layers.push(average);
    }

    const gradientColors = parseCssColors(image.replace(/url\([^)]*\)/g, ''));

    if (gradientColors.length) layers.push({ ...blendOver(gradientColors, baseColor), a: 1 });

    return layers.length ? blendOver(layers, baseColor) : baseColor;
};
