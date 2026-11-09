export class MessengerIconState {
    public static HIDDEN: number = 0;
    public static SHOW: number = 1;
    public static UNREAD: number = 2;
}

/**
 * AIR HabboFriendBarView: the messenger icon shows only while conversations are open in the window
 * (activeConversationsCount), and blinks for an unread one until it is clicked (notifyMessenger(false)); a message
 * arriving after the click starts it again.
 */
export const getMessengerIconState = (openConversations: number, hasUnread: boolean, blinkAcknowledged: boolean): number => {
    if (openConversations <= 0) return MessengerIconState.HIDDEN;

    return hasUnread && !blinkAcknowledged ? MessengerIconState.UNREAD : MessengerIconState.SHOW;
};
