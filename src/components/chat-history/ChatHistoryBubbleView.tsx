import { FC, useEffect, useMemo, useState } from 'react';
import { ChatBubbleMessage, ChatBubbleUtilities, IChatEntry, SanitizeHtml } from '../../api';
import { ChatWidgetMessageView } from '../room/widgets/chat/ChatWidgetMessageView';

/**
 * AIR ChatBubbleFactory.getHistoryLineEntry draws the history line with the same ChatBubble as the room
 * (face, style, tint and pointer) at NORMAL width, so the history reuses the live bubble view. Entries
 * restored from storage have no face image; it is rebuilt from the figure.
 */
export const ChatHistoryBubbleView: FC<{ entry: IChatEntry }> = ({ entry }) => {
    const storedImage = entry.imageUrl || null;
    const [restoredImage, setRestoredImage] = useState<string>(null);

    useEffect(() => {
        let disposed = false;

        setRestoredImage(null);

        if (storedImage || !entry.look) return;

        ChatBubbleUtilities.getUserImage(entry.look)
            .then((image) => {
                if (!disposed) setRestoredImage(image || null);
            })
            .catch(() => {});

        return () => {
            disposed = true;
        };
    }, [storedImage, entry.look]);

    const chat = useMemo(() => {
        const message = new ChatBubbleMessage(
            entry.entityId,
            100,
            entry.roomId,
            entry.message ?? '',
            SanitizeHtml(entry.message ?? ''),
            entry.name,
            null,
            entry.chatType ?? 0,
            entry.style ?? 0,
            storedImage || restoredImage,
            entry.color ?? null
        );

        message.textSize = entry.textSize ?? null;

        return message;
    }, [entry, storedImage, restoredImage]);

    return <ChatWidgetMessageView chat={chat} layout="history" makeRoom={null} />;
};
