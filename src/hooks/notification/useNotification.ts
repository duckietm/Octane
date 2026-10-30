import {
    AchievementNotificationMessageEvent,
    ActivityPointNotificationMessageEvent,
    BadgeReceivedEvent,
    ChestNotificationEvent,
    ClubGiftSelectedEvent,
    ConnectionErrorEvent,
    GetLocalizationManager,
    GetSessionDataManager,
    HabboBroadcastMessageEvent,
    InfoFeedEnableMessageEvent,
    LtdRaffleResultMessageEvent,
    MOTDNotificationEvent,
    ModeratorCautionEvent,
    ModeratorMessageEvent,
    NotificationDialogMessageEvent,
    RespectReceivedEvent,
    RoomEnterEffect,
    RoomEnterEvent,
    SimpleAlertMessageEvent,
    UserBannedMessageEvent
} from '@octane/renderer';
import { useCallback, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import {
    GetConfigurationValue,
    getCalendarRewardBubble,
    IMentionEntry,
    LocalizeBadgeName,
    LocalizeText,
    MentionNotificationBubbleItem,
    NotificationAlertItem,
    NotificationAlertType,
    NotificationBubbleItem,
    NotificationBubbleType,
    NotificationCollectibleReward,
    NotificationConfirmItem,
    PlaySound,
    ProductImageUtility,
    TradingNotificationType
} from '../../api';
import { rememberReceivedBadgeRarity } from '../../api/badges/badgeRarity';
import { AchievementNotificationBubbleItem } from '../../api/notification/AchievementNotificationBubbleItem';
import { localizeWithFallback } from '../../api/utils/localizeWithFallback';
import { countSimpleAlert } from '../../api/notification/SimpleAlertCounter';
import { useMessageEvent } from '../events';
import { useHotelAlertToastStore } from './hotelAlertToastStore';
import { useHotelStatusNotifications } from './useHotelStatusNotifications';
import { usePetNotifications } from './usePetNotifications';
import { useRecyclerNotifications } from './useRecyclerNotifications';
import { useWiredTransactionNotifications } from './useWiredTransactionNotifications';

const cleanText = (text: string) => (text && text.length ? text.replace(/\\r/g, '\r') : '');

const HOTEL_ALERT_TOAST_MAX_LENGTH = 240;

/** Mention toasts on screen at once; a burst replaces the oldest instead of piling up. */
const MAX_MENTION_BUBBLES = 3;

let modDisclaimerTimeout: ReturnType<typeof setTimeout> = null;
const recentBadgeNotifications = new Set<string>();

/**
 * Reads the "timeout" the server (or ui-config) sent with a notification: the number
 * of seconds after which the alert closes on its own. Anything that is not a positive
 * number of seconds leaves the alert open until the user dismisses it.
 */
export const getAutoCloseSeconds = (options: Map<string, string>): number => {
    const seconds = parseInt(options.get('timeout'), 10);

    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
};

/**
 * Alert types that only ever show one window: a second announcement replaces the
 * first instead of stacking on top of it. A closing announcement replaces the
 * opening one it refers to, which is why they share the group.
 */
const SINGLE_ALERT_GROUPS: string[][] = [['hotel.event', 'hotel.event.ended']];

export const prependSingleAlert = (alerts: NotificationAlertItem[], item: NotificationAlertItem): NotificationAlertItem[] => {
    const group = SINGLE_ALERT_GROUPS.find((types) => types.includes(item.alertType));

    return [item, ...(group ? alerts.filter((value) => !group.includes(value.alertType)) : alerts)];
};

// Like the official client, a new item goes below the ones already shown.
/** AIR HabboCatalog.onLtdRaffleResult: `notification.raffle.won` for a win, `notification.raffle.lost` otherwise. */
export const ltdRaffleResultText = (hasWon: boolean): string =>
    hasWon
        ? localizeWithFallback('notification.raffle.won', 'You successfully bought an LTD!')
        : localizeWithFallback('notification.raffle.lost', 'Unfortunately you were not lucky enough to get an LTD this time.');

export const addSingleBubble = (alerts: NotificationBubbleItem[], item: NotificationBubbleItem): NotificationBubbleItem[] => {
    const shouldReplace = item.notificationType === NotificationBubbleType.CLUBGIFT || item.notificationType === NotificationBubbleType.SOUNDBOARD;

    return [...(shouldReplace ? alerts.filter((value) => value.notificationType !== item.notificationType) : alerts), item];
};

const useNotificationStore = () => {
    const [alerts, setAlerts] = useState<NotificationAlertItem[]>([]);
    const [bubbleAlerts, setBubbleAlerts] = useState<NotificationBubbleItem[]>([]);
    const [confirms, setConfirms] = useState<NotificationConfirmItem[]>([]);
    const [bubblesDisabled, setBubblesDisabled] = useState(false);
    const [modDisclaimerShown, setModDisclaimerShown] = useState(false);

    const getMainNotificationConfig = () =>
        GetConfigurationValue<{ [key: string]: { delivery?: string; display?: string; title?: string; image?: string } }>('notification', {});

    const getNotificationConfig = (key: string) => {
        const mainConfig = getMainNotificationConfig();

        if (!mainConfig) return null;

        return mainConfig[key];
    };

    const getNotificationPart = (options: Map<string, string>, type: string, key: string, localize: boolean) => {
        if (options.has(key)) return options.get(key);

        const localizeKey = ['notification', type, key].join('.');

        if (GetLocalizationManager().hasValue(localizeKey) || localize)
            return LocalizeText(localizeKey, Array.from(options.keys()), Array.from(options.values()));

        return null;
    };

    const getNotificationImageUrl = (options: Map<string, string>, type: string) => {
        let imageUrl = options.get('image');

        if (!imageUrl) imageUrl = GetConfigurationValue<string>('image.library.notifications.url', '').replace('%image%', type.replace(/\./g, '_'));

        return LocalizeText(imageUrl);
    };

    const simpleAlert = useCallback(
        (
            message: string,
            type: string = null,
            clickUrl: string = null,
            clickUrlText: string = null,
            title: string = null,
            imageUrl: string = null,
            timeoutSeconds: number = null,
            data: Map<string, string> = null
        ) => {
            countSimpleAlert();

            if (!title || !title.length) title = LocalizeText('notifications.broadcast.title');

            if (!type || !type.length) type = NotificationAlertType.DEFAULT;

            const alertItem = new NotificationAlertItem(
                [cleanText(message)],
                type,
                clickUrl,
                clickUrlText,
                title,
                imageUrl,
                timeoutSeconds,
                data
            );

            setAlerts((prevValue) => prependSingleAlert(prevValue, alertItem));
        },
        []
    );

    const showOctaneAlert = useCallback(() => simpleAlert(null, NotificationAlertType.OCTANE), [simpleAlert]);

    const showSingleBubble = useCallback(
        (
            message: string,
            type: string,
            imageUrl: string = null,
            internalLink: string = null,
            senderName: string = '',
            collectible: NotificationCollectibleReward = null
        ) => {
            if (bubblesDisabled) return;

            const notificationItem = new NotificationBubbleItem(message, type, imageUrl, internalLink, senderName, collectible);

            setBubbleAlerts((prevValue) => addSingleBubble(prevValue, notificationItem));
        },
        [bubblesDisabled]
    );

    const showMentionBubble = useCallback((mention: IMentionEntry) => {
        if (bubblesDisabled) return;

        const item = new MentionNotificationBubbleItem(mention);

        // A burst of mentions keeps the latest few on screen instead of stacking one toast for each.
        setBubbleAlerts((prevValue) => {
            const shown = prevValue.filter((bubble) => bubble instanceof MentionNotificationBubbleItem);
            const kept = shown.length >= MAX_MENTION_BUBBLES ? prevValue.filter((bubble) => bubble !== shown[0]) : prevValue;

            return [...kept, item];
        });
    }, [bubblesDisabled]);

    const showNotification = (type: string, options: Map<string, string> = null) => {
        if (!options) options = new Map();

        const calendarReward = getCalendarRewardBubble(type, options);

        if (calendarReward) {
            showSingleBubble(calendarReward.message, NotificationBubbleType.INFO, calendarReward.imageUrl);

            return;
        }

        const configuration = getNotificationConfig('notification.' + type);

        if (configuration) for (const key in configuration) options.set(key, configuration[key]);

        // A floor plan error without a message used to throw here and lose the notification.
        if (type === 'floorplan_editor.error') options.set('message', (options.get('message') ?? '').replace(/[^a-zA-Z._ ]/g, ''));

        const title = getNotificationPart(options, type, 'title', true);
        const message = getNotificationPart(options, type, 'message', true).replace(/\\r/g, '\r');
        const linkTitle = getNotificationPart(options, type, 'linkTitle', false);
        const linkUrl = getNotificationPart(options, type, 'linkUrl', false);
        const image = getNotificationImageUrl(options, type);
        const autoCloseSeconds = getAutoCloseSeconds(options);

        if (options.get('display') === 'BUBBLE') {
            showSingleBubble(LocalizeText(message), NotificationBubbleType.resolve(options.get('bubble'), type), image, linkUrl);
        } else {
            simpleAlert(LocalizeText(message), type, linkUrl, linkTitle, title, image, autoCloseSeconds, options);
        }

        if (options.get('sound')) PlaySound(options.get('sound'));
    };

    const showConfirm = useCallback(
        (
            message: string,
            onConfirm: () => void,
            onCancel: () => void,
            confirmText: string = null,
            cancelText: string = null,
            title: string = null,
            type: string = null,
            titleBarColor: string = null
        ) => {
            if (!confirmText || !confirmText.length) confirmText = LocalizeText('generic.confirm');

            if (!cancelText || !cancelText.length) cancelText = LocalizeText('generic.cancel');

            if (!title || !title.length) title = LocalizeText('notifications.broadcast.title');

            const confirmItem = new NotificationConfirmItem(type, message, onConfirm, onCancel, confirmText, cancelText, title, titleBarColor);

            setConfirms((prevValue) => [confirmItem, ...prevValue]);
        },
        []
    );

    const showModeratorMessage = (message: string, url: string = null, showHabboWay: boolean = true) => {
        simpleAlert(message, NotificationAlertType.DEFAULT, url, LocalizeText('mod.alert.link'), LocalizeText('mod.alert.title'));
    };

    const showTradeAlert = useCallback(
        (type: number, otherUsername: string = '') => {
            switch (type) {
                case TradingNotificationType.ALERT_SCAM:
                    simpleAlert(
                        LocalizeText('inventory.trading.warning.other_not_offering'),
                        null,
                        null,
                        null,
                        LocalizeText('inventory.trading.notification.title')
                    );
                    return;
                case TradingNotificationType.HOTEL_TRADING_DISABLED:
                case TradingNotificationType.YOU_NOT_ALLOWED:
                case TradingNotificationType.THEY_NOT_ALLOWED:
                case TradingNotificationType.ROOM_DISABLED:
                case TradingNotificationType.YOU_OPEN:
                case TradingNotificationType.THEY_OPEN:
                    simpleAlert(
                        LocalizeText(`inventory.trading.openfail.${type}`, ['otherusername'], [otherUsername]),
                        null,
                        null,
                        null,
                        LocalizeText('inventory.trading.openfail.title')
                    );
                    return;
                case TradingNotificationType.ERROR_WHILE_COMMIT:
                    simpleAlert(
                        `${LocalizeText('inventory.trading.notification.caption')}, ${LocalizeText('inventory.trading.notification.commiterror.info')}`,
                        null,
                        null,
                        null,
                        LocalizeText('inventory.trading.notification.title')
                    );
                    return;
                case TradingNotificationType.THEY_CANCELLED:
                    simpleAlert(LocalizeText('inventory.trading.info.closed'), null, null, null, LocalizeText('inventory.trading.notification.title'));
                    return;
            }
        },
        [simpleAlert]
    );

    const closeAlert = useCallback((alert: NotificationAlertItem) => {
        setAlerts((prevValue) => {
            const newAlerts = [...prevValue];
            const index = newAlerts.findIndex((value) => alert === value);

            if (index >= 0) newAlerts.splice(index, 1);

            return newAlerts;
        });
    }, []);

    const closeBubbleAlert = useCallback((item: NotificationBubbleItem) => {
        setBubbleAlerts((prevValue) => {
            const newAlerts = [...prevValue];
            const index = newAlerts.findIndex((value) => item === value);

            if (index >= 0) newAlerts.splice(index, 1);

            return newAlerts;
        });
    }, []);

    const closeConfirm = useCallback((item: NotificationConfirmItem) => {
        setConfirms((prevValue) => {
            const newConfirms = [...prevValue];
            const index = newConfirms.findIndex((value) => item === value);

            if (index >= 0) newConfirms.splice(index, 1);

            return newConfirms;
        });
    }, []);

    useHotelStatusNotifications(simpleAlert);
    usePetNotifications(simpleAlert, showSingleBubble);
    useWiredTransactionNotifications(simpleAlert, showSingleBubble);
    useRecyclerNotifications(showSingleBubble);

    useMessageEvent<RespectReceivedEvent>(RespectReceivedEvent, (event) => {
        const parser = event.getParser();

        if (parser.userId !== GetSessionDataManager().userId) return;

        const text1 = LocalizeText('notifications.text.respect.1');
        const text2 = LocalizeText('notifications.text.respect.2', ['count'], [parser.respectsReceived.toString()]);

        showSingleBubble(text1, NotificationBubbleType.RESPECT);
        showSingleBubble(text2, NotificationBubbleType.RESPECT);
    });

    useMessageEvent<HabboBroadcastMessageEvent>(HabboBroadcastMessageEvent, (event) => {
        const parser = event.getParser();
        const raw = parser.message.replace(/\\r/g, '\r');

        const sentinel = '[NITRO_INFO_V1]';

        if (raw.startsWith(sentinel)) {
            const body = raw.substring(sentinel.length).replace(/^[\r\n]+/, '');
            simpleAlert(body, NotificationAlertType.OCTANE_INFO, null, null, LocalizeText('nitro.info.title'));
            return;
        }

        if (GetConfigurationValue<boolean>('hotel_alert_animated', false) && raw.length <= HOTEL_ALERT_TOAST_MAX_LENGTH) {
            useHotelAlertToastStore.getState().pushToast(raw);
            return;
        }

        simpleAlert(raw, null, null, LocalizeText('notifications.broadcast.title'));
    });

    useMessageEvent<AchievementNotificationMessageEvent>(AchievementNotificationMessageEvent, (event) => {
        const parser = event.getParser();

        if (bubblesDisabled) return;

        recentBadgeNotifications.add(parser.data.badgeCode);
        setTimeout(() => recentBadgeNotifications.delete(parser.data.badgeCode), 3000);

        const badgeName = LocalizeBadgeName(parser.data.badgeCode);
        const badgeImage = GetSessionDataManager().getBadgeUrl(parser.data.badgeCode);

        const notification = new AchievementNotificationBubbleItem(
            parser.data,
            localizeWithFallback('notification.new.achievement', `Achievement unlocked: ${badgeName}`, ['achievement_name'], [badgeName]),
            badgeImage
        );

        setBubbleAlerts((previous) => [...previous.filter((item) => item instanceof AchievementNotificationBubbleItem
            ? item.badgeCode !== parser.data.badgeCode
            : item.notificationType !== NotificationBubbleType.BADGE_RECEIVED || item.linkUrl !== parser.data.badgeCode), notification]);
    });

    useMessageEvent<ChestNotificationEvent>(ChestNotificationEvent, (event) => {
        const parser = event.getParser();
        const key = CHEST_NOTIFICATION_KEYS[parser.reason];

        if (!key) return;

        // A chest with no name of its own is still "your chest", so the message falls back rather
        // than announcing an empty string.
        const chestName = parser.chestName || LocalizeText('wiredchests.notification.unnamed');

        showSingleBubble(
            LocalizeText(
                key,
                ['chest', 'name', 'amount'],
                [chestName, parser.actorName, String(parser.amount)],
            ),
            NotificationBubbleType.INFO,
        );
    });

    useMessageEvent<BadgeReceivedEvent>(BadgeReceivedEvent, (event) => {
        const parser = event.getParser();

        if (recentBadgeNotifications.has(parser.badgeCode)) return;

        recentBadgeNotifications.add(parser.badgeCode);
        rememberReceivedBadgeRarity(parser);
        setTimeout(() => recentBadgeNotifications.delete(parser.badgeCode), 3000);

        const badgeName = LocalizeBadgeName(parser.badgeCode);
        const badgeImage = GetSessionDataManager().getBadgeUrl(parser.badgeCode);
        const senderName = parser.senderName || '';

        showSingleBubble(badgeName, NotificationBubbleType.BADGE_RECEIVED, badgeImage, parser.badgeCode, senderName);
    });

    // AIR HabboCatalog event 2316: the LTD raffle is drawn; result code 0 is a win, anything else a loss.
    useMessageEvent<LtdRaffleResultMessageEvent>(LtdRaffleResultMessageEvent, (event) => {
        const parser = event.getParser();

        showSingleBubble(ltdRaffleResultText(!!parser?.hasWon), NotificationBubbleType.LTD);
    });

    // ClubGiftNotificationEvent: AIR shows the panel under the purse (components/purse/views/PurseNoticesView).

    useMessageEvent<ModeratorMessageEvent>(ModeratorMessageEvent, (event) => {
        const parser = event.getParser();

        if (GetConfigurationValue<boolean>('hotel_alert_animated', false) && !parser.url && parser.message.length <= HOTEL_ALERT_TOAST_MAX_LENGTH) {
            useHotelAlertToastStore.getState().pushToast(cleanText(parser.message), LocalizeText('mod.alert.title'), 'staff');
            return;
        }

        showModeratorMessage(parser.message, parser.url, false);
    });

    useMessageEvent<ActivityPointNotificationMessageEvent>(ActivityPointNotificationMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.amountChanged <= 0 || parser.type !== 5) return;

        const imageUrl = GetConfigurationValue<string>('currency.asset.icon.url', '').replace('%type%', parser.type.toString());

        showSingleBubble(
            LocalizeText('notifications.text.loyalty.received', ['AMOUNT'], [parser.amountChanged.toString()]),
            NotificationBubbleType.INFO,
            imageUrl
        );
    });

    useMessageEvent<UserBannedMessageEvent>(UserBannedMessageEvent, (event) => {
        const parser = event.getParser();

        showModeratorMessage(parser.message);
    });

    useMessageEvent<MOTDNotificationEvent>(MOTDNotificationEvent, (event) => {
        const parser = event.getParser();

        const messages = parser.messages.map((message) => cleanText(message));

        const alertItem = new NotificationAlertItem(messages, NotificationAlertType.MOTD, null, null, LocalizeText('notifications.motd.title'));

        setAlerts((prevValue) => [alertItem, ...prevValue]);
    });

    useMessageEvent<InfoFeedEnableMessageEvent>(InfoFeedEnableMessageEvent, (event) => {
        const parser = event.getParser();

        setBubblesDisabled(!parser.enabled);
    });

    useMessageEvent<ClubGiftSelectedEvent>(ClubGiftSelectedEvent, (event) => {
        const parser = event.getParser();

        if (!parser.products || !parser.products.length) return;

        const productData = parser.products[0];

        if (!productData) return;

        showSingleBubble(
            LocalizeText('notifications.text.club_gift.selected'),
            NotificationBubbleType.INFO,
            ProductImageUtility.getProductImageUrl(productData.productType, productData.furniClassId, productData.extraParam)
        );
    });

    useMessageEvent<ModeratorCautionEvent>(ModeratorCautionEvent, (event) => {
        const parser = event.getParser();

        showModeratorMessage(parser.message, parser.url);
    });

    useMessageEvent<NotificationDialogMessageEvent>(NotificationDialogMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.type === 'badge_received' || parser.type === 'badges') return;

        showNotification(parser.type, parser.parameters);
    });

    useMessageEvent<ConnectionErrorEvent>(ConnectionErrorEvent, (event) => {
        const parser = event.getParser();

        switch (parser.errorCode) {
            default:
            case 0:
                simpleAlert(
                    LocalizeText('connection.server.error.desc', ['errorCode'], [parser.errorCode.toString()]),
                    NotificationAlertType.ALERT,
                    null,
                    null,
                    LocalizeText('connection.server.error.title')
                );
                break;
            case 1001:
            case 1002:
            case 1003:
            case 1004:
            case 1005:
            case 1006:
            case 1007:
            case 1008:
            case 1009:
            case 1010:
            case 1011:
            case 1012:
            case 1013:
            case 1014:
            case 1015:
            case 1016:
            case 1017:
            case 1018:
            case 1019:
                // TODO: fix dispose
                //event.connection.dispose();
                break;
            case 4013:
                simpleAlert(
                    LocalizeText('connection.room.maintenance.desc'),
                    NotificationAlertType.ALERT,
                    null,
                    null,
                    LocalizeText('connection.room.maintenance.title')
                );
                break;
        }
    });

    useMessageEvent<SimpleAlertMessageEvent>(SimpleAlertMessageEvent, (event) => {
        const parser = event.getParser();

        simpleAlert(
            LocalizeText(parser.alertMessage),
            NotificationAlertType.DEFAULT,
            null,
            null,
            LocalizeText(parser.titleMessage ? parser.titleMessage : 'notifications.broadcast.title')
        );
    });

    const onRoomEnterEvent = useCallback(() => {
        if (modDisclaimerShown) return;

        if (RoomEnterEffect.isRunning()) {
            if (modDisclaimerTimeout) return;

            modDisclaimerTimeout = setTimeout(() => {
                onRoomEnterEvent();
            }, RoomEnterEffect.totalRunningTime + 5000);
        } else {
            if (modDisclaimerTimeout) {
                clearTimeout(modDisclaimerTimeout);

                modDisclaimerTimeout = null;
            }

            showSingleBubble(LocalizeText('mod.chatdisclaimer'), NotificationBubbleType.INFO);

            setModDisclaimerShown(true);
        }
    }, [modDisclaimerShown, showSingleBubble]);

    useMessageEvent<RoomEnterEvent>(RoomEnterEvent, onRoomEnterEvent);

    return {
        alerts,
        bubbleAlerts,
        confirms,
        simpleAlert,
        showOctaneAlert,
        showTradeAlert,
        showConfirm,
        showSingleBubble,
        showMentionBubble,
        closeAlert,
        closeBubbleAlert,
        closeConfirm
    };
};

/** Reasons a chest tells its owner something, in the order the server numbers them. */
const CHEST_NOTIFICATION_KEYS = [
    'wiredchests.notification.full',
    'wiredchests.notification.donation',
    'wiredchests.notification.withdraw',
    'wiredchests.notification.empty',
    'wiredchests.notification.wired',
];

export const useNotificationState = () => {
    const { alerts, bubbleAlerts, confirms } = useSharedHook(useNotificationStore);

    return { alerts, bubbleAlerts, confirms };
};

export const useNotificationActions = () => {
    const { simpleAlert, showOctaneAlert, showTradeAlert, showConfirm, showSingleBubble, showMentionBubble, closeAlert, closeBubbleAlert, closeConfirm } =
        useSharedHook(useNotificationStore);

    return {
        simpleAlert,
        showOctaneAlert,
        showTradeAlert,
        showConfirm,
        showSingleBubble,
        showMentionBubble,
        closeAlert,
        closeBubbleAlert,
        closeConfirm
    };
};

export const useNotification = () => useSharedHook(useNotificationStore);

registerSharedHook(useNotificationStore);
