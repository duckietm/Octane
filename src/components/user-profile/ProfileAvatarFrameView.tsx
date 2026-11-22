import { CSSProperties, FC } from 'react';
import { isOutlineBorder, profileOutlineClass } from '../../api';
import { LayoutAvatarImageView } from '../../common';

/** The profile picture's size at scale 1, as the profile window draws it. */
export const PROFILE_AVATAR_FRAME_SIZE = { width: 68, height: 135 };

interface ProfileAvatarFrameViewProps {
    figure: string;
    backgroundId?: number | null;
    standId?: number | null;
    overlayId?: number | null;
    borderId?: number | null;
    /** Draws the same picture smaller, for the customiser's preview and choices. */
    scale?: number;
}

/**
 * The profile picture with its background, stand, effect and border: the one markup the profile window,
 * the customiser preview and the border choices share, so what is picked is what the profile shows.
 */
export const ProfileAvatarFrameView: FC<ProfileAvatarFrameViewProps> = ({ figure, backgroundId = 0, standId = 0, overlayId = 0, borderId = 0, scale = 1 }) => {
    const frame = (
        <div className={`octane-extended-profile__avatar-frame ${profileOutlineClass(borderId)}`}>
            <div className={`octane-extended-profile__avatar-shell profile-background background-${backgroundId ?? 'default'}`}>
                <div className={`octane-extended-profile__avatar-stand profile-stand stand-${standId ?? 'default'}`} />
                <LayoutAvatarImageView figure={figure} direction={2} classNames={['octane-extended-profile__avatar-image']} />
                <div className={`octane-extended-profile__avatar-overlay profile-overlay overlay-${overlayId ?? 'default'}`} />
            </div>
            {/* A colour border outlines the character itself; a decorated one is a frame around the picture. */}
            {!!borderId && !isOutlineBorder(borderId) && <div className={`infostand-border border-${borderId}`} data-testid="profile-border" />}
        </div>
    );

    if (scale === 1) return frame;

    const outer: CSSProperties = { width: PROFILE_AVATAR_FRAME_SIZE.width * scale, height: PROFILE_AVATAR_FRAME_SIZE.height * scale };
    const inner: CSSProperties = { transform: `scale(${scale})` };

    return (
        <div className="octane-extended-profile__avatar-scaled" style={outer}>
            <div className="octane-extended-profile__avatar-scaled-inner" style={inner}>
                {frame}
            </div>
        </div>
    );
};
