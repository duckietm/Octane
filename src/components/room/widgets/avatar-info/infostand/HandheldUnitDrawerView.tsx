import { FC, ReactNode } from 'react';
import { FaUser } from 'react-icons/fa';
import { AvatarInfoPet, AvatarInfoRentableBot, AvatarInfoUser, GetUserProfile, IAvatarInfo, LocalizeText, localizeWithFallback } from '../../../../../api';
import { LayoutAvatarImageView, LayoutPetImageView } from '../../../../../common';
import { HandheldDrawerAction, HandheldInfoDrawer } from '../../../../../common/handheld/HandheldInfoDrawer';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';

interface HandheldUnitDrawerViewProps {
    /** A user, the player's own avatar, a bot, a rentable bot or a pet. */
    avatarInfo: IAvatarInfo;
    /** The infostand of the unit (profile picture, motto, badges, stats). */
    details: ReactNode;
    /** The context menu of the unit; inside the drawer its rows are the action buttons. */
    menu: ReactNode;
    expanded: boolean;
    onExpandedChange: (expanded: boolean) => void;
    onClose: () => void;
}

/**
 * The phone drawer of a selected avatar, bot or pet. The head shows its face, name and motto (a pet's breed);
 * the actions are the rows of the very menu the desktop opens over the avatar, so every one of them acts exactly
 * as there, sub-menus (moderate, dances, signs) included; the infostand is the drawer's details.
 */
export const HandheldUnitDrawerView: FC<HandheldUnitDrawerViewProps> = ({ avatarInfo, details, menu, expanded, onExpandedChange, onClose }) => {
    let picture: ReactNode = null;
    let subtitle: ReactNode = null;
    let profileId = 0;

    if (avatarInfo instanceof AvatarInfoPet) {
        picture = <LayoutPetImageView direction={2} figure={avatarInfo.petFigure} headOnly={true} posture={avatarInfo.posture} />;
        subtitle = LocalizeText(`pet.breed.${avatarInfo.petType}.${avatarInfo.petBreed}`);
    } else if (avatarInfo instanceof AvatarInfoUser || avatarInfo instanceof AvatarInfoRentableBot) {
        picture = <LayoutAvatarImageView direction={2} figure={avatarInfo.figure} headOnly={true} />;
        subtitle = avatarInfo.motto;

        if (avatarInfo instanceof AvatarInfoUser && avatarInfo.type !== AvatarInfoUser.BOT) profileId = avatarInfo.webID;
    }

    return (
        <NativeTextTree>
            <HandheldInfoDrawer
                actions={
                    <>
                        {profileId > 0 && (
                            <HandheldDrawerAction data-action="profile" icon={<FaUser />} onClick={() => GetUserProfile(profileId)}>
                                {localizeWithFallback('octane.handheld.drawer.profile', 'Profile')}
                            </HandheldDrawerAction>
                        )}
                        {menu}
                    </>
                }
                actionsLabel={localizeWithFallback('octane.handheld.drawer.section.actions', 'Actions')}
                details={details}
                expanded={expanded}
                label={localizeWithFallback('octane.handheld.drawer.title', 'Selected in the room')}
                picture={picture}
                subtitle={subtitle}
                title={(avatarInfo as { name?: string }).name ?? ''}
                onClose={onClose}
                onExpandedChange={onExpandedChange}
            />
        </NativeTextTree>
    );
};
