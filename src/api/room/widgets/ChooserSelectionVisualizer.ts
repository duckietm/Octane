import { ChooserSelectionFilter, GetRoomEngine, IRoomObjectSpriteVisualization, RoomObjectCategory } from '@octane/renderer';

export class chooserSelectionVisualizer {
    private static activeFilters: Map<string, ChooserSelectionFilter> = new Map();
    private static animationFrameId: number | null = null;

    private static startAnimation(): void {
        if (this.animationFrameId !== null) return;

        const animate = (time: number) => {
            const elapsed = time / 1000; // Convert to seconds
            this.activeFilters.forEach((filter) => {
                filter.time = elapsed; // Update time uniform
            });
            this.animationFrameId = requestAnimationFrame(animate);
        };

        this.animationFrameId = requestAnimationFrame(animate);
    }

    private static stopAnimation(): void {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    public static show(id: number, category: number = RoomObjectCategory.FLOOR): void {
        const roomObject = GetRoomEngine().getRoomObject(GetRoomEngine().activeRoomId, id, category);
        if (!roomObject) return;

        const visualization = roomObject.visualization as IRoomObjectSpriteVisualization;
        if (!visualization || !visualization.sprites || !visualization.sprites.length) return;

        const filter = new ChooserSelectionFilter([0.7, 0.88, 0.95], [0.29, 0.35, 0.39]);
        const key = `${id}_${category}`;
        this.activeFilters.set(key, filter);

        for (const sprite of visualization.sprites) {
            if (sprite.blendMode === 'add') continue;
            const existing = (sprite.filters || []).filter((f) => !(f instanceof ChooserSelectionFilter));
            sprite.filters = [...existing, filter];
        }

        this.startAnimation();
    }

    public static hide(id: number, category: number = RoomObjectCategory.FLOOR): void {
        const roomObject = GetRoomEngine().getRoomObject(GetRoomEngine().activeRoomId, id, category);
        if (!roomObject) return;

        const visualization = roomObject.visualization as IRoomObjectSpriteVisualization;
        if (!visualization) return;

        const key = `${id}_${category}`;
        this.activeFilters.delete(key);

        for (const sprite of visualization.sprites) {
            sprite.filters = (sprite.filters || []).filter((f) => !(f instanceof ChooserSelectionFilter));
        }

        if (this.activeFilters.size === 0) {
            this.stopAnimation();
        }
    }

    public static clearAll(): void {
        const roomEngine = GetRoomEngine();

        const roomObjects = [
            ...roomEngine.getRoomObjects(roomEngine.activeRoomId, RoomObjectCategory.FLOOR),
            ...roomEngine.getRoomObjects(roomEngine.activeRoomId, RoomObjectCategory.WALL)
        ];

        for (const roomObject of roomObjects) {
            const visualization = roomObject.visualization as IRoomObjectSpriteVisualization;
            if (!visualization) continue;

            for (const sprite of visualization.sprites) {
                sprite.filters = (sprite.filters || []).filter((f) => !(f instanceof ChooserSelectionFilter));
            }
        }

        this.activeFilters.clear();
        this.stopAnimation();
    }
}
