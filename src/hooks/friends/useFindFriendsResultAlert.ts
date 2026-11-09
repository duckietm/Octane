import { registerSharedHook } from '@/state/useSharedHook';
import { FindFriendsProcessResultEvent } from '@octane/renderer';
import { localizeWithFallback } from '../../api';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';

/** "Find new friends" found no room to send you to: say so instead of doing nothing. */
const useFindFriendsResultAlertState = () => {
    const { simpleAlert = null } = useNotification();

    useMessageEvent<FindFriendsProcessResultEvent>(FindFriendsProcessResultEvent, (event) => {
        if (event.getParser().success) return;

        simpleAlert(
            localizeWithFallback('friendbar.find.error.text', 'No room with people to meet right now. Try again in a little while.'),
            null,
            null,
            null,
            localizeWithFallback('friendbar.find.error.title', 'Find new friends')
        );
    });

    return {};
};

registerSharedHook(useFindFriendsResultAlertState);
