import { CreateLinkEvent } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { getQuestDescription, getQuestImageUrl, getQuestName, getQuestProgressPercent, localizeWithFallback } from '../../api';
import { LayoutProgressBar } from '../../common';
import { useQuests } from '../../hooks';

/** The official check animation: 13 frames over success_pic_1..6, then a 1 s close wait. */
const COMPLETION_FRAMES = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 4];
const COMPLETION_FRAME_MS = 200;
const COMPLETION_CLOSE_WAIT_MS = 1000;
const NEXT_QUEST_TIMEOUT_MS = 600;

/**
 * The quest tracker widget (192x132) the official client attaches to the toolbar while a quest is
 * accepted: quest name, image, description, progress bar and the "more info" link (in room only).
 */
export const QuestTrackerView: FC<{}> = () => {
    const { trackedQuest = null, completion = null, isInRoom = false, requestNextQuest = null, clearTrackedQuest = null } = useQuests();
    const [frame, setFrame] = useState(-1);

    const completing = completion && trackedQuest && completion.quest.id === trackedQuest.id;

    useEffect(() => {
        if (!completing) {
            setFrame(-1);

            return;
        }

        let index = 0;
        let cancelled = false;
        let timeout = 0;

        setFrame(COMPLETION_FRAMES[0]);

        const step = () => {
            if (cancelled) return;

            index++;

            if (index < COMPLETION_FRAMES.length) {
                setFrame(COMPLETION_FRAMES[index]);
                timeout = window.setTimeout(step, COMPLETION_FRAME_MS);

                return;
            }

            timeout = window.setTimeout(() => {
                if (cancelled) return;

                if (!completion.showDialog) {
                    requestNextQuest && requestNextQuest();
                    timeout = window.setTimeout(() => !cancelled && clearTrackedQuest && clearTrackedQuest(), NEXT_QUEST_TIMEOUT_MS);
                } else {
                    clearTrackedQuest && clearTrackedQuest();
                }
            }, COMPLETION_CLOSE_WAIT_MS);
        };

        timeout = window.setTimeout(step, COMPLETION_FRAME_MS);

        return () => {
            cancelled = true;
            window.clearTimeout(timeout);
        };
    }, [completing, completion, requestNextQuest, clearTrackedQuest]);

    if (!trackedQuest || !isInRoom || (!trackedQuest.accepted && !completing)) return null;

    if (trackedQuest.waitPeriodSeconds > 0) return null;

    const percent = completing ? 100 : getQuestProgressPercent(trackedQuest.completedSteps, trackedQuest.totalSteps);

    return (
        <div className="octane-quest-tracker">
            <div className="octane-quest-tracker-header">
                {localizeWithFallback('quests.tracker.caption', 'Quest: %quest_name%', ['quest_name'], [getQuestName(trackedQuest)])}
            </div>
            <div className="octane-quest-tracker-body">
                {frame > 0 ? (
                    <div className={`octane-quest-tracker-check octane-quest-tracker-check-${frame}`} />
                ) : (
                    <img className="octane-quest-tracker-image" src={getQuestImageUrl(trackedQuest)} alt="" draggable={false} />
                )}
                <div className="octane-quest-tracker-desc">{getQuestDescription(trackedQuest)}</div>
            </div>
            <LayoutProgressBar
                className="octane-quest-tracker-progress"
                progress={percent}
                maxProgress={100}
                text={localizeWithFallback(
                    'quests.tracker.progress',
                    '%progress% / %limit%',
                    ['progress', 'limit'],
                    [String(completing ? trackedQuest.totalSteps : trackedQuest.completedSteps), String(trackedQuest.totalSteps)]
                )}
            />
            <span className="octane-quest-tracker-moreinfo" onClick={() => CreateLinkEvent('quests/details')}>
                {localizeWithFallback('quests.tracker.moreinfo', 'More info')}
            </span>
        </div>
    );
};
