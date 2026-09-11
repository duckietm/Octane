import { motion } from 'framer-motion';
import { FC, useEffect } from 'react';
import { NotificationBubbleItem, OpenMessengerChat } from '../../../../api';
import friendOnlineCircle from '../../../../assets/images/notifications/friendonline/friendonline_circle.png';
import friendOnlineCircleInner from '../../../../assets/images/notifications/friendonline/friendonline_circle_inner.png';
import friendOnlineLeft from '../../../../assets/images/notifications/friendonline/friendonline_left.png';
import friendOnlineMiddle from '../../../../assets/images/notifications/friendonline/friendonline_middle.png';
import friendOnlineRight from '../../../../assets/images/notifications/friendonline/friendonline_right.png';
import friendOnlineSlide from '../../../../assets/images/notifications/friendonline/friendonline_slide.png';
import { LayoutAvatarImageView } from '../../../../common';

interface NotificationFriendOnlineBubbleViewProps {
    item: NotificationBubbleItem;
    onClose: () => void;
    /** A friend going offline reuses the strip greyed out and without the messenger shortcut. */
    offline?: boolean;
}

export const NotificationFriendOnlineBubbleView: FC<NotificationFriendOnlineBubbleViewProps> = (props) => {
    const { item = null, onClose = null, offline = false } = props;
    const contentWidth = Math.max(43, Math.min(220, (item?.message?.length || 0) * 6 + 30));
    const bubbleWidth = contentWidth + 43;

    useEffect(() => {
        const timeout = setTimeout(onClose, 8000);

        return () => clearTimeout(timeout);
    }, [onClose]);

    const openMessenger = () => {
        const friendId = Number((item?.linkUrl || '').split('/').pop());

        if (!offline && friendId > 0) OpenMessengerChat(friendId);

        onClose();
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 340 }}
            transition={{ duration: 0.3 }}
            className="octane-friendonline-notification"
            data-testid={offline ? 'friendoffline-bubble' : 'friendonline-bubble'}
            style={{ width: bubbleWidth, filter: offline ? 'grayscale(1) opacity(0.85)' : undefined }}
            onClick={openMessenger}
        >
            <div className="octane-friendonline-notification__content" style={{ width: contentWidth }}>
                <img alt="" className="octane-friendonline-notification__left" src={friendOnlineLeft} draggable={false} />
                <div className="octane-friendonline-notification__middle" style={{ backgroundImage: `url(${friendOnlineMiddle})` }}>
                    <div className="octane-friendonline-notification__message">
                        <img alt="" src={friendOnlineSlide} draggable={false} />
                        <span>{item.message}</span>
                    </div>
                </div>
                <img alt="" className="octane-friendonline-notification__right" src={friendOnlineRight} draggable={false} />
            </div>
            <div className="octane-friendonline-notification__avatar" style={{ left: contentWidth - 10 }}>
                <img alt="" className="octane-friendonline-notification__circle-inner" src={friendOnlineCircleInner} draggable={false} />
                <div className="octane-friendonline-notification__head">
                    {item.iconUrl && <LayoutAvatarImageView figure={item.iconUrl} headOnly direction={2} />}
                </div>
                <img alt="" className="octane-friendonline-notification__circle" src={friendOnlineCircle} draggable={false} />
            </div>
        </motion.div>
    );
};
