import { GetRoomEngine, Vector3d } from '@octane/renderer';

/**
 * The screen point of a tile's centre on the floor plane (z = 0) and the scale things drawn there
 * take: 1 at normal zoom, 0.5 zoomed out. The same projection the engine uses for room objects.
 */
export const GetRoomTileScreenLocation = (roomId: number, tileX: number, tileY: number, canvasId = 1): { x: number, y: number, scale: number } => {
    const engine = GetRoomEngine();
    const geometry = engine?.getRoomInstanceGeometry(roomId, canvasId);
    const canvas = engine?.getRoomInstanceRenderingCanvas(roomId, canvasId);

    if (!geometry || !canvas) return null;

    const point = geometry.getScreenPoint(new Vector3d(tileX + 0.5, tileY + 0.5, 0));

    if (!point) return null;

    const canvasScale = canvas.isFlipped ? -canvas.scale : canvas.scale;
    const width = canvas.isFlipped ? -canvas.width : canvas.width;
    const height = canvas.isFlipped ? -canvas.height : canvas.height;

    return {
        x: point.x * canvasScale + width / 2 + canvas.screenOffsetX,
        y: point.y * canvasScale + height / 2 + canvas.screenOffsetY,
        scale: (geometry.scale / 64) * Math.abs(canvasScale)
    };
};
