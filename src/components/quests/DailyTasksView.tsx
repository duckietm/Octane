import { AddLinkEventTracker, CreateLinkEvent, DailyTaskData, GetSessionDataManager, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { getDailyTaskImageUrl, getDailyTaskProgressPercent, getDailyTaskStyle, getDailyTasksWindowCaption, localizeWithFallback } from '../../api';
import { Button, DraggableWindowPosition, LayoutBadgeImageView, LayoutCurrencyIcon, LayoutProgressBar, Text } from '../../common';
import { useDailyTasks } from '../../hooks';
import { OctaneCard } from '../../layout';

const CURRENCY_TYPES: Record<string, number> = { credits: -1, duckets: 0, diamonds: 5 };

/** One row of the official daily tasks list (task_template 402x119). */
const DailyTaskRowView: FC<{ task: DailyTaskData; onClaim: (task: DailyTaskData) => void }> = ({ task, onClaim }) => {
    const [claiming, setClaiming] = useState(false);
    const style = getDailyTaskStyle(task.status, task.isBonus);
    const inProgress = task.status === DailyTaskData.STATUS_IN_PROGRESS;
    const claimed = task.status === DailyTaskData.STATUS_CLAIMED;

    useEffect(() => setClaiming(false), [task.status]);

    return (
        <div className={`octane-daily-task octane-daily-task-${style}`}>
            <div className="octane-daily-task-left">
                <div className="octane-daily-task-title">
                    <span>{localizeWithFallback(task.nameLocalizationKey, task.taskCode)}</span>
                    <span className="octane-daily-task-hint" title={localizeWithFallback(task.hintLocalizationKey, '')}>
                        ?
                    </span>
                </div>
                <div className="octane-daily-task-body">
                    <img className="octane-daily-task-image" src={getDailyTaskImageUrl(task)} alt="" draggable={false} />
                    <Text className="octane-daily-task-desc">{localizeWithFallback(task.descriptionLocalizationKey, '')}</Text>
                </div>
                {inProgress && (
                    <LayoutProgressBar
                        className="octane-daily-task-progress"
                        progress={getDailyTaskProgressPercent(task.repeats, task.requiredRepeats)}
                        maxProgress={100}
                        text={localizeWithFallback(
                            'quests.tracker.progress',
                            '%progress% / %limit%',
                            ['progress', 'limit'],
                            [String(task.repeats), String(task.requiredRepeats)]
                        )}
                    />
                )}
                {!inProgress && <div className="octane-daily-task-complete">{localizeWithFallback('dailytasks.task.complete', 'Task completed!')}</div>}
            </div>
            <div className="octane-daily-task-right">
                <div className="octane-daily-task-reward-title">{localizeWithFallback('dailytasks.reward', 'Reward')}</div>
                <div className="octane-daily-task-rewards">
                    {task.rewards.map((reward, index) => {
                        const type = reward.rewardTypeId.toLowerCase();

                        return (
                            <div key={index} className="octane-daily-task-reward">
                                {type in CURRENCY_TYPES && <LayoutCurrencyIcon type={CURRENCY_TYPES[type]} className="octane-daily-task-reward-icon" />}
                                {type === 'badge' && <LayoutBadgeImageView badgeCode={reward.extraParams} />}
                                {!(type in CURRENCY_TYPES) && type !== 'badge' && <div className="octane-daily-task-reward-generic">{reward.rewardTypeId}</div>}
                                {reward.amount > 1 && <span className="octane-daily-task-reward-amount">x{reward.amount}</span>}
                            </div>
                        );
                    })}
                </div>
                {!inProgress && (
                    <Button
                        variant="success"
                        className="octane-daily-task-claim"
                        disabled={claimed || claiming}
                        onClick={() => {
                            setClaiming(true);
                            onClaim(task);
                        }}
                    >
                        {claimed ? localizeWithFallback('dailytasks.claimed', 'Claimed') : localizeWithFallback('dailytasks.claim', 'Claim')}
                    </Button>
                )}
            </div>
        </div>
    );
};

/**
 * The official daily tasks window (428x553, `dailytasks/open`): the tasks of the day, the unclaimed
 * reminder for expired-but-completed tasks and the HC double-duckets footer.
 */
export const DailyTasksView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [showUnclaimed, setShowUnclaimed] = useState(false);
    const [, setTick] = useState(0);
    const { activeTasks = [], unclaimedTasks = [], requestTasks = null, claimTask = null } = useDailyTasks();

    const hasClub = GetSessionDataManager().clubLevel > 0;

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'open':
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((prevValue) => !prevValue);
                        return;
                }
            },
            eventUrlPrefix: 'dailytasks/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        requestTasks && requestTasks();

        const interval = window.setInterval(() => setTick((prevValue) => prevValue + 1), 1000);

        return () => window.clearInterval(interval);
    }, [isVisible, requestTasks]);

    const maxSecondsLeft = useMemo(() => activeTasks.reduce((max, task) => Math.max(max, task.secondsLeft), 0), [activeTasks]);

    useEffect(() => {
        if (!isVisible || !requestTasks) return;

        if (!activeTasks.length || maxSecondsLeft < -5) requestTasks();
    }, [isVisible, activeTasks.length, maxSecondsLeft, requestTasks]);

    if (!isVisible) return null;

    const onClaim = (task: DailyTaskData) => claimTask && claimTask(task.taskId);

    return (
        <>
            <OctaneCard className="octane-daily-tasks" uniqueKey="daily-tasks" windowPosition={DraggableWindowPosition.TOP_CENTER} offsetTop={-30}>
                <OctaneCard.Header headerText={getDailyTasksWindowCaption(maxSecondsLeft)} onCloseClick={() => setIsVisible(false)} />
                <OctaneCard.Content className="octane-daily-tasks-content">
                    {unclaimedTasks.length > 0 && (
                        <div className="octane-daily-tasks-extra">
                            <Button
                                variant="secondary"
                                title={localizeWithFallback('dailytasks.unclaimed.tooltip', 'Rewards of earlier days you have not claimed yet')}
                                onClick={() => setShowUnclaimed(true)}
                            >
                                {localizeWithFallback('dailytasks.unclaimed', 'Unclaimed rewards')}
                            </Button>
                        </div>
                    )}
                    <div className="octane-daily-tasks-list">
                        {activeTasks.map((task) => (
                            <DailyTaskRowView key={task.taskId} task={task} onClaim={onClaim} />
                        ))}
                    </div>
                    <div className="octane-quests-hc-info">
                        <Text small>
                            {hasClub
                                ? localizeWithFallback('hc.has.double_duckets.info', 'You get double duckets as you are an HC member!')
                                : localizeWithFallback('hc.get.double_duckets.info', 'Get HC membership to gain double duckets!')}
                        </Text>
                        {!hasClub && (
                            <Button variant="success" onClick={() => CreateLinkEvent('catalog/open/hc_membership')}>
                                {localizeWithFallback('generic.get_hc', 'Get HC')}
                            </Button>
                        )}
                    </div>
                </OctaneCard.Content>
            </OctaneCard>
            {showUnclaimed && (
                <OctaneCard
                    className="octane-daily-tasks octane-daily-tasks-unclaimed"
                    uniqueKey="daily-tasks-unclaimed"
                    windowPosition={DraggableWindowPosition.CENTER}
                >
                    <OctaneCard.Header
                        headerText={localizeWithFallback('dailytasks.unclaimed', 'Unclaimed rewards')}
                        onCloseClick={() => setShowUnclaimed(false)}
                    />
                    <OctaneCard.Content className="octane-daily-tasks-content">
                        <div className="octane-daily-tasks-list">
                            {unclaimedTasks.map((task) => (
                                <DailyTaskRowView key={task.taskId} task={task} onClaim={onClaim} />
                            ))}
                        </div>
                    </OctaneCard.Content>
                </OctaneCard>
            )}
        </>
    );
};
