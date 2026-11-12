import { ClaimProductResultEvent, PetRespectFailedEvent, RoomEnterEvent, RoomMessageNotificationMessageEvent, WiredClickSettingsEvent } from '@octane/renderer';
import { useRef } from 'react';
import { NotificationAlertType, NotificationBubbleType } from '../../api';
import { localizeWithFallback } from '../../api/utils/localizeWithFallback';
import { useMessageEvent } from '../events';

type SimpleAlert = (message: string, type?: string, clickUrl?: string, clickUrlText?: string, title?: string) => void;
type ShowSingleBubble = (message: string, type: string, imageUrl?: string) => void;

/**
 * Three notices of the official client's notification handler that had no counterpart here:
 * - a pet scratch refused because the account is too young: an alert with both ages;
 * - new messages on the sticky notes of a room the player owns: a bubble with the room and the count;
 * - the outcome of any claimed product: a bubble, when the hotel has a text for that outcome;
 * - a room's wired click settings changing (who is clicked through, who is walked behind): a bubble.
 */
export const useOfficialNotices = (simpleAlert: SimpleAlert, showSingleBubble: ShowSingleBubble) => {
    // Official WiredEnvironment: a room starts with the default click settings, and each change is announced.
    const clickSettingsRef = useRef({ userOption: 0, furniOption: 0 });

    useMessageEvent<RoomEnterEvent>(RoomEnterEvent, () => {
        clickSettingsRef.current = { userOption: 0, furniOption: 0 };
    });

    useMessageEvent<WiredClickSettingsEvent>(WiredClickSettingsEvent, (event) => {
        const parser = event.getParser();
        const previous = clickSettingsRef.current;

        if (previous.userOption === parser.userOption && previous.furniOption === parser.furniOption) return;

        clickSettingsRef.current = { userOption: parser.userOption, furniOption: parser.furniOption };
        showSingleBubble(localizeWithFallback('notification.click_settings', 'The click settings of this room have changed.'), NotificationBubbleType.INFO);
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
