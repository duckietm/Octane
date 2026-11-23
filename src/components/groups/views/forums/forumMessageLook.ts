// Message states: 0 and 1 are visible, 10 is hidden by a group administrator, 20 deleted by Hotel staff.
export const MESSAGE_VISIBLE = 1;
export const MESSAGE_HIDDEN_BY_ADMIN = 10;
export const MESSAGE_DELETED_BY_STAFF = 20;

export interface ForumMessageLook {
    /** The state the message is drawn in: -1 for one not read yet, else its own state. */
    state: number;
    panelColor: number;
    textColor: number;
    /** The moderation notice replaces the text. */
    isModerationMessage: boolean;
    hideAction: 'hide' | 'unhide' | null;
}

/**
 * MessageListView.createListItem / getMessageColor / handleButtonVisibility. A message after the last one read is "new":
 * cream text panel, its own text and the hide button, whatever its state.
 */
export const forumMessageLook = (messageState: number, isNew: boolean, canModerate: boolean, isStaff: boolean): ForumMessageLook => {
    const state = isNew ? -1 : messageState;
    const isHiddenByAdmin = state === MESSAGE_HIDDEN_BY_ADMIN;
    const isDeleted = state === MESSAGE_DELETED_BY_STAFF;
    const getTextColor = () => {
        if (isDeleted) return 0xffc6ba;
        if (isHiddenByAdmin) return 0xe9e9e0;

        return isNew ? 0xfff9d9 : 0xffffff;
    };
    const getPanelColor = () => {
        if (isDeleted) return 0xffdfd2;

        return isHiddenByAdmin ? 0xd7d7cf : 0xc6eff9;
    };
    const getHideAction = (): 'hide' | 'unhide' | null => {
        if (!canModerate) return null;
        if (isHiddenByAdmin) return 'unhide';
        if (isDeleted) return isStaff ? 'unhide' : null;

        return 'hide';
    };

    return {
        state,
        panelColor: getPanelColor(),
        textColor: getTextColor(),
        isModerationMessage: (isDeleted && !isStaff) || (state > 1 && !canModerate),
        hideAction: getHideAction()
    };
};

/** MessageListView.update: the messages of a page that come after the last one read. */
export const newForumMessageIds = (messages: ReadonlyArray<{ messageId: number; messageIndex: number }>, lastReadMessageIndex: number): Set<number> =>
    new Set(messages.filter((message) => message.messageIndex > lastReadMessageIndex).map((message) => message.messageId));
