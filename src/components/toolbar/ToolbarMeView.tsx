import { CreateLinkEvent, GetRoomEngine, GetSessionDataManager, RoomObjectCategory, TalentTrackComposer } from '@octane/renderer';
import { Dispatch, FC, PropsWithChildren, SetStateAction, useEffect, useRef } from 'react';
import { DispatchUiEvent, GetConfigurationValue, GetRoomSession, GetUserProfile, LocalizeText, localizeWithFallback, SendMessageComposer } from '../../api';
import { Flex, LayoutItemCountView } from '../../common';
import { GuideToolEvent } from '../../events';
import { useDailyTasks, useGroupForumUnread, useRewardTracks } from '../../hooks';

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
    const { unreadForumsCount = 0 } = useGroupForumUnread();
    // Official MeMenuNewController: "talents" and "collectibles" only show when the hotel enables them.
    const talentTrackEnabled = GetConfigurationValue<boolean>('talent.track.enabled', false);
    const collectiblesEnabled = GetConfigurationValue<boolean>('collectibles.hub.enabled', false);

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
        <Flex
            alignItems="center"
            className="bg-[rgba(85,85,85,0.95)] border border-[solid] border-[#3d3d3d] [box-shadow:inset_2px_2px_rgba(255,255,255,.1),inset_-2px_-2px_rgba(0,0,0,.15)] rounded-[6px] p-2"
            gap={2}
            innerRef={elementRef}
        >
            {GetConfigurationValue('guides.enabled') && useGuideTool && (
                <div
                    className="navigation-item relative octane-icon icon-me-helper-tool cursor-pointer"
                    onClick={(event) => DispatchUiEvent(new GuideToolEvent(GuideToolEvent.TOGGLE_GUIDE_TOOL))}
                />
            )}
            <div
                className="navigation-item relative octane-icon icon-me-achievements cursor-pointer"
                onClick={(event) => CreateLinkEvent('achievements/toggle')}
            >
                {unseenAchievementCount > 0 && <LayoutItemCountView count={unseenAchievementCount} />}
            </div>
            <div
                className="navigation-item relative icon-me-quests cursor-pointer"
                title={localizeWithFallback('toolbar.me.quests', 'Quests')}
                onClick={(event) => CreateLinkEvent('quests/toggle')}
            />
            <div
                className="navigation-item relative icon-me-dailytasks cursor-pointer"
                title={localizeWithFallback('toolbar.me.dailytasks', 'Daily rewards')}
                onClick={(event) => CreateLinkEvent('dailytasks/toggle')}
            >
                {unseenDailyTaskCount > 0 && <LayoutItemCountView count={unseenDailyTaskCount} />}
            </div>
            <div
                className="navigation-item relative icon-me-rewardtrack cursor-pointer"
                title={localizeWithFallback('toolbar.me.rewardtrack', 'Reward track')}
                onClick={(event) => CreateLinkEvent('reward_track/toggle')}
            >
                {unseenRewardTrackCount > 0 && <LayoutItemCountView count={unseenRewardTrackCount} />}
            </div>
            <div
                className="navigation-item relative octane-icon icon-me-profile cursor-pointer"
                onClick={(event) => GetUserProfile(GetSessionDataManager().userId)}
            />
            <div
                className="navigation-item relative octane-icon icon-me-rooms cursor-pointer"
                onClick={(event) => CreateLinkEvent('navigator/search/myworld_view')}
            />
            <div className="navigation-item relative octane-icon icon-me-clothing cursor-pointer" onClick={(event) => CreateLinkEvent('avatar-editor/toggle')} />
            <div
                className="navigation-item relative octane-icon icon-me-badge-creator cursor-pointer"
                onClick={(event) => CreateLinkEvent('badge-creator/toggle')}
                title={LocalizeText('toolbar.icon.label.badge_creator')}
            />
            <div className="navigation-item relative octane-icon icon-me-settings cursor-pointer" onClick={(event) => CreateLinkEvent('user-settings/toggle')} />
            <div
                className="navigation-item relative octane-icon icon-me-forums cursor-pointer"
                onClick={(event) => CreateLinkEvent('groupforum/toggle')}
                title={LocalizeText('toolbar.icon.label.forums')}
            >
                {unreadForumsCount > 0 && <LayoutItemCountView count={unreadForumsCount} />}
            </div>
            {talentTrackEnabled && (
                <div
                    className="navigation-item relative octane-icon icon-me-talents cursor-pointer"
                    title={localizeWithFallback('widget.memenu.talents', 'Talents')}
                    onClick={(event) => SendMessageComposer(new TalentTrackComposer(GetConfigurationValue<string>('talent.track.default', 'citizenship')))}
                />
            )}
            {collectiblesEnabled && (
                <div
                    className="navigation-item relative octane-icon icon-me-collectibles cursor-pointer"
                    title={localizeWithFallback('widget.memenu.collectibles', 'Collectibles')}
                    onClick={(event) => CreateLinkEvent('collectibles/open')}
                />
            )}
            {children}
        </Flex>
    );
};
