import { FC, useEffect, useMemo, useRef, useState } from 'react';
import tile0 from '../../../assets/images/floorplaneditor/preview/tile_preview_0.png';
import tile1 from '../../../assets/images/floorplaneditor/preview/tile_preview_1.png';
import tile2 from '../../../assets/images/floorplaneditor/preview/tile_preview_2.png';
import tile3 from '../../../assets/images/floorplaneditor/preview/tile_preview_3.png';
import tile4 from '../../../assets/images/floorplaneditor/preview/tile_preview_4.png';
import tile5 from '../../../assets/images/floorplaneditor/preview/tile_preview_5.png';
import tile6 from '../../../assets/images/floorplaneditor/preview/tile_preview_6.png';
import tile7 from '../../../assets/images/floorplaneditor/preview/tile_preview_7.png';
import tile8 from '../../../assets/images/floorplaneditor/preview/tile_preview_8.png';
import tile9 from '../../../assets/images/floorplaneditor/preview/tile_preview_9.png';
import tileA from '../../../assets/images/floorplaneditor/preview/tile_preview_a.png';
import tileB from '../../../assets/images/floorplaneditor/preview/tile_preview_b.png';
import tileC from '../../../assets/images/floorplaneditor/preview/tile_preview_c.png';
import tileD from '../../../assets/images/floorplaneditor/preview/tile_preview_d.png';
import tileE from '../../../assets/images/floorplaneditor/preview/tile_preview_e.png';
import tileF from '../../../assets/images/floorplaneditor/preview/tile_preview_f.png';
import tileEntry from '../../../assets/images/floorplaneditor/preview/tile_preview_entry.png';
import { layoutAirPreview } from '../state/airPreview';
import { FloorplanState } from '../state/types';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

/** AIR's preview tiles in picture order: the 16 neighbour masks, then the door. */
const TILE_SOURCES = [tile0, tile1, tile2, tile3, tile4, tile5, tile6, tile7, tile8, tile9, tileA, tileB, tileC, tileD, tileE, tileF, tileEntry];

let tileImages: Promise<HTMLImageElement[]> | null = null;

const loadTileImages = (): Promise<HTMLImageElement[]> => {
    if (!tileImages) {
        tileImages = Promise.all(
            TILE_SOURCES.map(
                (source) =>
                    new Promise<HTMLImageElement>((resolve) => {
                        const image = new Image();

                        image.onload = () => resolve(image);
                        image.onerror = () => resolve(image);
                        image.src = source;
                    })
            )
        );
    }

    return tileImages;
};

/**
 * The floor plan preview of AIR's floor plan editor (FloorPlanPreviewer): the floor drawn tile by tile with AIR's
 * small preview pictures on a white bitmap, the door tile in green. A plain 2D canvas, cheap on every device.
 */
export const FloorplanAirPreview: FC<{ state: FloorplanState }> = ({ state }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [images, setImages] = useState<HTMLImageElement[] | null>(null);
    const layout = useMemo(() => layoutAirPreview(state.tiles, state.door), [state.tiles, state.door]);

    useEffect(() => {
        let alive = true;

        loadTileImages().then((loaded) => alive && setImages(loaded));

        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');

        if (!canvas || !context) return;

        canvas.width = Math.max(1, layout.width);
        canvas.height = Math.max(1, layout.height);
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        if (!images) return;

        for (const tile of layout.tiles) {
            const image = images[tile.picture];

            if (image?.complete && image.naturalWidth) context.drawImage(image, tile.x, tile.y);
        }
    }, [images, layout]);

    return (
        <NativeTextTree>
            <div className="fp-air-preview" data-testid="floorplan-preview-2d">
                <canvas ref={canvasRef} className="fp-air-preview-canvas" data-tiles={layout.tiles.length} />
            </div>
        </NativeTextTree>
    );
};
