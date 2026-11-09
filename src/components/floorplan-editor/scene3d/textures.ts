/**
 * Procedural stand-ins for the room's floor and wall bitmaps, drawn to
 * canvases so the scene can texture faces without loading room assets.
 * They follow the look of the default floor ('111': light tiles with a
 * darker grout) and wall ('201': pale wallpaper with a white skirting). To
 * use the real bitmaps, pass their images to FloorplanScene.setTextures().
 */
export type TextureImage = HTMLCanvasElement | HTMLImageElement | ImageBitmap;

const canvas = (width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] => {
    const element = document.createElement('canvas');
    element.width = width;
    element.height = height;
    const context = element.getContext('2d');
    if (!context) throw new Error('2D canvas is not available');
    return [element, context];
};

/** One 32x32 floor tile: 4x4 flagstones with grout. */
export const makeFloorTexture = (): HTMLCanvasElement => {
    const [element, ctx] = canvas(32, 32);
    ctx.fillStyle = '#9a9a92';
    ctx.fillRect(0, 0, 32, 32);
    for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
            const shade = 196 + ((x * 7 + y * 13) % 3) * 6;
            ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade - 6})`;
            ctx.fillRect(x * 8 + 1, y * 8 + 1, 6, 6);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.fillRect(x * 8 + 1, y * 8 + 1, 6, 1);
            ctx.fillRect(x * 8 + 1, y * 8 + 1, 1, 6);
        }
    }
    return element;
};

/** A 32x64 wall panel: wallpaper with a skirting band at the bottom. */
export const makeWallTexture = (): HTMLCanvasElement => {
    const [element, ctx] = canvas(32, 64);
    ctx.fillStyle = '#c9d6dc';
    ctx.fillRect(0, 0, 32, 64);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    for (let x = 0; x < 32; x += 8) ctx.fillRect(x, 0, 1, 64);
    ctx.fillStyle = '#f4f4f0';
    ctx.fillRect(0, 56, 32, 8);
    ctx.fillStyle = '#b9b9b2';
    ctx.fillRect(0, 56, 32, 1);
    ctx.fillRect(0, 63, 32, 1);
    return element;
};
