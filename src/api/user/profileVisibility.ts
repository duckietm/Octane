interface ProfileVisibilityInput {
    id: number;
    isHidden: boolean;
    friendsCount: number;
}

/**
 * "Hide my profile": the server leaves the friend count, groups, last online time and
 * relationships out for other viewers and sends -1 in place of the counts. The owner and
 * moderators get the real values, so only a hidden profile without them is cut here.
 */
export const isProfileHiddenFromViewer = (profile: ProfileVisibilityInput, viewerId: number): boolean =>
    !!profile && profile.isHidden && profile.id !== viewerId && profile.friendsCount < 0;

/** A count or time the server left out (-1) reads as "-". */
export const formatProfileValue = (value: number, hidden: boolean, format: (value: number) => string = String): string =>
    hidden || value < 0 ? '-' : format(value);
