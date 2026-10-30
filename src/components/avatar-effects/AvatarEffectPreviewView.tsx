import { GetRoomEngine, RoomPreviewer } from '@octane/renderer';
import { CSSProperties, FC, useEffect, useState } from 'react';
import { LayoutRoomPreviewerView, PIXEL_ART_RENDERING } from '../../common';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

interface AvatarEffectPreviewViewProps {
    figure: string;
    gender: string;
    direction: number;
    effect: number;
    height?: number;
    zoom?: number;
}

export const AvatarEffectPreviewView: FC<AvatarEffectPreviewViewProps> = (props) => {
    const { figure = '', gender = 'M', direction = 4, effect = 0, height = 280, zoom = 1 } = props;
    const [roomPreviewer, setRoomPreviewer] = useState<RoomPreviewer>(null);

    const renderHeight = Math.floor(height / zoom);

    useEffect(() => {
        const previewer = new RoomPreviewer(GetRoomEngine(), ++RoomPreviewer.PREVIEW_COUNTER);
        setRoomPreviewer(previewer);

        return () => {
            previewer.dispose();
        };
    }, []);

    useEffect(() => {
        if (!roomPreviewer || !figure) return;

        roomPreviewer.addAvatarIntoRoom(figure, 0);
    }, [roomPreviewer, figure]);

    useEffect(() => {
        if (!roomPreviewer || !figure) return;

        roomPreviewer.updateObjectUserFigure(figure, gender);
    }, [roomPreviewer, figure, gender]);

    useEffect(() => {
        if (!roomPreviewer || !figure) return;

        roomPreviewer.updateUserEffect(effect);
    }, [roomPreviewer, figure, effect]);

    useEffect(() => {
        if (!roomPreviewer || !figure) return;

        roomPreviewer.updateAvatarDirection(direction, direction);
    }, [roomPreviewer, figure, direction]);

    if (!roomPreviewer) return null;

    if (zoom === 1) {
        return <LayoutRoomPreviewerView roomPreviewer={roomPreviewer} height={height} />;
    }

    const outerStyle: CSSProperties = {
        position: 'absolute',
        inset: 0,
        overflow: 'hidden'
    };

    const innerStyle: CSSProperties = {
        width: `${100 / zoom}%`,
        height: `${100 / zoom}%`,
        transform: `scale(${zoom})`,
        transformOrigin: 'top left',
        imageRendering: PIXEL_ART_RENDERING
    };

    return (
        <NativeTextTree>
            <div style={outerStyle}>
                <div style={innerStyle}>
                    <LayoutRoomPreviewerView roomPreviewer={roomPreviewer} height={renderHeight} />
                </div>
            </div>
        </NativeTextTree>
    );
};
