import { AvatarDirectionAngle } from '@octane/renderer';
import { FC, useState } from 'react';
import rotateSrc from '../../assets/images/avatareditor/air/rotate.png';
import { LayoutAvatarImageView } from '../../common';
import { useAvatarEditor } from '../../hooks';

const DEFAULT_DIRECTION: number = 4;

export const AvatarEditorFigurePreviewView: FC<{}> = (props) => {
    const [direction, setDirection] = useState<number>(DEFAULT_DIRECTION);
    const { getFigureString = null, gender = 'M' } = useAvatarEditor();

    const rotateFigure = (newDirection: number) => {
        if (newDirection < AvatarDirectionAngle.MIN_DIRECTION) {
            newDirection = AvatarDirectionAngle.MAX_DIRECTION + (newDirection + 1);
        }

        if (newDirection > AvatarDirectionAngle.MAX_DIRECTION) {
            newDirection -= AvatarDirectionAngle.MAX_DIRECTION + 1;
        }

        setDirection(newDirection);
    };

    return (
        <div className="octane-avatar-editor-preview-shell">
            <div className="figure-preview-container">
                <LayoutAvatarImageView direction={direction} figure={getFigureString} gender={gender} />
            </div>
            <button type="button" className="octane-avatar-editor-rotate" aria-label="Rotate avatar" onClick={() => rotateFigure(direction + 1)}>
                <img src={rotateSrc} alt="" draggable={false} />
            </button>
        </div>
    );
};
