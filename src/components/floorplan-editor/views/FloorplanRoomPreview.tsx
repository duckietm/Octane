import { GetRoomEngine, RoomPreviewer } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { LayoutRoomPreviewerView } from '../../../common/layout/LayoutRoomPreviewerView';
import { serializeTilemap } from '../state/encoding';
import { FloorplanState } from '../state/types';

type Props = {
    state: FloorplanState;
    height?: number;
};

export const FloorplanRoomPreview: FC<Props> = ({ state, height = 320 }) => {
    const [previewer, setPreviewer] = useState<RoomPreviewer | null>(null);

    useEffect(() => {
        const instance = new RoomPreviewer(GetRoomEngine(), ++RoomPreviewer.PREVIEW_COUNTER);

        setPreviewer(instance);

        return () => {
            instance.dispose();
            setPreviewer((prev) => (prev === instance ? null : prev));
        };
    }, []);

    const tilemap = useMemo(() => serializeTilemap(state.tiles), [state.tiles]);

    useEffect(() => {
        if (!previewer) return;
        if (!tilemap) return;
        previewer.updatePreviewModel(tilemap, Math.max(0, state.wallHeight - 1), true);
    }, [previewer, tilemap, state.wallHeight]);

    if (!previewer) return <div className="w-full" style={{ height }} />;

    return <LayoutRoomPreviewerView roomPreviewer={previewer} height={height} />;
};
