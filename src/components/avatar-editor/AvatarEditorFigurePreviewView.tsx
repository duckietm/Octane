import { AvatarDirectionAngle } from '@octane/renderer';
import { FC, useState } from 'react';
import rotateSrc from '../../assets/images/avatareditor/air/rotate.png';
import { LayoutAvatarImageView } from '../../common';
import { AvatarEffectPreviewView } from '../avatar-effects/AvatarEffectPreviewView';
import { useAvatarEditor } from '../../hooks';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { localizeWithFallback } from '../../api';
import { useIsHandheld } from '../../hooks/handheld/useHandheldLayout';

const DEFAULT_DIRECTION: number = 4;
const AVATAR_DIRECTIONS: number = 8;

export const AvatarEditorFigurePreviewView: FC<{ effectType?: number }> = (props) => {
    const { effectType = 0 } = props;
    const [direction, setDirection] = useState<number>(DEFAULT_DIRECTION);
    const { getFigureString = null, gender = 'M' } = useAvatarEditor();

    // Phone layout: the same preview, on the stage card of the phone sheet (HandheldLooks.css).
    const isHandheld = useIsHandheld();

    const rotateFigure = () => {
        setDirection(curr => (curr + 1) % AVATAR_DIRECTIONS);
    };

    if (isHandheld) {
        return (
            <NativeTextTree>
                <div className="octane-handheld-looks__preview">
                    <div className="octane-handheld-looks__figure" data-direction={direction}>
                        {effectType > 0 ? (
                            <div className="octane-handheld-looks__effect-preview">
                                <AvatarEffectPreviewView direction={direction} effect={effectType} figure={getFigureString} gender={gender} height={150} />
                            </div>
                        ) : (
                            <LayoutAvatarImageView direction={direction} figure={getFigureString} gender={gender} />
                        )}
                    </div>
                    <BaseButton className="octane-handheld-looks__rotate" aria-label={localizeWithFallback('octane.avatar_editor.rotate_avatar', 'Rotate avatar')} onClick={rotateFigure}>
                        <img src={rotateSrc} alt="" draggable={false} />
                    </BaseButton>
                </div>
            </NativeTextTree>
        );
    }

    return (
        <NativeTextTree>
            <div className="octane-avatar-editor-preview-shell">
                <div className="figure-preview-container">
                    {effectType > 0 ? (
                        <div className="octane-avatar-editor-effect-preview">
                            <AvatarEffectPreviewView direction={direction} effect={effectType} figure={getFigureString} gender={gender} height={210} />
                        </div>
                    ) : (
                        <LayoutAvatarImageView direction={direction} figure={getFigureString} gender={gender} />
                    )}
                </div>
                <BaseButton type="button" className="octane-avatar-editor-rotate" aria-label={localizeWithFallback('octane.avatar_editor.rotate_avatar', 'Rotate avatar')} onClick={rotateFigure}>
                    <img src={rotateSrc} alt="" draggable={false} />
                </BaseButton>
            </div>
        </NativeTextTree>
    );
};
