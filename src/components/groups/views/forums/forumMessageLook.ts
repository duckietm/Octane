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

// MessageListView: a line that starts with ">" (and the one space after it) is quoted text.
export const FORUM_QUOTE_LINE = /^>(?: ?|$)/;

/** A run of lines of a message that belong together: what the author wrote, or what is quoted from somebody else. */
export interface ForumMessageBlock {
    quote: boolean;
    lines: string[];
}

/**
 * The text of a message as the blocks a phone card draws: the lines in their order, runs of quoted lines (the ">" rule
 * the composer writes quotes with) set apart from the author's own. Blank lines at the edges of a block are dropped,
 * since the gap between two blocks stands for them. Nothing else in a message is markup.
 */
export const forumMessageBlocks = (text: string): ForumMessageBlock[] => {
    const blocks: ForumMessageBlock[] = [];

    for (const line of (text ?? '').split(/\r\n|\r|\n/)) {
        const quote = FORUM_QUOTE_LINE.test(line);
        const last = blocks[blocks.length - 1];
        const content = quote ? line.replace(FORUM_QUOTE_LINE, '') : line;

        if (last && last.quote === quote) last.lines.push(content);
        else blocks.push({ quote, lines: [content] });
    }

    for (const block of blocks) {
        while (block.lines.length && block.lines[0].trim() === '') block.lines.shift();
        while (block.lines.length && block.lines[block.lines.length - 1].trim() === '') block.lines.pop();
    }

    return blocks.filter((block) => block.lines.length > 0);
};
