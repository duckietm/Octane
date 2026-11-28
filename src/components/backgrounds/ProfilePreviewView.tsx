import { FC } from 'react';
import { figureUnderOverlay, PROFILE_AVATAR_DEFAULT_DIRECTION, profileAvatarOffsetStyle, profileOverlayOffsetStyle } from '../../api';
import { Base, LayoutAvatarImageView } from '../../common';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { ToggleButton } from '../../common/ToggleButton';

interface ProfilePreviewViewProps {
    figure: string;
    backgroundId: number | null;
    standId: number | null;
    overlayId: number | null;
    /** The direction the avatar faces, 0-7 (2 by default). */
    direction?: number;
    /** How far the avatar is moved in the picture, in pixels (0, 0 by default). */
    offsetX?: number;
    offsetY?: number;
    selected?: boolean;
    onClick?: () => void;
}

/** The profile picture as it looks in the info panel, for one choice in the picker. */
export const ProfilePreviewView: FC<ProfilePreviewViewProps> = ({
    figure,
    backgroundId,
    standId,
    overlayId,
    direction = PROFILE_AVATAR_DEFAULT_DIRECTION,
    offsetX = 0,
    offsetY = 0,
    selected = false,
    onClick
}) => (
    <NativeTextTree>
        <ToggleButton
            pressed={selected}
            className={`profile-preview profile-background background-${backgroundId ?? 'default'}${selected ? ' is-selected' : ''}`}
            data-testid="profile-preview"
            onClick={onClick}
        >
            <Base position="absolute" className={`profile-stand stand-${standId ?? 'default'}`} />
            <LayoutAvatarImageView direction={direction} figure={figureUnderOverlay(figure, overlayId)} style={profileAvatarOffsetStyle(offsetX, offsetY)} />
            <Base
                position="absolute"
                className={`profile-overlay overlay-${overlayId ?? 'default'}`}
                style={profileOverlayOffsetStyle(overlayId, offsetX, offsetY)}
            />
        </ToggleButton>
    </NativeTextTree>
);
