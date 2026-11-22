import { UserProfileParser } from '@octane/renderer';
import { FC } from 'react';
import { ProfileBannerEntry } from '../../api';
import { LayoutAvatarImageView } from '../../common';
import { ProfileBannerMoveButton } from './ProfileBannerMoveButton';
import { ProfileBannerView } from './ProfileBannerView';

interface ProfileCustomizePreviewViewProps {
    userProfile: UserProfileParser;
    banners: ReadonlyArray<ProfileBannerEntry>;
    /** When set, dragging or clicking the banner opens the editor to move it. */
    onMoveBanner?: () => void;
}

/** The top of the profile window as it looks now, above the customiser's choices. */
export const ProfileCustomizePreviewView: FC<ProfileCustomizePreviewViewProps> = ({ userProfile, banners, onMoveBanner }) => {
    const borderId = userProfile.borderId ?? 0;

    return (
        <div className="octane-profile-customize__preview">
            <ProfileBannerView userProfile={userProfile} banners={banners} placeholder className="octane-profile-customize__preview-banner">
                {onMoveBanner && <ProfileBannerMoveButton onMove={onMoveBanner} />}
            </ProfileBannerView>
            <div className="octane-profile-customize__preview-identity">
                <div className="octane-extended-profile__avatar-frame">
                    <div className={`octane-profile-customize__preview-avatar profile-background background-${userProfile.backgroundId ?? 'default'}`}>
                        <div className={`profile-stand stand-${userProfile.standId ?? 'default'}`} />
                        <LayoutAvatarImageView figure={userProfile.figure} direction={2} />
                        <div className={`profile-overlay overlay-${userProfile.overlayId ?? 'default'}`} />
                    </div>
                    {borderId > 0 && <div className={`infostand-border border-${borderId}`} />}
                </div>
                <span className="octane-profile-customize__preview-name">{userProfile.username}</span>
            </div>
        </div>
    );
};
