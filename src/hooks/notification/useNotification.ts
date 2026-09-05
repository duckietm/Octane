import {
    AchievementNotificationMessageEvent,
    ActivityPointNotificationMessageEvent,
    BadgeReceivedEvent,
    ChestNotificationEvent,
    ClubGiftNotificationEvent,
    ClubGiftSelectedEvent,
    ConnectionErrorEvent,
    GetLocalizationManager,
    GetRoomEngine,
    GetSessionDataManager,
    HabboBroadcastMessageEvent,
    HotelClosedAndOpensEvent,
    HotelClosesAndWillOpenAtEvent,
    HotelWillCloseInMinutesEvent,
    InfoFeedEnableMessageEvent,
    MaintenanceStatusMessageEvent,
    MOTDNotificationEvent,
    ModeratorCautionEvent,
    ModeratorMessageEvent,
    NotificationDialogMessageEvent,
    PetLevelNotificationEvent,
    PetReceivedMessageEvent,
    RespectReceivedEvent,
    RoomEnterEffect,
    RoomEnterEvent,
    SimpleAlertMessageEvent,
    UserBannedMessageEvent,
    Vector3d,
    WiredRewardResultMessageEvent
} from '@octane/renderer';
import { useCallback, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import {
    GetConfigurationValue,
    IMentionEntry,
    LocalizeBadgeName,
    LocalizeText,
    MentionNotificationBubbleItem,
    NotificationAlertItem,
    NotificationAlertType,
    NotificationBubbleItem,
    NotificationBubbleType,
    NotificationConfirmItem,
    PlaySound,
    ProductImageUtility,
    TradingNotificationType
} from '../../api';
import { useMessageEvent } from '../events';
import { useHotelAlertToastStore } from './hotelAlertToastStore';

const cleanText = (text: string) => (text && text.length ? text.replace(/\\r/g, '\r') : '');

const HOTEL_ALERT_TOAST_MAX_LENGTH = 240;

const getTimeZeroPadded = (time: number) => {
    const text = '0' + time;

    return text.substr(text.length - 2, text.length);
};

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

export const prependSingleBubble = (alerts: NotificationBubbleItem[], item: NotificationBubbleItem): NotificationBubbleItem[] => {
    const shouldReplace = item.notificationType === NotificationBubbleType.CLUBGIFT || item.notificationType === NotificationBubbleType.SOUNDBOARD;

    return [item, ...(shouldReplace ? alerts.filter((value) => value.notificationType !== item.notificationType) : alerts)];
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
        (message: string, type: string, imageUrl: string = null, internalLink: string = null, senderName: string = '') => {
            if (bubblesDisabled) return;

            const notificationItem = new NotificationBubbleItem(message, type, imageUrl, internalLink, senderName);

            setBubbleAlerts((prevValue) => prependSingleBubble(prevValue, notificationItem));
        },
        [bubblesDisabled]
    );

    const showMentionBubble = useCallback((mention: IMentionEntry) => {
        const item = new MentionNotificationBubbleItem(mention);

        setBubbleAlerts((prevValue) => [item, ...prevValue]);
    }, []);

    const showNotification = (type: string, options: Map<string, string> = null) => {
        if (!options) options = new Map();

        const configuration = getNotificationConfig('notification.' + type);

        if (configuration) for (const key in configuration) options.set(key, configuration[key]);

        if (type === 'floorplan_editor.error') options.set('message', options.get('message').replace(/[^a-zA-Z._ ]/g, ''));

        const title = getNotificationPart(options, type, 'title', true);
        const message = getNotificationPart(options, type, 'message', true).replace(/\\r/g, '\r');
        const linkTitle = getNotificationPart(options, type, 'linkTitle', false);
        const linkUrl = getNotificationPart(options, type, 'linkUrl', false);
        const image = getNotificationImageUrl(options, type);
        const autoCloseSeconds = getAutoCloseSeconds(options);

        if (options.get('display') === 'BUBBLE') {
            showSingleBubble(LocalizeText(message), NotificationBubbleType.INFO, image, linkUrl);
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
            type: string = null
        ) => {
            if (!confirmText || !confirmText.length) confirmText = LocalizeText('generic.confirm');

            if (!cancelText || !cancelText.length) cancelText = LocalizeText('generic.cancel');

            if (!title || !title.length) title = LocalizeText('notifications.broadcast.title');

            const confirmItem = new NotificationConfirmItem(type, message, onConfirm, onCancel, confirmText, cancelText, title);

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

        if (recentBadgeNotifications.has(parser.data.badgeCode)) return;

        recentBadgeNotifications.add(parser.data.badgeCode);
        setTimeout(() => recentBadgeNotifications.delete(parser.data.badgeCode), 3000);

        const badgeName = LocalizeBadgeName(parser.data.badgeCode);
        const badgeImage = GetSessionDataManager().getBadgeUrl(parser.data.badgeCode);

        showSingleBubble(badgeName, NotificationBubbleType.BADGE_RECEIVED, badgeImage, parser.data.badgeCode);
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
        setTimeout(() => recentBadgeNotifications.delete(parser.badgeCode), 3000);

        const badgeName = LocalizeBadgeName(parser.badgeCode);
        const badgeImage = GetSessionDataManager().getBadgeUrl(parser.badgeCode);
        const senderName = parser.senderName || '';

        showSingleBubble(badgeName, NotificationBubbleType.BADGE_RECEIVED, badgeImage, parser.badgeCode, senderName);
    });

    useMessageEvent<ClubGiftNotificationEvent>(ClubGiftNotificationEvent, (event) => {
        const parser = event.getParser();

        if (parser.numGifts <= 0) return;

        showSingleBubble(
            parser.numGifts.toString(),
            NotificationBubbleType.CLUBGIFT,
            null,
            'catalog/open/' + GetConfigurationValue('catalog.links')['hc.hc_gifts']
        );
    });

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

    useMessageEvent<HotelClosesAndWillOpenAtEvent>(HotelClosesAndWillOpenAtEvent, (event) => {
        const parser = event.getParser();

        simpleAlert(
            LocalizeText(
                'opening.hours.' + (parser.userThrowOutAtClose ? 'disconnected' : 'closed'),
                ['h', 'm'],
                [getTimeZeroPadded(parser.openHour), getTimeZeroPadded(parser.openMinute)]
            ),
            NotificationAlertType.DEFAULT,
            null,
            null,
            LocalizeText('opening.hours.title')
        );
    });

    useMessageEvent<PetReceivedMessageEvent>(PetReceivedMessageEvent, async (event) => {
        const parser = event.getParser();

        const text = LocalizeText('notifications.text.' + (parser.boughtAsGift ? 'petbought' : 'petreceived'));

        let imageUrl: string = null;

        const imageResult = GetRoomEngine().getRoomObjectPetImage(
            parser.pet.typeId,
            parser.pet.paletteId,
            parseInt(parser.pet.color, 16),
            new Vector3d(45 * 3),
            64,
            null,
            true
        );

        if (imageResult) imageUrl = (await imageResult.getImage())?.src;

        showSingleBubble(text, NotificationBubbleType.PETLEVEL, imageUrl);
    });

    useMessageEvent<MOTDNotificationEvent>(MOTDNotificationEvent, (event) => {
        const parser = event.getParser();

        const messages = parser.messages.map((message) => cleanText(message));

        const alertItem = new NotificationAlertItem(messages, NotificationAlertType.MOTD, null, null, LocalizeText('notifications.motd.title'));

        setAlerts((prevValue) => [alertItem, ...prevValue]);
    });

    useMessageEvent<PetLevelNotificationEvent>(PetLevelNotificationEvent, async (event) => {
        const parser = event.getParser();

        let imageUrl: string = null;

        const imageResult = GetRoomEngine().getRoomObjectPetImage(
            parser.figureData.typeId,
            parser.figureData.paletteId,
            parseInt(parser.figureData.color, 16),
            new Vector3d(45 * 3),
            64,
            null,
            true
        );

        if (imageResult) imageUrl = (await imageResult.getImage())?.src;

        showSingleBubble(
            LocalizeText('notifications.text.petlevel', ['pet_name', 'level'], [parser.petName, parser.level.toString()]),
            NotificationBubbleType.PETLEVEL,
            imageUrl
        );
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

    useMessageEvent<MaintenanceStatusMessageEvent>(MaintenanceStatusMessageEvent, (event) => {
        const parser = event.getParser();

        simpleAlert(
            LocalizeText('maintenance.shutdown', ['m', 'd'], [parser.minutesUntilMaintenance.toString(), parser.duration.toString()]),
            NotificationAlertType.DEFAULT,
            null,
            null,
            LocalizeText('opening.hours.title')
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

    useMessageEvent<HotelWillCloseInMinutesEvent>(HotelWillCloseInMinutesEvent, (event) => {
        const parser = event.getParser();

        simpleAlert(
            LocalizeText('opening.hours.shutdown', ['m'], [parser.openMinute.toString()]),
            NotificationAlertType.DEFAULT,
            null,
            null,
            LocalizeText('opening.hours.title')
        );
    });

    useMessageEvent<HotelClosedAndOpensEvent>(HotelClosedAndOpensEvent, (event) => {
        const parser = event.getParser();

        simpleAlert(
            LocalizeText('opening.hours.disconnected', ['h', 'm'], [parser.openHour.toString(), parser.openMinute.toString()]),
            NotificationAlertType.DEFAULT,
            null,
            null,
            LocalizeText('opening.hours.title')
        );
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

    useMessageEvent<WiredRewardResultMessageEvent>(WiredRewardResultMessageEvent, (event) => {
        const parser = event.getParser();

        switch (parser.reason) {
            case WiredRewardResultMessageEvent.PRODUCT_DONATED_CODE:
            case WiredRewardResultMessageEvent.BADGE_DONATED_CODE:
                simpleAlert(
                    LocalizeText('wiredfurni.rewardsuccess.body'),
                    NotificationAlertType.DEFAULT,
                    null,
                    null,
                    LocalizeText('wiredfurni.rewardsuccess.title')
                );
                return;
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 8:
                simpleAlert(
                    LocalizeText(`wiredfurni.rewardfailed.reason.${parser.reason}`),
                    NotificationAlertType.DEFAULT,
                    null,
                    null,
                    LocalizeText('wiredfurni.rewardfailed.title')
                );
                return;
        }
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
