import {
    ClaimProductResultEvent,
    GetRoomEngine,
    PetRespectFailedEvent,
    RoomEnterEvent,
    RoomMessageNotificationMessageEvent,
    WiredClickSettingsEvent,
    WiredMenuErrorEvent,
    WiredMenuErrorParser
} from '@octane/renderer';
import { NotificationAlertType, NotificationBubbleType } from '../../api';
import { localizeWithFallback } from '../../api/utils/localizeWithFallback';
import { useMessageEvent } from '../events';
import { resolveWiredClickSettingsUpdate, useWiredClickSettingsStore } from '../wired/wiredClickSettingsStore';

type SimpleAlert = (message: string, type?: string, clickUrl?: string, clickUrlText?: string, title?: string) => void;
type ShowSingleBubble = (message: string, type: string, imageUrl?: string) => void;

/**
 * Three notices of the official client's notification handler that had no counterpart here:
 * - a pet scratch refused because the account is too young: an alert with both ages;
 * - new messages on the sticky notes of a room the player owns: a bubble with the room and the count;
 * - the outcome of any claimed product: a bubble, when the hotel has a text for that outcome;
 * - the wired menu refusing an action that is the variable owner's alone: a bubble;
 * - a room's wired click settings changing (who is clicked through, who is walked behind): a bubble, or for a
 *   wired editor the staying switch that lets them ignore the settings.
 */
export const useOfficialNotices = (simpleAlert: SimpleAlert, showSingleBubble: ShowSingleBubble) => {
    // Official WiredEnvironment: a room starts with the default click settings, and each change is announced.
    // The settings are applied here too, so that an editor's "ignore" switch decides in one place.
    useMessageEvent<RoomEnterEvent>(RoomEnterEvent, () => {
        useWiredClickSettingsStore.getState().resetRoom();
    });

    useMessageEvent<WiredClickSettingsEvent>(WiredClickSettingsEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        const store = useWiredClickSettingsStore.getState();
        const update = resolveWiredClickSettingsUpdate(store, parser);

        store.setOptions(parser.userOption, parser.furniOption);

        if (update.ignored !== store.ignored) store.setIgnored(update.ignored);
        if (update.apply) GetRoomEngine().setWiredClickSettings(parser.userOption, parser.furniOption);
        if (update.notice === 'none') return;

        const changed = localizeWithFallback('notification.click_settings', 'The click settings of this room have changed.');
        const text =
            update.notice === 'changed_ignored'
                ? `${localizeWithFallback('notification.click_settings_ignored', 'You are ignoring the click settings.')} ${changed}`
                : changed;

        showSingleBubble(text, NotificationBubbleType.INFO);
    });

    // Official WiredMenuController: of the wired menu's refusals only "not the variable's owner" is announced.
    useMessageEvent<WiredMenuErrorEvent>(WiredMenuErrorEvent, (event) => {
        const errorCode = event.getParser()?.errorCode;

        if (errorCode !== WiredMenuErrorParser.NOT_VARIABLE_OWNER) return;

        showSingleBubble(
            localizeWithFallback(`wiredmenu.error_message.${errorCode}`, 'Only the owner of this variable can perform this action.'),
            NotificationBubbleType.INFO
        );
    });

    useMessageEvent<PetRespectFailedEvent>(PetRespectFailedEvent, (event) => {
        const parser = event.getParser();

        simpleAlert(
            localizeWithFallback(
                'room.error.pets.respectfailed',
                'Your account has to be %required_age% days old to scratch a pet. It is %avatar_age% days old.',
                ['required_age', 'avatar_age'],
                [parser.requiredDays.toString(), parser.avatarAgeInDays.toString()]
            ),
            NotificationAlertType.DEFAULT,
            null,
            null,
            localizeWithFallback('error.title', 'Error')
        );
    });

    useMessageEvent<RoomMessageNotificationMessageEvent>(RoomMessageNotificationMessageEvent, (event) => {
        const parser = event.getParser();

        showSingleBubble(
            localizeWithFallback(
                'notifications.text.room.messages.posted',
                '%messages_count% new messages were posted in your room %room_name%.',
                ['room_name', 'messages_count'],
                [parser.roomName, parser.messageCount.toString()]
            ),
            NotificationBubbleType.INFO
        );
    });

    useMessageEvent<ClaimProductResultEvent>(ClaimProductResultEvent, (event) => {
        const parser = event.getParser();
        // The claim's own name when the hotel has none for it, and no bubble at all without a text for the outcome.
        const claimName = localizeWithFallback(`claim_product.name.${parser.claimId}`, parser.claimId);
        const text = localizeWithFallback(`claim_product.result.${parser.result}`, '', ['claim_name'], [claimName]);

        if (text) showSingleBubble(text, NotificationBubbleType.INFO);
    });
};
