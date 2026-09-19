import { GetRoomContentLoader, GetRoomObjectVisualizationFactory, RoomGeometry } from '@octane/renderer';

// How many animation states the loaded asset of a furni defines, or null when
// the asset is not loaded yet or the renderer does not expose the chain.
//
// The room engine has no public getter for this. The count lives in the
// animated visualization data the factory caches per type, which the barrel
// exports, so the read goes loader → factory → getAnimationCount behind
// typeof guards: a bundle that lacks any step yields null, never a throw.
export const readAssetStateCount = (classname: string): number | null => {
    if (!classname) return null;

    try {
        const loader = typeof GetRoomContentLoader === 'function' ? GetRoomContentLoader() : null;
        const collection = typeof loader?.getCollection === 'function' ? loader.getCollection(classname) : null;
        const data = collection?.data;
        if (!data) return null;

        const factory = typeof GetRoomObjectVisualizationFactory === 'function' ? GetRoomObjectVisualizationFactory() : null;
        if (typeof factory?.getVisualizationData !== 'function') return null;

        const visualization = factory.getVisualizationData(classname, data.visualizationType, data) as {
            getAnimationCount?: (scale: number) => number | null;
        } | null;
        if (typeof visualization?.getAnimationCount !== 'function') return 0;

        const scale = typeof RoomGeometry?.SCALE_ZOOMED_IN === 'number' ? RoomGeometry.SCALE_ZOOMED_IN : 64;
        const count = visualization.getAnimationCount(scale);

        return typeof count === 'number' && Number.isFinite(count) ? count : null;
    } catch {
        return null;
    }
};
