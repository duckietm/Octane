import { GetRoomEngine, IRoomObject, IRoomObjectSpriteVisualization, RoomObjectCategory, WiredFilter } from '@octane/renderer';

export class WiredSelectionVisualizer {
    private static _selectionShader: WiredFilter = new WiredFilter({
        lineColor: [0.45, 0.95, 0.55],
        color: [0.18, 0.78, 0.3]
    });
    private static _secondarySelectionShader: WiredFilter = new WiredFilter({
        lineColor: [0.45, 0.78, 1],
        color: [0.2, 0.52, 0.95]
    });
    private static _variableHighlightShader: WiredFilter = new WiredFilter({
        lineColor: [0.52, 0.92, 1],
        color: [0.2, 0.7, 1]
    });

    public static show(furniId: number): void {
        WiredSelectionVisualizer.applySelectionShader(WiredSelectionVisualizer.getRoomObject(furniId), WiredSelectionVisualizer._selectionShader);
    }

    public static hide(furniId: number): void {
        const roomObject = WiredSelectionVisualizer.getRoomObject(furniId);

        WiredSelectionVisualizer.clearSelectionShader(roomObject, WiredSelectionVisualizer._selectionShader);
        WiredSelectionVisualizer.clearSelectionShader(roomObject, WiredSelectionVisualizer._secondarySelectionShader);
    }

    public static showSecondary(furniId: number): void {
        WiredSelectionVisualizer.applySelectionShader(WiredSelectionVisualizer.getRoomObject(furniId), WiredSelectionVisualizer._secondarySelectionShader);
    }

    public static hideSecondary(furniId: number): void {
        WiredSelectionVisualizer.clearSelectionShader(WiredSelectionVisualizer.getRoomObject(furniId), WiredSelectionVisualizer._secondarySelectionShader);
    }

    public static clearSelectionShaderFromFurni(furniIds: number[]): void {
        for (const furniId of furniIds) {
            WiredSelectionVisualizer.clearSelectionShader(WiredSelectionVisualizer.getRoomObject(furniId), WiredSelectionVisualizer._selectionShader);
        }
    }

    public static applySelectionShaderToFurni(furniIds: number[]): void {
        for (const furniId of furniIds) {
            WiredSelectionVisualizer.applySelectionShader(WiredSelectionVisualizer.getRoomObject(furniId), WiredSelectionVisualizer._selectionShader);
        }
    }

    public static clearSecondarySelectionShaderFromFurni(furniIds: number[]): void {
        for (const furniId of furniIds) {
            WiredSelectionVisualizer.clearSelectionShader(WiredSelectionVisualizer.getRoomObject(furniId), WiredSelectionVisualizer._secondarySelectionShader);
        }
    }

    public static applySecondarySelectionShaderToFurni(furniIds: number[]): void {
        for (const furniId of furniIds) {
            WiredSelectionVisualizer.applySelectionShader(WiredSelectionVisualizer.getRoomObject(furniId), WiredSelectionVisualizer._secondarySelectionShader);
        }
    }

    public static clearAllSelectionShaders(): void {
        const roomEngine = GetRoomEngine();
        const roomId = roomEngine.activeRoomId;

        if (roomId < 0) return;

        const roomObjects = [
            ...roomEngine.getRoomObjects(roomId, RoomObjectCategory.FLOOR),
            ...roomEngine.getRoomObjects(roomId, RoomObjectCategory.WALL),
            ...roomEngine.getRoomObjects(roomId, RoomObjectCategory.UNIT)
        ];

        for (const roomObject of roomObjects) {
            WiredSelectionVisualizer.clearSelectionShader(roomObject, WiredSelectionVisualizer._selectionShader);
            WiredSelectionVisualizer.clearSelectionShader(roomObject, WiredSelectionVisualizer._secondarySelectionShader);
            WiredSelectionVisualizer.clearSelectionShader(roomObject, WiredSelectionVisualizer._variableHighlightShader);
        }
    }

    public static applyVariableHighlightToObjects(objects: Array<{ category: number; objectId: number }>): void {
        for (const object of objects) {
            WiredSelectionVisualizer.applySelectionShader(
                WiredSelectionVisualizer.getRoomObjectByCategory(object.objectId, object.category),
                WiredSelectionVisualizer._variableHighlightShader
            );
        }
    }

    public static clearVariableHighlightFromObjects(objects: Array<{ category: number; objectId: number }>): void {
        for (const object of objects) {
            WiredSelectionVisualizer.clearSelectionShader(
                WiredSelectionVisualizer.getRoomObjectByCategory(object.objectId, object.category),
                WiredSelectionVisualizer._variableHighlightShader
            );
        }
    }

    private static getRoomObject(objectId: number): IRoomObject {
        const roomEngine = GetRoomEngine();

        return roomEngine.getRoomObject(roomEngine.activeRoomId, objectId, RoomObjectCategory.FLOOR);
    }

    private static getRoomObjectByCategory(objectId: number, category: number): IRoomObject {
        const roomEngine = GetRoomEngine();

        return roomEngine.getRoomObject(roomEngine.activeRoomId, objectId, category);
    }

    private static applySelectionShader(roomObject: IRoomObject, filter: WiredFilter): void {
        if (!roomObject) return;

        const visualization = roomObject.visualization as IRoomObjectSpriteVisualization;

        if (!visualization) return;

        for (const sprite of visualization.sprites) {
            if (sprite.blendMode === 'add') continue;

            if (!sprite.filters) sprite.filters = [];

            if (sprite.filters.includes(filter)) continue;

            sprite.filters.push(filter);

            sprite.increaseUpdateCounter();
        }
    }

    private static clearSelectionShader(roomObject: IRoomObject, filter: WiredFilter): void {
        if (!roomObject) return;

        const visualization = roomObject.visualization as IRoomObjectSpriteVisualization;

        if (!visualization) return;

        for (const sprite of visualization.sprites) {
            if (!sprite.filters) continue;

            const index = sprite.filters.indexOf(filter);

            if (index >= 0) {
                sprite.filters.splice(index, 1);

                sprite.increaseUpdateCounter();
            }
        }
    }
}
