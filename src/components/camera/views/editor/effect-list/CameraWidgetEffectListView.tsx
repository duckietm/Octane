import { IRoomCameraWidgetEffect, IRoomCameraWidgetSelectedEffect } from '@octane/renderer';
import { FC } from 'react';
import { CameraPictureThumbnail } from '../../../../../api';
import { CameraWidgetEffectListItemView } from './CameraWidgetEffectListItemView';

export interface CameraWidgetEffectListViewProps {
    myLevel: number;
    selectedEffectName: string;
    selectedEffects: IRoomCameraWidgetSelectedEffect[];
    effects: IRoomCameraWidgetEffect[];
    thumbnails: CameraPictureThumbnail[];
    processAction: (type: string, name: string) => void;
}

export const CameraWidgetEffectListView: FC<CameraWidgetEffectListViewProps> = (props) => {
    const { myLevel = 0, selectedEffectName = null, selectedEffects = [], effects = [], thumbnails = [], processAction = null } = props;

    return (
        <div className="octane-camera-effect-grid">
            {effects &&
                effects.length > 0 &&
                effects.map((effect) => {
                    const thumbnailUrl = thumbnails.find((thumbnail) => thumbnail.effectName === effect.name);
                    const isActive = selectedEffects.findIndex((selectedEffect) => selectedEffect.effect.name === effect.name) > -1;

                    return (
                        <CameraWidgetEffectListItemView
                            key={effect.name}
                            effect={effect}
                            thumbnailUrl={(thumbnailUrl && thumbnailUrl.thumbnailUrl) || null}
                            isActive={isActive}
                            isLocked={effect.minLevel > myLevel}
                            isSelected={selectedEffectName === effect.name}
                            selectEffect={() => processAction('select_effect', effect.name)}
                            removeEffect={() => processAction('remove_effect', effect.name)}
                        />
                    );
                })}
        </div>
    );
};
