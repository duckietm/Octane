import { FC } from 'react';
import { MessengerThread } from '../../../../../api';
import { FriendsMessengerThreadGroup } from './FriendsMessengerThreadGroup';

export const FriendsMessengerThreadView: FC<{ thread: MessengerThread }> = (props) => {
    const { thread = null } = props;

    // The store marks the open conversation read (activeThreadId effect, sendMessage); changing the thread object
    // held in state from here would bypass React.
    if (!thread) return null;

    return <>{thread.groups.length > 0 && thread.groups.map((group, index) => <FriendsMessengerThreadGroup key={index} group={group} thread={thread} />)}</>;
};
