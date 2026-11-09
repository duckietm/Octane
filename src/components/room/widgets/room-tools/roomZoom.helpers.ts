import { GetRoomEngine, RoomGeometry } from '@octane/renderer';

export const ROOM_ZOOM_SCALES = [0.5, 1, 2, 4] as const;

export const applyRoomZoom = (roomId: number, logicalScale: number, isFlipForced: boolean = false): void => {
    if (isFlipForced) {
        GetRoomEngine().setRoomInstanceRenderingCanvasScale(roomId, 1, logicalScale, null, null, true);
        return;
    }

    const geometry = GetRoomEngine().getRoomInstanceGeometry(roomId, 1);
    const wantZoomedOutGeometry = logicalScale < 1;

    if (geometry) {
        if (wantZoomedOutGeometry) geometry.performZoomOut();
        else geometry.performZoomIn();
    }

    const displayScale = wantZoomedOutGeometry ? logicalScale * (RoomGeometry.SCALE_ZOOMED_IN / RoomGeometry.SCALE_ZOOMED_OUT) : logicalScale;

    GetRoomEngine().setRoomInstanceRenderingCanvasScale(roomId, 1, displayScale);
};

export const getRoomZoomLevel = (scale: number): number => {
    if (!Number.isFinite(scale)) return 1;

    const closestIndex = ROOM_ZOOM_SCALES.reduce((closest, candidate, index) => {
        return Math.abs(candidate - scale) < Math.abs(ROOM_ZOOM_SCALES[closest] - scale) ? index : closest;
    }, 0);

    return closestIndex;
};

export const getRoomZoomScale = (level: number): number => ROOM_ZOOM_SCALES[Math.max(0, Math.min(ROOM_ZOOM_SCALES.length - 1, Math.round(level)))];

export const stepRoomZoom = (currentScale: number, direction: -1 | 1): number => getRoomZoomScale(getRoomZoomLevel(currentScale) + direction);
