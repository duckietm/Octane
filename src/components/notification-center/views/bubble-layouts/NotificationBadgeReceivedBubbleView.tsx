import { FC } from 'react';
import { AchievementNotificationBubbleItem, CreateLinkEvent, GetConfigurationValue, LocalizeText, localizeWithFallback, NotificationBubbleItem } from '../../../../api';
import { badgeRarityColorToCss, getBadgeRarityDisplayColor, getBadgeRarityFromPacket, getBadgeRarityLocalizationKey, isBadgeRarityStandaloneTier } from '../../../../api/badges/badgeRarity';
import { LayoutNotificationBubbleViewProps } from '../../../../common';
import { NotificationItemLayoutView } from './NotificationItemLayoutView';

export interface NotificationBadgeReceivedBubbleViewProps extends LayoutNotificationBubbleViewProps {
    item: NotificationBubbleItem;
}

// Official badge_received / achievement items: icon and one text, the click opens the link.
export const NotificationBadgeReceivedBubbleView: FC<NotificationBadgeReceivedBubbleViewProps> = (props) => {
    const { item = null, onClose = null, ...rest } = props;

    const isAchievement = item instanceof AchievementNotificationBubbleItem;
    // A badge item keeps its code in linkUrl.
    const badgeCode = isAchievement ? item.badgeCode : (item?.linkUrl ?? null);
    const uncommonEnabled = GetConfigurationValue<boolean>('badge_rarity.uncommon', false) === true;
    const rarity = !isAchievement && badgeCode ? getBadgeRarityFromPacket(badgeCode) : null;
    const showRarity = !!rarity && isBadgeRarityStandaloneTier(rarity.tier, uncommonEnabled);

    const text = isAchievement
        ? item.message
        : item.senderName
          ? `${LocalizeText('notifications.text.received.badge', ['user_name'], [item.senderName])} ${item.message}`
          : localizeWithFallback('notification.new.badge', `You received a new badge: ${item.message}`, ['badge_name'], [item.message]);

    const openLink = () => CreateLinkEvent(isAchievement ? item.linkUrl : 'inventory/show/badges');

    return (
        <NotificationItemLayoutView iconUrl={item.iconUrl} onClick={openLink} onClose={onClose} {...rest}>
            <span>{text}</span>
            {showRarity && (
                <span className="octane-notification-item__rarity" style={{ color: badgeRarityColorToCss(getBadgeRarityDisplayColor(rarity.tier, uncommonEnabled)) }}>
                    {LocalizeText(getBadgeRarityLocalizationKey(rarity.tier, uncommonEnabled))}
                </span>
            )}
        </NotificationItemLayoutView>
    );
};
