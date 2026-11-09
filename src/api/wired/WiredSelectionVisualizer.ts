import { GetRoomEngine, IRoomObject, IRoomObjectSpriteVisualization, RoomObjectCategory, WiredFilter } from '@octane/renderer';

/*
 * The official picked-furni look (RoomObjectHighLighter): a colour matrix that keeps a quarter of the furni's colour
 * and adds 115.5 / 141 / 141, then the furnitureFilter shader turns what was black (the outline) white. As a mix that
 * is 75 % towards 154 / 188 / 188.
 */
const PICKED_LOOK = { lineColor: [1, 1, 1] as [number, number, number], color: [154 / 255, 188 / 255, 188 / 255] as [number, number, number], mix: 0.75 };

/** Official furni sources of the pick lists (InputSourcesConf): picks 1, picks 2 and the snapshot (read as picks 1). */
const FURNI_SOURCE_PICKS_1 = 100;
const FURNI_SOURCE_PICKS_2 = 101;
const FURNI_SOURCE_SNAPSHOT = 110;

/**
 * Official InputSourcesConf dual furni picking: one furni slot takes the first picks (or the snapshot) and one takes
 * the second picks. The editor then tints the two pick lists apart.
 */
export const isDualFurniPickingMode = (conf: { furniAllowed?: number[][] } | null | undefined): boolean => {
    let first = false;
    let second = false;

    for (const allowed of conf?.furniAllowed ?? []) {
        if (!allowed) continue;
        if (allowed.includes(FURNI_SOURCE_PICKS_1) || allowed.includes(FURNI_SOURCE_SNAPSHOT)) first = true;
        if (allowed.includes(FURNI_SOURCE_PICKS_2)) second = true;
    }

    return first && second;
};

/** An official pick list: 1 is stuffIds (the first picks), 2 is stuffIds2 (the second picks). */
export type WiredPickList = 1 | 2;

export class WiredSelectionVisualizer {
    private static _selectionShader: WiredFilter = new WiredFilter(PICKED_LOOK);
    // Official dual picking, first set: the picked look, then red and green x 1.13 + 35.
    private static _dualSelectionShader: WiredFilter = new WiredFilter({ ...PICKED_LOOK, scale: [1.13, 1.13, 1], offset: [35 / 255, 35 / 255, 0] });
    private static _dualPickingMode = false;
    private static _editingPickList: WiredPickList = 1;
    // Official dual picking, second set: the picked look, then blue x 1.15 + 40.
    private static _secondarySelectionShader: WiredFilter = new WiredFilter({ ...PICKED_LOOK, scale: [1, 1, 1.15], offset: [0, 0, 40 / 255] });
    // Official highlightActiveWired(): the open box gets red x 0.9, green + 40, blue + 80 at 80 % alpha.
    private static _activeWiredShader: WiredFilter = new WiredFilter({
        lineColor: [0, 0, 0],
        color: [0, 0, 0],
        mix: 0,
        replaceLine: false,
        scale: [0.9, 1, 1],
        offset: [0, 40 / 255, 80 / 255],
        alpha: 0.8
    });
    private static _activeWiredId: number = null;
    private static _variableHighlightShader: WiredFilter = new WiredFilter({
        lineColor: [0.52, 0.92, 1],
        color: [0.2, 0.7, 1]
    });
    /**
     * What should be highlighted, by "category:objectId". A furni's sprites can be rebuilt (a state
     * change, an animation frame), which drops the filter; {@link refresh} puts it back.
     */
    private static _intended: Map<string, Set<WiredFilter>> = new Map();

    private static remember(category: number, objectId: number, filter: WiredFilter): void {
        const key = `${category}:${objectId}`;
        let filters = WiredSelectionVisualizer._intended.get(key);

        if (!filters) WiredSelectionVisualizer._intended.set(key, (filters = new Set()));

        filters.add(filter);
    }

    private static forget(category: number, objectId: number, filter: WiredFilter): void {
        const key = `${category}:${objectId}`;
        const filters = WiredSelectionVisualizer._intended.get(key);

        if (!filters) return;

        filters.delete(filter);

        if (!filters.size) WiredSelectionVisualizer._intended.delete(key);
    }

    /** Official highlightActiveWired(): marks the box whose editor is open; one at a time. */
    public static highlightActiveWired(furniId: number): void {
        if (WiredSelectionVisualizer._activeWiredId !== null && WiredSelectionVisualizer._activeWiredId !== furniId) {
            WiredSelectionVisualizer.unhighlightActiveWired(WiredSelectionVisualizer._activeWiredId);
        }

        WiredSelectionVisualizer._activeWiredId = furniId;
        WiredSelectionVisualizer.applySelectionShader(WiredSelectionVisualizer.getRoomObject(furniId), WiredSelectionVisualizer._activeWiredShader);
    }

    public static unhighlightActiveWired(furniId: number): void {
        if (WiredSelectionVisualizer._activeWiredId === furniId) WiredSelectionVisualizer._activeWiredId = null;

        WiredSelectionVisualizer.clearSelectionShader(WiredSelectionVisualizer.getRoomObject(furniId), WiredSelectionVisualizer._activeWiredShader);
    }

    /** Puts every intended highlight back on the furni's current sprites. */
    public static refresh(): void {
        if (WiredSelectionVisualizer._activeWiredId !== null) {
            WiredSelectionVisualizer.applySelectionShader(
                WiredSelectionVisualizer.getRoomObject(WiredSelectionVisualizer._activeWiredId),
                WiredSelectionVisualizer._activeWiredShader
            );
        }

        for (const [key, filters] of WiredSelectionVisualizer._intended) {
            const [category, objectId] = key.split(':').map(Number);
            const roomObject =
                category === RoomObjectCategory.FLOOR
                    ? WiredSelectionVisualizer.getFurniObject(objectId)
                    : WiredSelectionVisualizer.getRoomObjectByCategory(objectId, category);

            for (const filter of filters) WiredSelectionVisualizer.applySelectionShader(roomObject, filter);
        }
    }

    /** The first pick list's look: tinted apart from the second list while dual picking is on. */
    private static get primaryShader(): WiredFilter {
        return WiredSelectionVisualizer._dualPickingMode ? WiredSelectionVisualizer._dualSelectionShader : WiredSelectionVisualizer._selectionShader;
    }

    public static get isDualPickingMode(): boolean {
        return WiredSelectionVisualizer._dualPickingMode;
    }

    /**
     * Official RoomObjectHighLighter: with dual picking on, the first picks get their own tint. Switching the mode
     * repaints the first picks already shown.
     */
    public static setDualPickingMode(enabled: boolean): void {
        if (WiredSelectionVisualizer._dualPickingMode === !!enabled) return;

        const previous = WiredSelectionVisualizer.primaryShader;

        WiredSelectionVisualizer._dualPickingMode = !!enabled;

        const next = WiredSelectionVisualizer.primaryShader;

        for (const [key, filters] of [...WiredSelectionVisualizer._intended]) {
            if (!filters.has(previous)) continue;

            const objectId = Number(key.split(':')[1]);

            WiredSelectionVisualizer.hideFurni(objectId, previous);
            WiredSelectionVisualizer.showFurni(objectId, next);
        }
    }

    private static showFurni(furniId: number, filter: WiredFilter): void {
        WiredSelectionVisualizer.remember(RoomObjectCategory.FLOOR, furniId, filter);
        WiredSelectionVisualizer.applySelectionShader(WiredSelectionVisualizer.getFurniObject(furniId), filter);
    }

    private static hideFurni(furniId: number, filter: WiredFilter): void {
        WiredSelectionVisualizer.forget(RoomObjectCategory.FLOOR, furniId, filter);
        WiredSelectionVisualizer.clearSelectionShader(WiredSelectionVisualizer.getFurniObject(furniId), filter);
    }

    private static hidePrimary(furniId: number): void {
        WiredSelectionVisualizer.hideFurni(furniId, WiredSelectionVisualizer._selectionShader);
        WiredSelectionVisualizer.hideFurni(furniId, WiredSelectionVisualizer._dualSelectionShader);
    }

    public static get editingPickList(): WiredPickList {
        return WiredSelectionVisualizer._editingPickList;
    }

    /**
     * The pick list the room clicks fill. A box with two pick lists switches it when its editor edits the second
     * list (stuffIds2), so a furni picked there gets the second list's tint straight away, as in AIR.
     */
    public static setEditingPickList(list: WiredPickList): void {
        WiredSelectionVisualizer._editingPickList = list === 2 ? 2 : 1;
    }

    /**
     * Official UserDefinedRoomEventsCtrl: the first pick list (stuffIds) always has the first tint and the second
     * (stuffIds2) the blue one, whichever list is being edited. A furni in both lists shows the second tint. Clears
     * both tints from `previousIds` first and returns the ids now tinted, to pass back on the next call.
     */
    public static showPickLists(previousIds: number[], firstIds: number[], secondIds: number[]): number[] {
        if (previousIds.length) {
            WiredSelectionVisualizer.clearSelectionShaderFromFurni(previousIds);
            WiredSelectionVisualizer.clearSecondarySelectionShaderFromFurni(previousIds);
        }

        const secondSet = new Set(secondIds);
        const firstOnlyIds = firstIds.filter((id) => !secondSet.has(id));

        if (firstOnlyIds.length) WiredSelectionVisualizer.applySelectionShaderToFurni(firstOnlyIds);
        if (secondIds.length) WiredSelectionVisualizer.applySecondarySelectionShaderToFurni(secondIds);

        return Array.from(new Set([...firstIds, ...secondIds]));
    }

    /** A room click picked the furni into the list being edited. */
    public static show(furniId: number): void {
        if (WiredSelectionVisualizer._editingPickList === 2) {
            WiredSelectionVisualizer.showFurni(furniId, WiredSelectionVisualizer._secondarySelectionShader);
            return;
        }

        WiredSelectionVisualizer.showFurni(furniId, WiredSelectionVisualizer.primaryShader);
    }

    public static hide(furniId: number): void {
        WiredSelectionVisualizer.hidePrimary(furniId);
        WiredSelectionVisualizer.hideFurni(furniId, WiredSelectionVisualizer._secondarySelectionShader);
    }

    public static showSecondary(furniId: number): void {
        WiredSelectionVisualizer.showFurni(furniId, WiredSelectionVisualizer._secondarySelectionShader);
    }

    public static hideSecondary(furniId: number): void {
        WiredSelectionVisualizer.hideFurni(furniId, WiredSelectionVisualizer._secondarySelectionShader);
    }

    public static clearSelectionShaderFromFurni(furniIds: number[]): void {
        for (const furniId of furniIds) WiredSelectionVisualizer.hidePrimary(furniId);
    }

    public static applySelectionShaderToFurni(furniIds: number[]): void {
        for (const furniId of furniIds) WiredSelectionVisualizer.showFurni(furniId, WiredSelectionVisualizer.primaryShader);
    }

    public static clearSecondarySelectionShaderFromFurni(furniIds: number[]): void {
        for (const furniId of furniIds) WiredSelectionVisualizer.hideFurni(furniId, WiredSelectionVisualizer._secondarySelectionShader);
    }

    public static applySecondarySelectionShaderToFurni(furniIds: number[]): void {
        for (const furniId of furniIds) WiredSelectionVisualizer.showFurni(furniId, WiredSelectionVisualizer._secondarySelectionShader);
    }

    public static clearAllSelectionShaders(): void {
        WiredSelectionVisualizer._intended.clear();

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
            WiredSelectionVisualizer.clearSelectionShader(roomObject, WiredSelectionVisualizer._dualSelectionShader);
            WiredSelectionVisualizer.clearSelectionShader(roomObject, WiredSelectionVisualizer._secondarySelectionShader);
            WiredSelectionVisualizer.clearSelectionShader(roomObject, WiredSelectionVisualizer._variableHighlightShader);
        }
    }

    public static applyVariableHighlightToObjects(objects: Array<{ category: number; objectId: number }>): void {
        for (const object of objects) {
            WiredSelectionVisualizer.remember(object.category, object.objectId, WiredSelectionVisualizer._variableHighlightShader);
            WiredSelectionVisualizer.applySelectionShader(
                WiredSelectionVisualizer.getRoomObjectByCategory(object.objectId, object.category),
                WiredSelectionVisualizer._variableHighlightShader
            );
        }
    }

    public static clearVariableHighlightFromObjects(objects: Array<{ category: number; objectId: number }>): void {
        for (const object of objects) {
            WiredSelectionVisualizer.forget(object.category, object.objectId, WiredSelectionVisualizer._variableHighlightShader);
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

    /**
     * A picked furni: official picks give wall items as negative ids; ours keep the item id, so a pick that is no
     * floor item is looked up on the wall.
     */
    private static getFurniObject(furniId: number): IRoomObject {
        const roomEngine = GetRoomEngine();
        const roomId = roomEngine.activeRoomId;

        if (furniId < 0) return roomEngine.getRoomObject(roomId, -furniId, RoomObjectCategory.WALL);

        return roomEngine.getRoomObject(roomId, furniId, RoomObjectCategory.FLOOR) ?? roomEngine.getRoomObject(roomId, furniId, RoomObjectCategory.WALL);
    }

    private static getRoomObjectByCategory(objectId: number, category: number): IRoomObject {
        const roomEngine = GetRoomEngine();

        return roomEngine.getRoomObject(roomEngine.activeRoomId, objectId, category);
    }

    private static applySelectionShader(roomObject: IRoomObject, filter: WiredFilter): void {
        if (!roomObject) return;

        const visualization = roomObject.visualization as IRoomObjectSpriteVisualization;

        if (!visualization) return;

        let changed = false;

        for (const sprite of visualization.sprites) {
            if (sprite.blendMode === 'add') continue;

            const filters = sprite.filters || [];

            if (filters.includes(filter)) continue;

            // A new list goes through the sprite's setter, which marks the sprite for a redraw.
            sprite.filters = [...filters, filter];
            changed = true;
        }

        // The room canvas only redraws an object whose visualization reports a change.
        if (changed) visualization.updateSpriteCounter++;
    }

    private static clearSelectionShader(roomObject: IRoomObject, filter: WiredFilter): void {
        if (!roomObject) return;

        const visualization = roomObject.visualization as IRoomObjectSpriteVisualization;

        if (!visualization) return;

        let changed = false;

        for (const sprite of visualization.sprites) {
            if (!sprite.filters || !sprite.filters.includes(filter)) continue;

            sprite.filters = sprite.filters.filter((current) => current !== filter);
            changed = true;
        }

        if (changed) visualization.updateSpriteCounter++;
    }
}
