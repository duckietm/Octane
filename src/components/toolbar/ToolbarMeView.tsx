import { CreateLinkEvent, GetRoomEngine, GetSessionDataManager, RoomObjectCategory } from '@octane/renderer';
import { Dispatch, FC, PropsWithChildren, SetStateAction, useEffect, useRef } from 'react';
import { DispatchUiEvent, GetConfigurationValue, GetRoomSession, GetUserProfile, localizeWithFallback } from '../../api';
import { Flex, LayoutItemCountView } from '../../common';
import { GuideToolEvent } from '../../events';
import { useDailyTasks, useRewardTracks } from '../../hooks';
import { isCollectiblesEnabled } from '../../hooks/collectibles/useCollectibles';
import { useGroupForumUnreadStore } from '../../state/groupForumUnreadStore';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

/** One region of the official me_menu_new_view: a 32x30 icon over its 9 px caption (field_text). */
const MeMenuItem: FC<{ name: string; iconClassName: string; label: string; count?: number; onClick: () => void }> = ({
    name,
    iconClassName,
    label,
    count = 0,
    onClick
}) => (
    <BaseButton type="button" className="octane-toolbar-me-item" data-name={name} aria-label={label} onClick={onClick}>
        <span className={`octane-toolbar-me-icon ${iconClassName}`} />
        <span className="octane-toolbar-me-label">{label}</span>
        {count > 0 && <LayoutItemCountView className="octane-toolbar-count" count={count} />}
    </BaseButton>
);

export const ToolbarMeView: FC<
    PropsWithChildren<{
        useGuideTool: boolean;
        unseenAchievementCount: number;
        setMeExpanded: Dispatch<SetStateAction<boolean>>;
    }>
> = (props) => {
    const { useGuideTool = false, unseenAchievementCount = 0, setMeExpanded = null, children = null, ...rest } = props;
    const elementRef = useRef<HTMLDivElement>(null);
    const { unseenCount: unseenDailyTaskCount = 0 } = useDailyTasks();
    const { unseenCount: unseenRewardTrackCount = 0 } = useRewardTracks();
    // GroupForumController.UNSEEN_FORUMS_COUNT: the reader's forums with unread messages.
    const unreadForumsCount = useGroupForumUnreadStore((state) => state.unreadForumsCount);

    useEffect(() => {
        const roomSession = GetRoomSession();

        if (!roomSession) return;

        GetRoomEngine().selectRoomObject(roomSession.roomId, roomSession.ownRoomIndex, RoomObjectCategory.UNIT);
    }, []);

    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            if (elementRef.current && elementRef.current.contains(event.target as Node)) return;

            setMeExpanded(false);
        };

        const timeout = window.setTimeout(() => document.addEventListener('click', onClick), 0);

        return () => {
            window.clearTimeout(timeout);
            document.removeEventListener('click', onClick);
        };
    }, [setMeExpanded]);

    return (
        <NativeTextTree>
            <Flex
                alignItems="center"
                className="octane-toolbar-me bg-[rgba(85,85,85,0.95)] border border-[solid] border-[#3d3d3d] [box-shadow:inset_2px_2px_rgba(255,255,255,.1),inset_-2px_-2px_rgba(0,0,0,.15)] rounded-[6px] p-2"
                gap={2}
                innerRef={elementRef}
            >
                {GetConfigurationValue('guides.enabled') && useGuideTool && (
                    <MeMenuItem
                        name="guide"
                        iconClassName="octane-icon icon-me-helper-tool"
                        label={localizeWithFallback('widget.memenu.guide', 'Guide')}
                        onClick={() => DispatchUiEvent(new GuideToolEvent(GuideToolEvent.TOGGLE_GUIDE_TOOL))}
                    />
                )}
                <MeMenuItem
                    name="achievements"
                    iconClassName="octane-icon icon-me-achievements"
                    label={localizeWithFallback('widget.memenu.achievements', 'Achievements')}
                    count={unseenAchievementCount}
                    onClick={() => CreateLinkEvent('achievements/toggle')}
                />
                <MeMenuItem
                    name="quests"
                    iconClassName="icon-me-quests"
                    label={localizeWithFallback('toolbar.me.quests', 'Quests')}
                    onClick={() => CreateLinkEvent('quests/toggle')}
                />
                <MeMenuItem
                    name="dailytasks"
                    iconClassName="icon-me-dailytasks"
                    label={localizeWithFallback('toolbar.me.dailytasks', 'Daily rewards')}
                    count={unseenDailyTaskCount}
                    onClick={() => CreateLinkEvent('dailytasks/toggle')}
                />
                <MeMenuItem
                    name="rewardtrack"
                    iconClassName="icon-me-rewardtrack"
                    label={localizeWithFallback('toolbar.me.rewardtrack', 'Reward track')}
                    count={unseenRewardTrackCount}
                    onClick={() => CreateLinkEvent('reward_track/toggle')}
                />
                {GetConfigurationValue<boolean>('talent.track.enabled', true) && (
                    <MeMenuItem
                        name="talents"
                        iconClassName="icon-me-talents"
                        label={localizeWithFallback('widget.memenu.talents', 'Talents')}
                        onClick={() => CreateLinkEvent('talent/open/current')}
                    />
                )}
                <MeMenuItem
                    name="profile"
                    iconClassName="octane-icon icon-me-profile"
                    label={localizeWithFallback('widget.memenu.profile', 'Profile')}
                    onClick={() => GetUserProfile(GetSessionDataManager().userId)}
                />
                <MeMenuItem
                    name="rooms"
                    iconClassName="octane-icon icon-me-rooms"
                    label={localizeWithFallback('widget.memenu.myrooms', 'Rooms')}
                    onClick={() => CreateLinkEvent('navigator/search/myworld_view')}
                />
                <MeMenuItem
                    name="clothes"
                    iconClassName="octane-icon icon-me-clothing"
                    label={localizeWithFallback('widget.memenu.editavatar', 'Clothes')}
                    onClick={() => CreateLinkEvent('avatar-editor/toggle')}
                />
                <MeMenuItem
                    name="badgecreator"
                    iconClassName="octane-icon icon-me-badge-creator"
                    label={localizeWithFallback('toolbar.icon.label.badge_creator', 'Badges')}
                    onClick={() => CreateLinkEvent('badge-creator/toggle')}
                />
                {isCollectiblesEnabled() && (
                    <MeMenuItem
                        name="collectibles"
                        iconClassName="icon-me-collectibles"
                        label={localizeWithFallback('memenu.collectibles', 'Collectibles')}
                        onClick={() => CreateLinkEvent('collectibles/open')}
                    />
                )}
                <MeMenuItem
                    name="settings"
                    iconClassName="octane-icon icon-me-settings"
                    label={localizeWithFallback('widget.memenu.settings', 'Settings')}
                    onClick={() => CreateLinkEvent('user-settings/toggle')}
                />
                <MeMenuItem
                    name="forums"
                    iconClassName="octane-icon icon-me-forums"
                    label={localizeWithFallback('widget.memenu.forums', 'Forums')}
                    count={unreadForumsCount}
                    onClick={() => CreateLinkEvent('groupforum/toggle')}
                />
                {children}
            </Flex>
        </NativeTextTree>
    );
};
