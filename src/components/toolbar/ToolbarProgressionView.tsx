import { CreateLinkEvent } from '@octane/renderer';
import { Dispatch, FC, SetStateAction, useEffect, useRef } from 'react';
import { GetConfigurationValue, localizeWithFallback } from '../../api';
import { Flex, LayoutItemCountView } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

/** One entry of the official prog_menu_view: an icon with its caption underneath. */
const ProgressionItem: FC<{ name: string; iconClassName: string; label: string; count?: number; onClick: () => void }> = ({
    name,
    iconClassName,
    label,
    count = 0,
    onClick
}) => (
    <BaseButton type="button" className="octane-toolbar-progression-item" data-name={name} aria-label={label} onClick={onClick}>
        <span className={`octane-toolbar-progression-icon ${iconClassName}`} />
        <span className="octane-toolbar-progression-label">{label}</span>
        {count > 0 && <LayoutItemCountView className="octane-toolbar-count" count={count} />}
    </BaseButton>
);

/**
 * ProgMenuController (prog_menu_view_xml): the progression icon's menu with daily tasks, quests,
 * achievements, leaderboards and the Introduction reward track (`reward_track/open/introduction`).
 */
export const ToolbarProgressionView: FC<{
    unseenAchievementCount: number;
    unseenDailyTaskCount: number;
    unseenRewardTrackCount: number;
    setExpanded: Dispatch<SetStateAction<boolean>>;
}> = ({ unseenAchievementCount = 0, unseenDailyTaskCount = 0, unseenRewardTrackCount = 0, setExpanded = null }) => {
    const elementRef = useRef<HTMLDivElement>(null);
    // The official menu hides quests with toolbar.hide.quests and daily tasks with dailytasks.enabled.
    const showQuests = !GetConfigurationValue<boolean>('toolbar.hide.quests', false);
    const showDailyTasks = GetConfigurationValue<boolean>('dailytasks.enabled', true) !== false;

    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            if (elementRef.current && elementRef.current.contains(event.target as Node)) return;

            setExpanded(false);
        };

        const timeout = window.setTimeout(() => document.addEventListener('click', onClick), 0);

        return () => {
            window.clearTimeout(timeout);
            document.removeEventListener('click', onClick);
        };
    }, [setExpanded]);

    const open = (link: string) => {
        setExpanded(false);
        CreateLinkEvent(link);
    };

    return (
        <NativeTextTree>
            <Flex
                alignItems="center"
                className="octane-toolbar-progression bg-[rgba(85,85,85,0.95)] border border-[solid] border-[#3d3d3d] [box-shadow:inset_2px_2px_rgba(255,255,255,.1),inset_-2px_-2px_rgba(0,0,0,.15)] rounded-[6px] p-2"
                gap={2}
                innerRef={elementRef}
            >
                {showDailyTasks && (
                    <ProgressionItem
                        name="dailytasks"
                        iconClassName="icon-me-dailytasks"
                        label={localizeWithFallback('widget.progmenu.dailytasks', 'Daily tasks')}
                        count={unseenDailyTaskCount}
                        onClick={() => open('dailytasks/open')}
                    />
                )}
                {showQuests && (
                    <ProgressionItem
                        name="quests"
                        iconClassName="icon-me-quests"
                        label={localizeWithFallback('widget.progmenu.quests', 'Quests')}
                        onClick={() => open('quests/toggle')}
                    />
                )}
                <ProgressionItem
                    name="achievements"
                    iconClassName="octane-icon icon-me-achievements"
                    label={localizeWithFallback('widget.progmenu.achievements', 'Achievements')}
                    count={unseenAchievementCount}
                    onClick={() => open('achievements/toggle')}
                />
                <ProgressionItem
                    name="leaderboards"
                    iconClassName="icon-progmenu-leaderboards"
                    label={localizeWithFallback('widget.progmenu.leaderboards', 'Leaderboards')}
                    onClick={() => open('badge-leaderboard/show')}
                />
                <ProgressionItem
                    name="introduction"
                    iconClassName="icon-me-rewardtrack"
                    label={localizeWithFallback('widget.progmenu.introduction', 'Introduction')}
                    count={unseenRewardTrackCount}
                    onClick={() => open('reward_track/open/introduction')}
                />
            </Flex>
        </NativeTextTree>
    );
};
