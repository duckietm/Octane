import { registerSharedHook } from '@/state/useSharedHook';
import { FindFriendsProcessResultEvent } from '@octane/renderer';
import { localizeWithFallback } from '../../api';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';

/** The outcome of "Find new friends", as the official friend bar reports it: found a room to go to, or none. */
const useFindFriendsResultAlertState = () => {
    const { simpleAlert = null } = useNotification();

    useMessageEvent<FindFriendsProcessResultEvent>(FindFriendsProcessResultEvent, (event) => {
        const success = event.getParser().success;

        simpleAlert(
            success
                ? localizeWithFallback('friendbar.find.success.text', 'A room with people to meet was found. You are being taken there.')
                : localizeWithFallback('friendbar.find.error.text', 'No room with people to meet right now. Try again in a little while.'),
            null,
            null,
            null,
            localizeWithFallback(success ? 'friendbar.find.success.title' : 'friendbar.find.error.title', 'Find new friends')
        );
    });

    return {};
};

registerSharedHook(useFindFriendsResultAlertState);
