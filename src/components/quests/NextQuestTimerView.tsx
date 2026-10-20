import { CreateLinkEvent } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import {
    formatQuestWaitTime,
    getNextQuestTimerCaption,
    getNextQuestTimerMessage,
    getQuestingImageUrl,
    getQuestWaitSecondsLeft,
    localizeWithFallback,
    NEXT_QUEST_TIMER_REFRESH_MS,
    QUEST_TIMER_IMAGE,
    SanitizeHtml
} from '../../api';
import { BaseButton } from '../../common/BaseButton';
import { useQuests } from '../../hooks';

/**
 * The official NextQuestTimer (NextQuestTimer.xml, 195x116): while the next quest of a campaign
 * waits, a small window docks in the toolbar extension slot with a live countdown. Contracted it is
 * only the 195x25 caption strip; a click on the bitmap expands it to the question mark, the
 * campaign's `delayedmsg` and, inside a room, the "more info" link. When the wait is over the quest
 * goes back to the tracker.
 */
export const NextQuestTimerView: FC<{}> = () => {
    const { trackedQuest = null, isInRoom = false, questClock = 0, releaseDelayedQuest = null } = useQuests();
    const [expanded, setExpanded] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const [missingArt, setMissingArt] = useState(false);
    const shownQuest = useRef(null);

    const secondsLeft = getQuestWaitSecondsLeft(trackedQuest, Math.max(now, questClock));
    const waiting = secondsLeft > 0;

    useEffect(() => {
        if (!waiting) return;

        shownQuest.current = trackedQuest;

        const interval = window.setInterval(() => setNow(Date.now()), NEXT_QUEST_TIMER_REFRESH_MS);

        return () => window.clearInterval(interval);
    }, [waiting, trackedQuest]);

    useEffect(() => {
        if (waiting || !trackedQuest || shownQuest.current !== trackedQuest) return;

        shownQuest.current = null;
        releaseDelayedQuest && releaseDelayedQuest(trackedQuest);
    }, [waiting, trackedQuest, releaseDelayedQuest]);

    if (!trackedQuest || !waiting) return null;

    const time = formatQuestWaitTime(secondsLeft);
    const background = getQuestingImageUrl(expanded ? 'quest_timer_expanded' : 'quest_timer_contracted');

    return (
        <div className="octane-next-quest-timer" data-expanded={expanded} data-missing-art={missingArt}>
            <img alt="" className="octane-next-quest-timer-bg" draggable={false} src={background} onError={() => setMissingArt(true)} />
            <BaseButton
                aria-expanded={expanded}
                aria-label={getNextQuestTimerCaption(expanded, time)}
                className="octane-next-quest-timer-toggle"
                onClick={() => setExpanded((value) => !value)}
            />
            <div className="octane-next-quest-timer-header">{getNextQuestTimerCaption(expanded, time)}</div>
            {expanded && (
                <>
                    <img alt="" className="octane-next-quest-timer-pic" draggable={false} src={getQuestingImageUrl(QUEST_TIMER_IMAGE)} />
                    <div
                        className="octane-next-quest-timer-desc"
                        dangerouslySetInnerHTML={{ __html: SanitizeHtml(getNextQuestTimerMessage(trackedQuest, time)) }}
                    />
                    {isInRoom && (
                        <BaseButton className="octane-next-quest-timer-moreinfo" onClick={() => CreateLinkEvent('quests/details')}>
                            {localizeWithFallback('quests.tracker.moreinfo', 'More info')}
                        </BaseButton>
                    )}
                </>
            )}
        </div>
    );
};
