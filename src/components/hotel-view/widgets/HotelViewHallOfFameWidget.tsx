import type { HallOfFameEntryData } from '@octane/renderer';
import { ForwardToACompetitionRoomMessageComposer } from '@octane/renderer';
import { CSSProperties, FC, ReactNode, useState } from 'react';
import { GetConfigurationValue, GetUserProfile, localizeWithFallback, SendMessageComposer } from '../../../api';
import {
    HALL_OF_FAME_DIRECTIONS,
    HALL_OF_FAME_MAX_USERS,
    HALL_OF_FAME_Y_OFFSETS,
    parseNumberArray
} from '../../../api/hotel-view/LandingViewWidgets';
import goToRoomIcon from '../../../assets/images/hotelview/competition/go_to_room_icon.png';
import { BaseButton } from '../../../common/BaseButton';
import { LayoutAvatarImageView } from '../../../common';
import { Hint } from '../../../common/Tooltip';
import { useCommunityGoalHallOfFame, useCommunityGoalProgress } from '../../../hooks';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

/** The goal the hall of fame lists: the slot's own code, else the client's schedule, else the active goal. */
const useHallOfFameSource = (slotGoalCode: string) => {
    const { goal = null } = useCommunityGoalProgress();
    const schedulingStr = slotGoalCode ? '' : GetConfigurationValue<string>('landing.view.dynamic.slot.6.conf', '') || '';
    const goalCode = slotGoalCode || (schedulingStr ? '' : goal?.goalCode || '');

    return useCommunityGoalHallOfFame(goalCode, schedulingStr);
};

/**
 * CommunityGoalHallOfFameWidget (UserListWidget, user_list.xml + user_entry.xml +
 * competition_user_popup.xml): the ten best players of the goal side by side, the popup with name,
 * points and `landing.view.competition.hof.<goal>.rankdesc.leader` over the hovered one (the
 * leader when none is hovered), a click opens the profile and, with
 * `landing.view.communitygoalhof.hasroomlink`, a room icon goes to the player's competition room.
 * Without players the slot shows its own texts.
 */
export const HotelViewHallOfFameWidget: FC<{ fallback: ReactNode; title: string; goalCode: string }> = ({ fallback, title, goalCode }) => {
    const data = useHallOfFameSource(goalCode);
    const [hovered, setHovered] = useState(-1);
    const users: HallOfFameEntryData[] = (data?.hof ?? []).slice(0, HALL_OF_FAME_MAX_USERS);

    if (!data || !users.length) return <>{fallback}</>;

    const code = data.goalCode;
    const yOffsets = parseNumberArray(GetConfigurationValue<string>(`landing.view.${code}.avatarlist.yoffsets.array`, ''), HALL_OF_FAME_Y_OFFSETS);
    const hasRoomLink = GetConfigurationValue<boolean>('landing.view.communitygoalhof.hasroomlink', false) === true;
    const popupIndex = hovered >= 0 && hovered < users.length ? hovered : 0;
    const popupUser = users[popupIndex];

    return (
        <NativeTextTree>
            <div className="hotelview-competition-hof">
                {title && <span className="hotelview-widget-title">{title}</span>}
                <div className="hotelview-competition-hof-list" onPointerLeave={() => setHovered(-1)}>
                    <div className="hotelview-competition-hof-popup" style={{ '--hof-index': popupIndex } as CSSProperties}>
                        <div className="hotelview-competition-hof-popup-body">
                            <strong>{popupUser.userName}</strong>
                            <span className="hotelview-competition-hof-points">
                                {localizeWithFallback('landing.view.competition.hof.points', '%points%', ['points'], [String(popupUser.currentScore)])}
                            </span>
                            <span className="hotelview-competition-hof-rankdesc">
                                {localizeWithFallback(`landing.view.competition.hof.${code}.rankdesc.leader`, '')}
                            </span>
                        </div>
                    </div>
                    {users.map((user, index) => (
                        <div
                            key={user.userId}
                            className="hotelview-competition-hof-entry"
                            style={{ '--hof-index': index, '--hof-offset': `${yOffsets[index] ?? 0}px` } as CSSProperties}
                            onPointerEnter={() => setHovered(index)}
                        >
                            <Hint content={localizeWithFallback('group.members.showinfo', 'Show the profile')}>
                                <BaseButton
                                    type="button"
                                    className="hotelview-competition-hof-avatar"
                                    aria-label={user.userName}
                                    onFocus={() => setHovered(index)}
                                    onClick={() => GetUserProfile(user.userId)}
                                >
                                    <LayoutAvatarImageView figure={user.figure} direction={HALL_OF_FAME_DIRECTIONS[index] ?? 2} />
                                </BaseButton>
                            </Hint>
                            {hasRoomLink && (
                                <BaseButton
                                    type="button"
                                    className="hotelview-competition-hof-room-link"
                                    aria-label={localizeWithFallback('navigator.roominfo.gotoroom', 'Go to room')}
                                    onClick={() => SendMessageComposer(new ForwardToACompetitionRoomMessageComposer(code, user.userId))}
                                >
                                    <img src={goToRoomIcon} alt="" draggable={false} />
                                </BaseButton>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </NativeTextTree>
    );
};
