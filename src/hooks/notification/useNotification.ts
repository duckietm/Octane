import {
    AccountSafetyLockStatusChangeMessageEvent,
    AchievementNotificationMessageEvent,
    ActivityPointNotificationMessageEvent,
    ActivateNotificationsComposer,
    BadgeReceivedEvent,
    BanInfoEvent,
    ChestNotificationEvent,
    ClubGiftNotificationEvent,
    ClubGiftSelectedEvent,
    ConnectionErrorEvent,
    EpicPopupMessageEvent,
    GetLocalizationManager,
    GetRoomEngine,
    GetSessionDataManager,
    HabboBroadcastMessageEvent,
    HotelClosedAndOpensEvent,
    HotelClosesAndWillOpenAtEvent,
    HotelWillCloseInMinutesEvent,
    IncomeRewardNotificationEvent,
    InfoFeedEnableMessageEvent,
    MaintenanceStatusMessageEvent,
    MOTDNotificationEvent,
    ModeratorCautionEvent,
    ModeratorMessageEvent,
    NotificationDialogMessageEvent,
    NotifyPlayedSongEvent,
    PetLevelNotificationEvent,
    PetReceivedMessageEvent,
    PetRespectFailedEvent,
    RecyclerFinishedMessageEvent,
    RespectReceivedEvent,
    RoomEnterEffect,
    RoomEnterEvent,
    RoomMessageNotificationMessageEvent,
    SimpleAlertMessageEvent,
    UserBannedMessageEvent,
    UserInfoEvent,
    TreasureHuntFailMessageEvent,
    TreasureHuntFirstWinnerMessageEvent,
    TreasureHuntUpdateMessageEvent,
    Vector3d,
    WiredRewardResultMessageEvent
} from '@octane/renderer';
import { useCallback, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import {
    GetConfigurationValue,
    IMentionEntry,
    LocalizeBadgeName,
    LocalizeText,
    localizeWithFallback,
    MentionNotificationBubbleItem,
    NotificationAlertItem,
    NotificationAlertType,
    NotificationBubbleExtras,
    NotificationBubbleItem,
    NotificationBubbleType,
    NotificationConfirmItem,
    PlaySound,
    ProductImageUtility,
    SendMessageComposer,
    TradingNotificationType
} from '../../api';
import { useMessageEvent, useOctaneEvent } from '../events';
import { useHotelAlertToastStore } from './hotelAlertToastStore';
import { getFeedCategoryForBubbleType, pushNotificationFeedEntry } from './notificationFeedStore';
import { isSafetyLockedStatus, useSafetyLockStore } from './safetyLockStore';

const cleanText = (text: string) => (text && text.length ? text.replace(/\\r/g, '\r') : '');

const HOTEL_ALERT_TOAST_MAX_LENGTH = 240;

const getTimeZeroPadded = (time: number) => {
    const text = '0' + time;

    return text.substr(text.length - 2, text.length);
};

let modDisclaimerTimeout: ReturnType<typeof setTimeout> = null;
const recentBadgeNotifications = new Set<string>();
const recentAchievementNotifications = new Set<string>();

/** The notification the help tool answers a call for help with; it gets its own illustrated alert. */
const CALL_FOR_HELP_NOTIFICATION_TYPE = 'cfh.created';

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

/** Whether a bubble with this server id is already on screen (`SingularNotificationController.hasNotificationById`). */
export const hasBubbleWithId = (alerts: NotificationBubbleItem[], id: string): boolean => !!id && alerts.some((value) => value.notificationId === id);

/** Takes every bubble carrying the id off screen, as `removeNotificationById` does. */
export const removeBubblesById = (alerts: NotificationBubbleItem[], id: string): NotificationBubbleItem[] =>
    id ? alerts.filter((value) => value.notificationId !== id) : alerts;

const useNotificationStore = () => {
    const [alerts, setAlerts] = useState<NotificationAlertItem[]>([]);
    const [bubbleAlerts, setBubbleAlerts] = useState<NotificationBubbleItem[]>([]);
    const [confirms, setConfirms] = useState<NotificationConfirmItem[]>([]);
    const [bubblesDisabled, setBubblesDisabled] = useState(false);
    const [modDisclaimerShown, setModDisclaimerShown] = useState(false);
    // The bubbles as last committed, so a producer can refuse a duplicate id before the
    // bubble (and its feed entry) is created.
    const bubbleAlertsRef = useRef<NotificationBubbleItem[]>([]);

    bubbleAlertsRef.current = bubbleAlerts;

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

            const alertItem = new NotificationAlertItem([cleanText(message)], type, clickUrl, clickUrlText, title, imageUrl, timeoutSeconds, data);

            setAlerts((prevValue) => prependSingleAlert(prevValue, alertItem));
        },
        []
    );

    const showOctaneAlert = useCallback(() => simpleAlert(null, NotificationAlertType.OCTANE), [simpleAlert]);

    const showSingleBubble = useCallback(
        (message: string, type: string, imageUrl: string = null, internalLink: string = null, senderName: string = '', extras: NotificationBubbleExtras = null) => {
            if (bubblesDisabled) return;

            // A bubble the server gave an id to is shown once; a repeat of the same id
            // while it is on screen is dropped, as the official controller does.
            if (extras?.id && hasBubbleWithId(bubbleAlertsRef.current, extras.id)) return;

            const notificationItem = new NotificationBubbleItem(message, type, imageUrl, internalLink, senderName, extras);

            bubbleAlertsRef.current = prependSingleBubble(bubbleAlertsRef.current, notificationItem);
            setBubbleAlerts((prevValue) => prependSingleBubble(prevValue, notificationItem));
            // The bubble fades in seconds; the feed keeps it for the session, as the official
            // client's notification feed does.
            pushNotificationFeedEntry({ category: getFeedCategoryForBubbleType(type), type, message, iconUrl: imageUrl, linkUrl: internalLink, senderName });
        },
        [bubblesDisabled]
    );

    const showMentionBubble = useCallback((mention: IMentionEntry) => {
        const item = new MentionNotificationBubbleItem(mention);

        // The feed lists the mentions store itself, so nothing is pushed here.
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

    /** Retracts the bubble(s) the server sent under this id, e.g. `wired_click_settings_toggle`. */
    const removeBubbleById = useCallback((id: string) => {
        if (!id) return;

        bubbleAlertsRef.current = removeBubblesById(bubbleAlertsRef.current, id);
        setBubbleAlerts((prevValue) => removeBubblesById(prevValue, id));
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

        // Hotel alerts are the hotel category of the feed whichever way they are shown.
        pushNotificationFeedEntry({ category: 'hotel', type: 'broadcast', title: LocalizeText('notifications.broadcast.title'), message: raw });

        if (GetConfigurationValue<boolean>('hotel_alert_animated', false) && raw.length <= HOTEL_ALERT_TOAST_MAX_LENGTH) {
            useHotelAlertToastStore.getState().pushToast(raw);
            return;
        }

        simpleAlert(raw, null, null, LocalizeText('notifications.broadcast.title'));
    });

    // A level-up is its own "achievement" style in the official client (`class_1873.onLevelUp`):
    // "You advanced to <name>!" with the badge as icon, opening the achievements window on the
    // category of the achievement. The badge itself arrives separately as `badge_received`.
    useMessageEvent<AchievementNotificationMessageEvent>(AchievementNotificationMessageEvent, (event) => {
        const parser = event.getParser();
        const badgeCode = parser.data.badgeCode;

        if (recentAchievementNotifications.has(badgeCode)) return;

        recentAchievementNotifications.add(badgeCode);
        setTimeout(() => recentAchievementNotifications.delete(badgeCode), 3000);

        const badgeName = LocalizeBadgeName(badgeCode);
        const badgeImage = GetSessionDataManager().getBadgeUrl(badgeCode);
        const text = localizeWithFallback('notification.new.achievement', `You advanced to ${badgeName}!`, ['achievement_name'], [badgeName]);

        showSingleBubble(text, NotificationBubbleType.ACHIEVEMENT, badgeImage, `questengine/achievements/${parser.data.category || ''}`);
    });

    // "New messages were posted in <room>" (`class_1873.onRoomMessagesNotification`); a click
    // takes the owner to the room.
    useMessageEvent<RoomMessageNotificationMessageEvent>(RoomMessageNotificationMessageEvent, (event) => {
        const parser = event.getParser();
        const count = String(parser.messageCount);
        const text = localizeWithFallback(
            'notifications.text.room.messages.posted',
            `${count} new messages have been posted in ${parser.roomName}`,
            ['room_name', 'messages_count'],
            [parser.roomName, count]
        );

        showSingleBubble(text, NotificationBubbleType.ROOMMESSAGESPOSTED, null, parser.roomId > 0 ? `navigator/goto/${parser.roomId}` : null);
    });

    // "You have new earnings" (`EarningsController.onIncomeRewardNotificationMessageEvent`):
    // one bubble linking to the vault, whatever the credited reward category is.
    useMessageEvent<IncomeRewardNotificationEvent>(IncomeRewardNotificationEvent, () => {
        showSingleBubble(
            localizeWithFallback('notification.earning.new', 'You have new earnings to collect!'),
            NotificationBubbleType.EARNING,
            null,
            'habboUI/open/vault'
        );
    });

    // The recycler only announces a finished run (`onRecyclerFinished` ignores the failure code).
    useMessageEvent<RecyclerFinishedMessageEvent>(RecyclerFinishedMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.recyclerFinishedStatus !== RecyclerFinishedMessageEvent.FINISHED_OK) return;

        showSingleBubble(
            localizeWithFallback('notifications.text.recycle.ok', 'Recycling complete! You have received a mysterious package!'),
            NotificationBubbleType.RECYCLEROK
        );
    });

    // The sound manager reports every song a sound machine starts (`HabboSoundManager.notifyPlayedSong`).
    useOctaneEvent<NotifyPlayedSongEvent>(NotifyPlayedSongEvent.NOTIFY_PLAYED_SONG, (event) => {
        const text = localizeWithFallback(
            'soundmachine.notification.playing',
            `Now playing ${event.name} by ${event.creator}`,
            ['songname', 'songauthor'],
            [event.name, event.creator]
        );

        showSingleBubble(text, NotificationBubbleType.SOUNDMACHINE);
    });

    // The safety-lock notice stays on the toolbar until the account is unlocked
    // (`showSafetyLockedNotification` / `hideSafetyLockedNotification`).
    useMessageEvent<AccountSafetyLockStatusChangeMessageEvent>(AccountSafetyLockStatusChangeMessageEvent, (event) => {
        useSafetyLockStore.getState().setLocked(isSafetyLockedStatus(event.getParser().status));
    });

    // A campaign popup is one picture in a frame with a Close button (`HabboEpicPopupView`);
    // a new one replaces the one still open.
    useMessageEvent<EpicPopupMessageEvent>(EpicPopupMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser.imageUri) return;

        const alertItem = new NotificationAlertItem([], NotificationAlertType.EPIC, null, null, '', parser.imageUri);

        setAlerts((prevValue) => [alertItem, ...prevValue.filter((value) => value.alertType !== NotificationAlertType.EPIC)]);
    });

    useMessageEvent<ChestNotificationEvent>(ChestNotificationEvent, (event) => {
        const parser = event.getParser();
        const key = CHEST_NOTIFICATION_KEYS[parser.reason];

        if (!key) return;

        // A chest with no name of its own is still "your chest", so the message falls back rather
        // than announcing an empty string.
        const chestName = parser.chestName || LocalizeText('wiredchests.notification.unnamed');

        showSingleBubble(LocalizeText(key, ['chest', 'name', 'amount'], [chestName, parser.actorName, String(parser.amount)]), NotificationBubbleType.INFO);
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

        // A message from staff is addressed to me, so it files under the "me" category.
        pushNotificationFeedEntry({
            category: 'me',
            type: 'moderator',
            title: LocalizeText('mod.alert.title'),
            message: cleanText(parser.message),
            linkUrl: parser.url,
            buttonCaption: parser.url ? LocalizeText('mod.alert.link') : ''
        });

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

    // Official HabboAlertDialogManager.handleBanInfoMessage (event 2524): the ban alert shows the
    // expiry date and the reason, or the server's localized reason with {expiryDate} filled in.
    useMessageEvent<BanInfoEvent>(BanInfoEvent, (event) => {
        const parser = event.getParser();

        const dateText =
            parser.banExpirySeconds > -1 ? new Date(Date.now() + parser.banExpirySeconds * 1000).toLocaleString() : '';

        const message = parser.localizedReason?.length
            ? parser.localizedReason.replace('{expiryDate}', dateText)
            : [
                  localizeWithFallback('login.banned.until', 'Banned until'),
                  dateText,
                  localizeWithFallback('login.banned.reason', 'Reason'),
                  parser.reason
              ]
                  .filter((line) => line && line.length)
                  .join('\r');

        simpleAlert(message, NotificationAlertType.DEFAULT, null, null, localizeWithFallback('generic.alert.title', 'Alert'));
    });

    // Official class_1873.onPetRespectFailed (event 2703): the account is too young to scratch.
    useMessageEvent<PetRespectFailedEvent>(PetRespectFailedEvent, (event) => {
        const parser = event.getParser();

        simpleAlert(
            LocalizeText(
                'room.error.pets.respectfailed',
                ['required_age', 'avatar_age'],
                [parser.requiredDays.toString(), parser.avatarAgeInDays.toString()]
            ),
            NotificationAlertType.DEFAULT,
            null,
            null,
            LocalizeText('error.title')
        );
    });

    // Official HabboNotifications.activate() (composer 3235): the client tells the server its
    // notification feed is up. The official does it when the notification events are registered.
    useMessageEvent<UserInfoEvent>(UserInfoEvent, () => SendMessageComposer(new ActivateNotificationsComposer()));

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

        // "Thanks for your call." is the one dialog type with its own illustrated alert and a
        // safety FAQ link (`class_1873.showCallCreatedNotification`).
        if (parser.type === CALL_FOR_HELP_NOTIFICATION_TYPE) {
            const linkUrl = parser.parameters?.get('linkUrl') || null;

            simpleAlert(
                cleanText(parser.parameters?.get('message') || ''),
                NotificationAlertType.DEFAULT,
                linkUrl,
                linkUrl ? localizeWithFallback('help.main.faq.link.text', 'Read more about Habbo safety') : null,
                localizeWithFallback('help.cfh.sent.title', 'Thanks for your call.')
            );
            return;
        }

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

    // AIR 13 treasure hunt (`class_1873.onTreasureHuntUpdate` / `onTreasureHuntFail` /
    // `onTreasureHuntFirstWinner`): three bubbles of the `treasure_hunt` style.
    const getHuntName = (huntId: string) => localizeWithFallback(`treasure_hunt.${huntId}.name`, huntId);

    useMessageEvent<TreasureHuntUpdateMessageEvent>(TreasureHuntUpdateMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        const message = parser.isCompleted
            ? localizeWithFallback('treasure_hunt.won.desc', 'You finished %hunt_name%!', ['hunt_name'], [getHuntName(parser.huntId)])
            : localizeWithFallback(
                  'treasure_hunt.progress.desc',
                  'You found %current% of %total% in %hunt_name%.',
                  ['current', 'total', 'hunt_name'],
                  [String(parser.stepsCompleted), String(parser.totalSteps), getHuntName(parser.huntId)]
              );

        showSingleBubble(message, NotificationBubbleType.TREASURE_HUNT);
    });

    useMessageEvent<TreasureHuntFailMessageEvent>(TreasureHuntFailMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        showSingleBubble(
            localizeWithFallback(
                'treasure_hunt.level_fail.desc',
                'You need level %level%, or level %level_paying% with Habbo Club.',
                ['level', 'level_paying'],
                [String(parser.requiredLevel), String(parser.requiredLevelPaying)]
            ),
            NotificationBubbleType.TREASURE_HUNT
        );
    });

    useMessageEvent<TreasureHuntFirstWinnerMessageEvent>(TreasureHuntFirstWinnerMessageEvent, (event) => {
        const winner = event.getParser()?.winnerInfo;

        if (!winner) return;

        showSingleBubble(
            localizeWithFallback(
                'treasure_hunt.winner.desc',
                '%user_name% is the first to finish %hunt_name%!',
                ['user_name', 'hunt_name'],
                [winner.userName, getHuntName(winner.huntId)]
            ),
            NotificationBubbleType.TREASURE_HUNT,
            null,
            null,
            winner.userName,
            { figure: winner.userFigure, gender: winner.userGender }
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
        removeBubbleById,
        closeConfirm
    };
};

/** Reasons a chest tells its owner something, in the order the server numbers them. */
const CHEST_NOTIFICATION_KEYS = [
    'wiredchests.notification.full',
    'wiredchests.notification.donation',
    'wiredchests.notification.withdraw',
    'wiredchests.notification.empty',
    'wiredchests.notification.wired'
];

export const useNotificationState = () => {
    const { alerts, bubbleAlerts, confirms } = useSharedHook(useNotificationStore);

    return { alerts, bubbleAlerts, confirms };
};

export const useNotificationActions = () => {
    const {
        simpleAlert,
        showOctaneAlert,
        showTradeAlert,
        showConfirm,
        showSingleBubble,
        showMentionBubble,
        closeAlert,
        closeBubbleAlert,
        removeBubbleById,
        closeConfirm
    } = useSharedHook(useNotificationStore);

    return {
        simpleAlert,
        showOctaneAlert,
        showTradeAlert,
        showConfirm,
        showSingleBubble,
        showMentionBubble,
        closeAlert,
        closeBubbleAlert,
        removeBubbleById,
        closeConfirm
    };
};

export const useNotification = () => useSharedHook(useNotificationStore);

registerSharedHook(useNotificationStore);
