import { FC } from 'react';
import { LocalizeText, NotificationAlertItem, NotificationAlertType, OpenUrl, SanitizeHtml } from '../../../../api';
import { Button, LayoutCurrencyIcon, LayoutNotificationAlertView, LayoutNotificationAlertViewProps } from '../../../../common';

interface NotificationClubPromoAlertViewProps extends LayoutNotificationAlertViewProps {
    item: NotificationAlertItem;
}

/** The keys the promo alert reads from the item data: the upsell line and where a click on it goes. */
export const CLUB_PROMO_TEXT_KEY = 'promoText';
export const CLUB_PROMO_LINK_KEY = 'promoLink';

/**
 * The navigator alert with a Habbo Club upsell (`nav_promo_alert`, `ClubPromoAlertView`):
 * the message on top, a clickable strip with the HC icon and the promo line under it,
 * and an OK button. Clicking the strip opens the club page of the catalog and closes.
 */
export const NotificationClubPromoAlertView: FC<NotificationClubPromoAlertViewProps> = (props) => {
    const { item = null, title = (props.item && props.item.title) || '', onClose = null, ...rest } = props;
    const promoText = item?.data?.get(CLUB_PROMO_TEXT_KEY) || '';
    const promoLink = item?.data?.get(CLUB_PROMO_LINK_KEY) || '';

    const onPromo = () => {
        if (promoLink) OpenUrl(promoLink);

        onClose?.();
    };

    return (
        <LayoutNotificationAlertView title={title} onClose={onClose} {...rest} type={NotificationAlertType.CLUB_PROMO}>
            <div className="octane-club-promo-alert__body">
                {(item?.messages || []).map((message, index) => (
                    <div key={index} dangerouslySetInnerHTML={{ __html: SanitizeHtml(message.replace(/\r\n|\r|\n/g, '<br />')) }} />
                ))}
            </div>
            {promoText && (
                <button className="octane-club-promo-alert__promo" data-testid="club-promo-strip" type="button" onClick={onPromo}>
                    <LayoutCurrencyIcon className="shrink-0" type="hc" />
                    <span>{promoText}</span>
                </button>
            )}
            <div className="octane-club-promo-alert__actions">
                <Button onClick={onClose}>{LocalizeText('generic.ok')}</Button>
            </div>
        </LayoutNotificationAlertView>
    );
};
