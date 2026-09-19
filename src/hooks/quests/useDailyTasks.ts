import {
    ActiveDailyTasksMessageEvent,
    ClaimDailyTaskMessageComposer,
    DailyTaskData,
    DailyTasksAddedMessageEvent,
    DailyTaskUpdatedMessageEvent,
    GetDailyTasksMessageComposer
} from '@octane/renderer';
import { useCallback, useMemo, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { localizeWithFallback, NotificationBubbleType, SendMessageComposer, sortDailyTasks } from '../../api';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';

/** The official controller throttles list requests to one every ten seconds. */
export const DAILY_TASKS_REQUEST_TIMEOUT_MS = 10000;

const DAILY_TASKS_ICON = 'icon_daily_tasks_png';
const DAILY_TASKS_LINK = 'dailytasks/open';

/** DailyTasksController: the tasks of the day, their status updates and the unseen (claimable) count. */
const useDailyTasksState = () => {
    const [tasks, setTasks] = useState<DailyTaskData[]>([]);
    const lastRequestRef = useRef(0);
    const { showSingleBubble = null } = useNotification();

    const requestTasks = useCallback((force: boolean = false) => {
        const now = Date.now();

        if (!force && now <= lastRequestRef.current + DAILY_TASKS_REQUEST_TIMEOUT_MS) return;

        lastRequestRef.current = now;

        SendMessageComposer(new GetDailyTasksMessageComposer());
    }, []);

    const claimTask = useCallback((taskId: number) => SendMessageComposer(new ClaimDailyTaskMessageComposer(taskId)), []);

    const notify = useCallback(
        (key: string, fallback: string) => {
            if (!showSingleBubble) return;

            showSingleBubble(localizeWithFallback(key, fallback), NotificationBubbleType.INFO, DAILY_TASKS_ICON, DAILY_TASKS_LINK);
        },
        [showSingleBubble]
    );

    useMessageEvent<ActiveDailyTasksMessageEvent>(ActiveDailyTasksMessageEvent, (event) => {
        setTasks(sortDailyTasks(event.getParser().tasks));
    });

    useMessageEvent<DailyTasksAddedMessageEvent>(DailyTasksAddedMessageEvent, (event) => {
        const added = event.getParser().tasks;

        if (!added.length) return;

        setTasks((prevValue) => sortDailyTasks([...prevValue.filter((task) => !added.some((other) => other.taskId === task.taskId)), ...added]));

        if (added[0].isBonus) notify('dailytasks.bonus_available', 'A bonus task is available!');
    });

    useMessageEvent<DailyTaskUpdatedMessageEvent>(DailyTaskUpdatedMessageEvent, (event) => {
        const parser = event.getParser();

        setTasks((prevValue) => {
            const task = prevValue.find((existing) => existing.taskId === parser.taskId);

            if (!task) {
                requestTasks(true);

                return prevValue;
            }

            const previousStatus = task.status;

            task.repeats = parser.repeats;
            task.status = parser.status;
            task.rawSecondsLeft = parser.secondsLeft;

            if (previousStatus !== parser.status) {
                if (parser.status === DailyTaskData.STATUS_COMPLETED) notify('dailytasks.completed.caption', 'Daily task completed - claim your reward!');
                else if (parser.status === DailyTaskData.STATUS_CLAIMED) notify('dailytasks.claimed.caption', 'Daily task reward claimed!');
            }

            return [...prevValue];
        });
    });

    const unseenCount = useMemo(() => tasks.filter((task) => task.status === DailyTaskData.STATUS_COMPLETED).length, [tasks]);

    const unclaimedTasks = useMemo(() => tasks.filter((task) => task.isExpired), [tasks]);

    const activeTasks = useMemo(() => tasks.filter((task) => !task.isExpired), [tasks]);

    return { tasks, activeTasks, unclaimedTasks, unseenCount, requestTasks, claimTask };
};

registerSharedHook(useDailyTasksState);

export const useDailyTasks = () => useSharedHook(useDailyTasksState);
