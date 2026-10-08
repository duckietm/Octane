import { FC } from 'react';
import { Base, LayoutAvatarImageView } from '../../common';

interface ProfilePreviewViewProps {
    figure: string;
    backgroundId: number | null;
    standId: number | null;
    overlayId: number | null;
    selected?: boolean;
    onClick?: () => void;
}

/** The profile picture as it looks in the info panel, for one choice in the picker. */
export const ProfilePreviewView: FC<ProfilePreviewViewProps> = ({ figure, backgroundId, standId, overlayId, selected = false, onClick }) => (
    <div
        className={`profile-preview profile-background background-${backgroundId ?? 'default'}${selected ? ' is-selected' : ''}`}
        data-testid="profile-preview"
        onClick={onClick}
    >
        <Base position="absolute" className={`profile-stand stand-${standId ?? 'default'}`} />
        <LayoutAvatarImageView direction={2} figure={figure} />
        <Base position="absolute" className={`profile-overlay overlay-${overlayId ?? 'default'}`} />
    </div>
);
