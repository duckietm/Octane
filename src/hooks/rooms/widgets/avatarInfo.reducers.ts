import type { RoomSessionFavoriteGroupUpdateEvent, RoomSessionUserBadgesEvent, RoomSessionUserFigureUpdateEvent } from '@octane/renderer';
import { dedupeBadges } from '../../../api/avatar/dedupeBadges';
import { AvatarInfoUser } from '../../../api/room/widgets/AvatarInfoUser';
import type { IAvatarInfo } from '../../../api/room/widgets/IAvatarInfo';

/**
 * Pure reducers consumed by useAvatarInfoWidget to update the inspected
 * AvatarInfoUser when room-session events fire. Exported standalone for
 * Vitest coverage — no React, no renderer dispatcher access.
 *
 * Each reducer returns the same reference if the event doesn't apply
 * (state unchanged) so React bail-outs work and consumers don't re-render
 * uselessly.
 */

const cloneAvatarInfoUser = (state: AvatarInfoUser): AvatarInfoUser => {
    const clone = new AvatarInfoUser(state.type);

    Object.assign(clone, state);

    return clone;
};

export const applyUserBadgesUpdate = (state: IAvatarInfo | null, event: RoomSessionUserBadgesEvent): IAvatarInfo | null => {
    if (!(state instanceof AvatarInfoUser)) return state;
    if (state.webID !== event.userId) return state;

    const dedupedBadges = dedupeBadges(event.badges);

    if (state.badges.join('') === dedupedBadges.join('')) return state;

    const next = cloneAvatarInfoUser(state);

    next.badges = dedupedBadges;

    return next;
};

export const applyUserFigureUpdate = (state: IAvatarInfo | null, event: RoomSessionUserFigureUpdateEvent): IAvatarInfo | null => {
    if (!(state instanceof AvatarInfoUser)) return state;
    if (state.roomIndex !== event.roomIndex) return state;

    const next = cloneAvatarInfoUser(state);

    next.figure = event.figure;
    next.motto = event.customInfo;
    next.achievementScore = event.activityPoints;
    next.nickIcon = event.nickIcon;
    next.prefixText = event.prefixText;
    next.prefixColor = event.prefixColor;
    next.prefixIcon = event.prefixIcon;
    next.prefixEffect = event.prefixEffect;
    next.displayOrder = event.displayOrder;
    next.backgroundId = event.backgroundId;
    next.standId = event.standId;
    next.overlayId = event.overlayId;
    next.cardBackgroundId = event.cardBackgroundId ?? 0;

    return next;
};

export const applyFavouriteGroupUpdate = (
    state: IAvatarInfo | null,
    event: RoomSessionFavoriteGroupUpdateEvent,
    resolveGroupBadge: (groupId: number) => string
): IAvatarInfo | null => {
    if (!(state instanceof AvatarInfoUser)) return state;
    if (state.roomIndex !== event.roomIndex) return state;

    const clearGroup = event.status === -1 || event.habboGroupId <= 0;
    const next = cloneAvatarInfoUser(state);

    next.groupId = clearGroup ? -1 : event.habboGroupId;
    next.groupName = clearGroup ? null : event.habboGroupName;
    next.groupBadgeId = clearGroup ? null : resolveGroupBadge(event.habboGroupId);

    return next;
};
