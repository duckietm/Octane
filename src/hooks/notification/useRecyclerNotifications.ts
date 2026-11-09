import { RecyclerFinishedMessageEvent } from '@octane/renderer';
import { NotificationBubbleType } from '../../api';
import { localizeWithFallback } from '../../api/utils/localizeWithFallback';
import { useMessageEvent } from '../events';

type ShowSingleBubble = (message: string, type: string, imageUrl?: string) => void;

/** AIR HabboNotifications.onRecyclerFinished: a "recycle ok" bubble when the Furnimatic gave a prize. */
export const useRecyclerNotifications = (showSingleBubble: ShowSingleBubble) => {
    useMessageEvent<RecyclerFinishedMessageEvent>(RecyclerFinishedMessageEvent, (event) => {
        if (event.getParser()?.recyclerFinishedStatus !== RecyclerFinishedMessageEvent.FINISHED_OK) return;

        showSingleBubble(
            localizeWithFallback('notifications.text.recycle.ok', 'Recycling done! Your prize is in your inventory.'),
            NotificationBubbleType.RECYCLEROK
        );
    });
};
