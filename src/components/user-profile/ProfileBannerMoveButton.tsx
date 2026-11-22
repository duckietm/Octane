import { FC } from 'react';
import { localizeWithFallback } from '../../api';
import { BaseButton } from '../../common/BaseButton';

interface ProfileBannerMoveButtonProps {
    onMove: () => void;
}

/**
 * Covers the banner while the profile is being customised: pressing or starting to drag anywhere on it
 * opens the editor, where the picture is moved and zoomed.
 */
export const ProfileBannerMoveButton: FC<ProfileBannerMoveButtonProps> = ({ onMove }) => {
    const label = localizeWithFallback('extendedprofile.customize.banner.move', 'Move banner');

    return (
        <BaseButton aria-label={label} className="octane-extended-profile__banner-move" type="button" onClick={onMove}>
            <span className="octane-extended-profile__banner-move-label">{label}</span>
        </BaseButton>
    );
};
