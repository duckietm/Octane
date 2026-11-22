import { UserProfileParser } from '@octane/renderer';
import { FC } from 'react';
import { ProfileBannerEntry } from '../../api';
import { ProfileAvatarFrameView } from './ProfileAvatarFrameView';
import { ProfileBannerMoveButton } from './ProfileBannerMoveButton';
import { ProfileBannerView } from './ProfileBannerView';

interface ProfileCustomizePreviewViewProps {
    userProfile: UserProfileParser;
    banners: ReadonlyArray<ProfileBannerEntry>;
    /** When set, dragging or clicking the banner opens the editor to move it. */
    onMoveBanner?: () => void;
}

/** The top of the profile window as it looks now, above the customiser's choices. */
export const ProfileCustomizePreviewView: FC<ProfileCustomizePreviewViewProps> = ({ userProfile, banners, onMoveBanner }) => (
    <div className="octane-profile-customize__preview">
        <ProfileBannerView userProfile={userProfile} banners={banners} placeholder className="octane-profile-customize__preview-banner">
            {onMoveBanner && <ProfileBannerMoveButton onMove={onMoveBanner} />}
        </ProfileBannerView>
        <div className="octane-profile-customize__preview-identity">
            <ProfileAvatarFrameView
                figure={userProfile.figure}
                backgroundId={userProfile.backgroundId}
                standId={userProfile.standId}
                overlayId={userProfile.overlayId}
                borderId={userProfile.borderId}
                scale={0.6}
            />
            <span className="octane-profile-customize__preview-name">{userProfile.username}</span>
        </div>
    </div>
);
