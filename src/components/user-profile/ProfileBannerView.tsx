import { UserProfileParser } from '@octane/renderer';
import { CSSProperties, FC, PropsWithChildren } from 'react';
import { findProfileBanner, ProfileBannerEntry, profileGalleryBannerStyle, profileImageUrl } from '../../api';

interface ProfileBannerViewProps {
    userProfile: UserProfileParser;
    banners: ReadonlyArray<ProfileBannerEntry>;
    /** Draws an empty strip when there is no banner, instead of nothing. */
    placeholder?: boolean;
    className?: string;
}

/**
 * The banner across the top of the profile window. An uploaded picture was cropped to the banner's
 * shape and fills it; a gallery picture is pixel art and is shown at its own size, so it stays sharp.
 */
export const ProfileBannerView: FC<PropsWithChildren<ProfileBannerViewProps>> = ({ userProfile, banners, placeholder = false, className = '', children }) => {
    const custom = userProfile.bannerImage ?? '';
    const entry = custom ? null : findProfileBanner(banners, userProfile.bannerId ?? 0);

    if (!custom && !entry && !placeholder) return null;

    let style: CSSProperties | undefined;
    let modifier = 'empty';

    if (custom) {
        style = { backgroundImage: `url(${profileImageUrl(custom)})` };
        modifier = 'custom';
    } else if (entry) {
        style = profileGalleryBannerStyle(entry);
        modifier = 'gallery';
    }

    return (
        <div className={`octane-extended-profile__banner octane-extended-profile__banner--${modifier} ${className}`} style={style} data-testid="profile-banner">
            {children}
        </div>
    );
};
