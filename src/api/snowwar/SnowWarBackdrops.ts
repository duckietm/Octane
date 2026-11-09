// The three official SnowWar room-ad backdrops (AIR loads them at runtime as an
// ads_background fuse object at tile (0, 19) or (0, 22); the client carries no
// placement data for them). Each is drawn `drawWidth` stage px wide - the scale
// at which its painted tiles are 32px, like the AIR scale-32 arena floor -
// whatever the resolution of the file the hotel serves, and placed so that the
// painted point `art` (fractions of the image) lands on the screen point of the
// tile coordinate `tile`. The anchors are our own fit of each artwork on its
// heightmap (arena_8/9/11_heightmap.txt):
// - Arctic Island: the centre of the painted frozen moat on the centre of the
//   heightmap's moat (tiles x 20..32, y 19..30); the four planks then land on
//   the four plank tiles.
// - Dragon Top: the playfield centred in the painted snow plateau. The lone
//   walkable tile (0, 22) then lands on the railed landing at the top of the
//   left stairs and (47, 33) in the gap between the two rocks at the front edge.
// - Fight Night: the playfield centred in the spotlight pool, clear of the
//   painted tree line on both sides.
// The server's offsetZ (10000 / 9920 / 9950) is a depth push in AIR, not our
// editor's overlay flag, so an official backdrop is never drawn over the floor.

export interface SnowWarOfficialBackdrop
{
    file: string;
    drawWidth: number;
    defaultRatio: number;
    art: { fx: number; fy: number };
    tile: { x: number; y: number };
}

export const SNOWWAR_OFFICIAL_BACKDROPS: readonly SnowWarOfficialBackdrop[] = [
    {
        file: 'snst_bg_1_a_big.png',
        drawWidth: 2000,
        defaultRatio: 1222 / 2000,
        art: { fx: 1011 / 2000, fy: 647 / 1222 },
        tile: { x: 26.5, y: 25 },
    },
    {
        file: 'snst_bg_2_big.png',
        drawWidth: 2000,
        defaultRatio: 1222 / 2000,
        art: { fx: 992 / 2000, fy: 626 / 1222 },
        tile: { x: 25.5, y: 25.5 },
    },
    {
        file: 'snst_bg_3_noscale.png',
        drawWidth: 1800,
        defaultRatio: 1100 / 1800,
        art: { fx: 899 / 1800, fy: 607 / 1100 },
        tile: { x: 25.5, y: 25.5 },
    },
];

/** The official backdrop an arena image URL names, keyed on the file name (any host, any query string). */
export const findSnowWarOfficialBackdrop = (imageUrl: string | null | undefined): SnowWarOfficialBackdrop | null =>
{
    if (!imageUrl) return null;

    const path = imageUrl.split(/[?#]/)[0];
    const fileName = path.substring(path.lastIndexOf('/') + 1);
    const baseName = fileName.replace(/\.[a-z0-9]+$/i, '');

    return SNOWWAR_OFFICIAL_BACKDROPS.find(backdrop => backdrop.file.replace(/\.png$/, '') === baseName) ?? null;
};

export interface SnowWarBackdropLayout
{
    stageW: number;
    stageH: number;
    floorOffsetX: number;
    floorOffsetY: number;
    rect: { left: number; top: number; width: number; height: number };
}

/**
 * Stage built around the artwork (plus the floor, should a map stick out of it), so the camera never pans onto an
 * area the artwork does not paint. `anchor` is the zoomed floor-layer point of `backdrop.tile`; `ratio` is the
 * loaded image's height / width (the default until it has loaded).
 */
export const layoutSnowWarOfficialBackdrop = (
    backdrop: SnowWarOfficialBackdrop,
    ratio: number,
    anchor: { x: number; y: number },
    floorW: number,
    floorH: number,
): SnowWarBackdropLayout =>
{
    const width = backdrop.drawWidth;
    const height = backdrop.drawWidth * ratio;
    // Whole pixels, so neither the artwork nor the floor lands on a half pixel.
    const left = Math.round(anchor.x - (backdrop.art.fx * width));
    const top = Math.round(anchor.y - (backdrop.art.fy * height));
    const minX = Math.min(0, left);
    const minY = Math.min(0, top);

    return {
        stageW: Math.max(floorW, left + width) - minX,
        stageH: Math.max(floorH, top + height) - minY,
        floorOffsetX: -minX,
        floorOffsetY: -minY,
        rect: { left: left - minX, top: top - minY, width, height },
    };
};
