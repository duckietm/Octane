import { GetRoomEngine, Vector3d } from '@octane/renderer';
import { useEffect, useState } from 'react';
import { GetSessionDataManager } from '../../api';

/**
 * Asks the renderer for the furni of a scene and counts the pictures as they arrive: a furni drawn before its type
 * is loaded stays the renderer's black waiting cube, so a scene keys its furni on this count to draw them again.
 * Ids are for the furni a name does not find (`name*n`).
 */
export const useFurniLoads = (names: string[], ids: number[] = []): number => {
    const [ loads, setLoads ] = useState(0);
    const key = [ ...names, ...ids ].join(',');

    useEffect(() => {
        const engine = GetRoomEngine?.();
        const session = GetSessionDataManager();
        let active = true;
        const loaded = () => active && setLoads((count) => count + 1);
        const listener = { imageReady: loaded, imageFailed: loaded };
        const all = [ ...names.map((name) => session?.getFloorItemDataByName?.(name)?.id), ...ids ];

        for (const id of all) {
            try {
                if (engine && id !== undefined) engine.getFurnitureFloorImage(id, new Vector3d(0), 64, listener, 0, '', -1);
            } catch {
                // The renderer is not ready: the furni ask for themselves.
            }
        }

        return () => {
            active = false;
        };
    }, [ key ]);

    return loads;
};
