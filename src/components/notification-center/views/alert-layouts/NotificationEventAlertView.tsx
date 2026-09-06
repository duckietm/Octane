import { FC, useMemo, useState } from 'react';
import { LocalizeText, NotificationAlertItem, OpenUrl } from '../../../../api';
import { Button, LayoutAvatarImageView, LayoutNotificationAlertView, LayoutNotificationAlertViewProps } from '../../../../common';

interface NotificationEventAlertViewProps extends LayoutNotificationAlertViewProps {
    item: NotificationAlertItem;
}

export const EVENT_ALERT_TYPES = ['hotel.event', 'hotel.event.ended'];

/**
 * Reads the placeholders the hotel event notification carries. The default layout
 * throws them away and renders one paragraph; the event card lays them out.
 */
export const getEventDetails = (item: NotificationAlertItem) => {
    const data = item.data;
    const closed = item.alertType === 'hotel.event.ended';
    // The message is optional, so an empty one is a real answer and not a reason to
    // fall back. Only a notification that carries no placeholders at all - an older
    // emulator, or a replayed one - falls back to the paragraph the localised text
    // produced.
    const hasPlaceholders = !!(data && data.size);

    return {
        closed,
        look: (data && data.get('LOOK')) || '',
        username: (data && data.get('USERNAME')) || '',
        roomName: (data && data.get('ROOMNAME')) || '',
        time: (data && data.get('TIME')) || '',
        message: hasPlaceholders ? data.get('MESSAGE') || '' : item.messages.join(' ')
    };
};

export const NotificationEventAlertView: FC<NotificationEventAlertViewProps> = (props) => {
    const { item = null, title = (props.item && props.item.title) || '', onClose = null, classNames = [], ...rest } = props;
    const [imageFailed, setImageFailed] = useState<boolean>(false);

    const details = useMemo(() => getEventDetails(item), [item]);

    const visitUrl = () => {
        OpenUrl(item.clickUrl);

        onClose();
    };

    const prefix = details.closed ? 'notification.hotel.event.ended' : 'notification.hotel.event';
    const showImage = item.imageUrl && item.imageUrl.length > 0 && !imageFailed;

    return (
        <LayoutNotificationAlertView
            title={title}
            onClose={onClose}
            classNames={['octane-alert-hotel-event', ...classNames]}
            {...rest}
            type="hotel-event"
        >
            <div className="hotel-event-body">
                <div className="hotel-event-figure shrink-0">
                    {showImage && (
                        <img alt={details.roomName} className="hotel-event-promo" src={item.imageUrl} onError={() => setImageFailed(true)} />
                    )}
                    {/* No promo image configured: the host the server sent stands in for it. */}
                    {!showImage && details.look.length > 0 && (
                        <>
                            <LayoutAvatarImageView figure={details.look} direction={2} classNames={['hotel-event-avatar']} />
                            <div className="hotel-event-avatar-shadow" />
                        </>
                    )}
                </div>
                <div className="hotel-event-details">
                    <div className="hotel-event-headline">{LocalizeText(prefix + '.headline')}</div>
                    <div className="hotel-event-intro">
                        <span className="hotel-event-host">{details.username}</span>{' '}
                        {LocalizeText(prefix + '.intro')}
                    </div>
                    {details.roomName.length > 0 && (
                        <div className="hotel-event-room">
                            <span className="hotel-event-room-label">{LocalizeText('notification.hotel.event.roomLabel')}</span>{' '}
                            <span className="hotel-event-room-name" title={details.roomName}>
                                {details.roomName}
                            </span>
                        </div>
                    )}
                    {details.message.length > 0 && <div className="hotel-event-message">{details.message}</div>}
                    <div className="hotel-event-footer">
                        {/* The host is already named in the line above, so the signature
                            carries the time instead of repeating it. */}
                        {details.time.length > 0 && (
                            <span className="hotel-event-at">{LocalizeText(prefix + '.at', ['TIME'], [details.time])}</span>
                        )}
                        <span className="hotel-event-moderated">{LocalizeText('notification.hotel.event.moderated')}</span>
                    </div>
                </div>
            </div>
            <div className="hotel-event-actions">
                {item.clickUrl && item.clickUrl.length > 0 ? (
                    <Button className="hotel-event-visit" onClick={visitUrl}>
                        {LocalizeText(item.clickUrlText)}
                    </Button>
                ) : (
                    <Button onClick={onClose}>{LocalizeText('generic.close')}</Button>
                )}
            </div>
            {item.timeoutSeconds > 0 && (
                <div className="hotel-event-countdown">
                    <div className="hotel-event-countdown-bar" style={{ animationDuration: `${item.timeoutSeconds}s` }} />
                </div>
            )}
        </LayoutNotificationAlertView>
    );
};
