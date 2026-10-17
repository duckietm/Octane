import { IRoomCameraWidgetEffect } from '@octane/renderer';
import { FC } from 'react';
import { FaTimes } from 'react-icons/fa';
import { LocalizeText } from '../../../../../api';
import { BaseButton } from '../../../../../common/BaseButton';
import { ToggleButton } from '../../../../../common/ToggleButton';

export interface CameraWidgetEffectListItemViewProps {
    effect: IRoomCameraWidgetEffect;
    thumbnailUrl: string;
    isActive: boolean;
    isLocked: boolean;
    isSelected: boolean;
    selectEffect: () => void;
    removeEffect: () => void;
}

export const CameraWidgetEffectListItemView: FC<CameraWidgetEffectListItemViewProps> = (props) => {
    const { effect = null, thumbnailUrl = null, isActive = false, isLocked = false, isSelected = false, selectEffect = null, removeEffect = null } = props;
    const title = isLocked ? `${LocalizeText('camera.effect.required.level')} ${effect.minLevel}` : LocalizeText(`camera.effect.name.${effect.name}`);

    return (
        <div
            className={[
                'octane-camera-effect',
                isActive && effect.type !== 'frame' && 'octane-camera-effect--active',
                isSelected && 'octane-camera-effect--selected',
                isLocked && 'octane-camera-effect--locked'
            ]
                .filter(Boolean)
                .join(' ')}
            title={title}
        >
            <ToggleButton type="button" className="octane-camera-effect__select" disabled={isLocked} aria-label={title} pressed={isActive} onClick={selectEffect}>
                {!isLocked && thumbnailUrl && <img alt="" src={thumbnailUrl} />}
                {isLocked && (
                    <span className="octane-camera-effect__lock" aria-hidden="true">
                        ?
                    </span>
                )}
            </ToggleButton>
            {isActive && (
                <BaseButton type="button" className="octane-camera-effect__remove" aria-label={LocalizeText('camera.delete.button.text')} onClick={removeEffect}>
                    <FaTimes aria-hidden="true" />
                </BaseButton>
            )}
        </div>
    );
};
