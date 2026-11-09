import { AddLinkEventTracker, ILinkEventTracker, NewUserExperienceScriptProceedComposer, RemoveLinkEventTracker } from '@octane/renderer';
import { useEffect, useState } from 'react';
import { IHelpBubbleItem, isLastHelpBubble, localizeWithFallback, parseHelpBubbleLink, SendMessageComposer } from '../../api';

/**
 * AIR UiHelpBubblesWidget: `helpBubble/add/...` queues pointer bubbles that are shown one at a
 * time; `helpBubble/remove/<KEY>` drops one. Closing the last bubble of the queue tells the server
 * the new user script can go on (RoomWidgetScriptProceedMessage), which sends the next step.
 */
export const useHelpBubbles = () => {
    const [queue, setQueue] = useState<IHelpBubbleItem[]>([]);
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const link = parseHelpBubbleLink(url);

                if (!link) return;

                if (link.action === 'add') {
                    const items = link.items.map((item) => ({ ...item, text: localizeWithFallback(item.text, item.text) }));

                    setQueue((current) => [...current, ...items]);
                    return;
                }

                setQueue((current) => current.filter((item) => item.name !== link.name));
            },
            eventUrlPrefix: 'helpBubble/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    const current = index < queue.length ? queue[index] : null;
    const isLast = isLastHelpBubble(queue.length, index);

    /** _rab4d0f57abd39b / _r5b493ceb3955f8: OK moves on; the last one also proceeds the script. */
    const closeBubble = () => {
        if (!current) return;

        if (isLast) {
            SendMessageComposer(new NewUserExperienceScriptProceedComposer(NewUserExperienceScriptProceedComposer.VERIFY));
            setQueue([]);
            setIndex(0);
            return;
        }

        setIndex((value) => value + 1);
    };

    /**
     * A bubble whose element is not on screen is skipped, as AIR disposes it and shows the next.
     * Unlike AIR the last one still proceeds the script, so a hidden element cannot stall the tour.
     */
    const skipBubble = closeBubble;

    return { current, isLast, closeBubble, skipBubble };
};
