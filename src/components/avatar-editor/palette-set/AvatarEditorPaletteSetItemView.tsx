import { IPartColor } from '@octane/renderer';
import { ButtonHTMLAttributes, CSSProperties, FC } from 'react';
import { ColorUtils, GetClubMemberLevel, GetConfigurationValue } from '../../../api';
import hcSmallSrc from '../../../assets/images/avatareditor/air/hc-small.png';

export const AvatarEditorPaletteSetItem: FC<
    {
        partColor: IPartColor;
        isSelected: boolean;
    } & ButtonHTMLAttributes<HTMLButtonElement>
> = (props) => {
    const { partColor = null, isSelected = false, className = '', style = {}, ...rest } = props;

    if (!partColor) return null;

    const isHC = !GetConfigurationValue<boolean>('hc.disabled', false) && partColor.clubLevel > 0;
    const isLocked = isHC && GetClubMemberLevel() < partColor.clubLevel;

    return (
        <button
            type="button"
            aria-pressed={isSelected}
            className={`avatar-editor-palette-item${isSelected ? ' is-selected' : ''}${isLocked ? ' is-locked' : ''}${className ? ` ${className}` : ''}`}
            style={style as CSSProperties}
            {...rest}
        >
            <span className="avatar-editor-palette-color" style={{ backgroundColor: ColorUtils.makeColorNumberHex(partColor.rgb & 0xffffff) }} />
            <span className="avatar-editor-palette-frame" />
            {isHC && <img className="avatar-editor-palette-hc" src={hcSmallSrc} alt="" draggable={false} />}
        </button>
    );
};
