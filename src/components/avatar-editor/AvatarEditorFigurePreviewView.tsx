import { AvatarDirectionAngle } from '@octane/renderer';
import { FC, useState } from 'react';
import rotateSrc from '../../assets/images/avatareditor/air/rotate.png';
import { LayoutAvatarImageView } from '../../common';
import { AvatarEffectPreviewView } from '../avatar-effects/AvatarEffectPreviewView';
import { useAvatarEditor } from '../../hooks';

const DEFAULT_DIRECTION: number = 4;
const AVATAR_DIRECTIONS: number = 8;

export const AvatarEditorFigurePreviewView: FC<{ effectType?: number }> = (props) => {
    const { effectType = 0 } = props;
    const [direction, setDirection] = useState<number>(DEFAULT_DIRECTION);
    const { getFigureString = null, gender = 'M' } = useAvatarEditor();

    const rotateFigure = () => {
        setDirection(curr => (curr + 1) % AVATAR_DIRECTIONS);
    };

    return (
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
            <button type="button" className="octane-avatar-editor-rotate" aria-label="Rotate avatar" onClick={rotateFigure}>
                <img src={rotateSrc} alt="" draggable={false} />
            </button>
        </div>
    );
};
