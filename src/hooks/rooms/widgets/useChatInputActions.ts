import {
    AvatarExpressionEnum,
    CreateLinkEvent,
    GetEventDispatcher,
    GetRoomEngine,
    GetSessionDataManager,
    GetTicker,
    HabboClubLevelEnum,
    RoomControllerLevel,
    RoomRotatingEffect,
    RoomSettingsComposer,
    RoomShakingEffect,
    RoomZoomEvent,
    TextureUtils,
    UseHabbiconComposer
} from '@nitrots/nitro-renderer';
import { useCallback } from 'react';
import { ChatMessageTypeEnum, GetClubMemberLevel, GetConfigurationValue, LocalizeText, SendMessageComposer } from '../../../api';
import { useNotification } from '../../notification';
import { useTranslation } from '../../translation';
import { useRoom } from '../useRoom';

/**
 * Pure imperative dispatch for the chat-input widget. Exposes
 * `sendChat(text, chatType, recipientName?, styleId?)` which:
 *
 *  1. Intercepts in-room slash commands (`:shake`, `:rotate`, `:zoom`,
 *     `:screenshot`, `:pickall`, ...) and turns them into the matching
 *     renderer/composer call — these never reach the server as chat
 *     payload.
 *  2. Falls back to the regular default/shout/whisper composer path,
 *     optionally piping the text through the translation pipeline if
 *     outgoing translation is enabled.
 *
 * No state lives in this hook — the typing/flood/idle state belongs
 * to useChatInputState.
 */
export const useChatInputActions = () => {
    const { showNitroAlert = null, showConfirm = null } = useNotification();
    const { settings, translateOutgoing, enqueueOutgoingTranslation } = useTranslation();
    const { roomSession = null } = useRoom();

    const sendChat = useCallback(
        (text: string, chatType: number, recipientName: string = '', styleId: number = 0) => {
            if (text === '') return null;

            const parts = text.split(' ');

            if (parts.length > 0) {
                const firstPart = parts[0];
                let secondPart = '';

                if (parts.length > 1) secondPart = parts[1];

                if (firstPart.charAt(0) === ':' && secondPart === 'x') {
                    const selectedAvatarId = GetRoomEngine().selectedAvatarId;

                    if (selectedAvatarId > -1) {
                        const userData = roomSession?.userDataManager?.getUserDataByIndex(selectedAvatarId);

                        if (userData) {
                            secondPart = userData.name;
                            text = text.replace(' x', ' ' + userData.name);
                        }
                    }
                }

                switch (firstPart.toLowerCase()) {
                    case ':shake':
                        RoomShakingEffect.init(2500, 5000);
                        RoomShakingEffect.turnVisualizationOn();

                        return null;

                    case ':rotate':
                        RoomRotatingEffect.init(2500, 5000);
                        RoomRotatingEffect.turnVisualizationOn();

                        return null;
                    case ':d':
                    case ';d':
                        if (GetClubMemberLevel() === HabboClubLevelEnum.VIP) {
                            roomSession?.sendExpressionMessage(AvatarExpressionEnum.LAUGH.ordinal);
                        }

                        break;
                    case 'o/':
                    case '_o/':
                        roomSession?.sendExpressionMessage(AvatarExpressionEnum.WAVE.ordinal);

                        return null;
                    case ':kiss':
                        if (GetClubMemberLevel() === HabboClubLevelEnum.VIP) {
                            roomSession?.sendExpressionMessage(AvatarExpressionEnum.BLOW.ordinal);

                            return null;
                        }

                        break;
                    case ':jump':
                        if (GetClubMemberLevel() === HabboClubLevelEnum.VIP) {
                            roomSession?.sendExpressionMessage(AvatarExpressionEnum.JUMP.ordinal);

                            return null;
                        }

                        break;
                    case ':idle':
                        roomSession?.sendExpressionMessage(AvatarExpressionEnum.IDLE.ordinal);

                        return null;
                    case '_b':
                        roomSession?.sendExpressionMessage(AvatarExpressionEnum.RESPECT.ordinal);

                        return null;
                    case ':sign':
                        roomSession?.sendSignMessage(parseInt(secondPart));

                        return null;
                    case ':habbicon': {
                        const habbiconId = parseInt(secondPart);

                        if(Number.isFinite(habbiconId) && habbiconId > 0) SendMessageComposer(new UseHabbiconComposer(habbiconId));

                        return null;
                    }
                    case ':iddqd':
                    case ':flip':
                        if (roomSession) GetEventDispatcher().dispatchEvent(new RoomZoomEvent(roomSession.roomId, -1, true));

                        return null;
                    case ':zoom': {
                        const zoomLevel = parseInt(secondPart);

                        if (roomSession && Number.isFinite(zoomLevel)) GetEventDispatcher().dispatchEvent(new RoomZoomEvent(roomSession.roomId, zoomLevel));

                        return null;
                    }
                    case ':screenshot':
                        if (!roomSession) return null;

                        {
                            const texture = GetRoomEngine().createTextureFromRoom(roomSession.roomId, 1);

                            (async () => {
                                try {
                                    const imageUrl = await TextureUtils.generateImageUrl(texture);
                                    if (!imageUrl) return;

                                    const link = document.createElement('a');
                                    link.href = imageUrl;
                                    link.download = `room_${roomSession.roomId}_${Date.now()}.png`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                } catch (e) {
                                    console.warn('[Screenshot] Failed:', e);
                                }
                            })();
                        }
                        return null;
                    case ':pickall':
                        if (roomSession?.isRoomOwner || GetSessionDataManager().isModerator) {
                            showConfirm(
                                LocalizeText('room.confirm.pick_all'),
                                () => {
                                    GetSessionDataManager().sendSpecialCommandMessage(':pickall');
                                },
                                null,
                                null,
                                null,
                                LocalizeText('generic.alert.title')
                            );
                        }

                        return null;
                    case ':ejectall':
                        if (
                            roomSession?.isRoomOwner ||
                            GetSessionDataManager().isModerator ||
                            (roomSession?.controllerLevel ?? 0) >= RoomControllerLevel.GUEST
                        ) {
                            showConfirm(
                                LocalizeText('room.confirm.eject_all'),
                                () => {
                                    GetSessionDataManager().sendSpecialCommandMessage(':ejectall');
                                },
                                null,
                                null,
                                null,
                                LocalizeText('generic.alert.title')
                            );
                        }
                        return null;
                    case ':furni':
                        CreateLinkEvent('furni-chooser/');
                        return null;
                    case ':chooser':
                        CreateLinkEvent('user-chooser/');
                        return null;
                    case ':floor':
                    case ':bcfloor':
                        if ((roomSession?.controllerLevel ?? 0) >= RoomControllerLevel.ROOM_OWNER) CreateLinkEvent('floor-editor/show');

                        return null;
                    case ':togglefps': {
                        if (GetTicker().maxFPS > 0) GetTicker().maxFPS = 0;
                        else GetTicker().maxFPS = GetConfigurationValue('system.animation.fps');

                        return null;
                    }
                    case ':pileouface':
                    case ':pof':
                    case ':coinflip': {
                        // Coin flip, broadcast to everyone in the room.
                        const coinResult = Math.random() < 0.5 ? 'Heads' : 'Tails';

                        roomSession?.sendChatMessage(`* flips a coin... ${coinResult}! *`, styleId);

                        return null;
                    }
                    case ':client':
                    case ':nitro':
                    case ':billsonnn':
                        showNitroAlert();
                        return null;
                    case ':settings':
                        if (roomSession && (roomSession.isRoomOwner || GetSessionDataManager().isModerator)) {
                            SendMessageComposer(new RoomSettingsComposer(roomSession.roomId));
                        }

                        return null;
                    case ':customize':
                        CreateLinkEvent('customize/show');
                        return null;
                }
            }

            if (!roomSession) return null;

            const preserveTrailingSpaces = (message: string) => {
                if (message.startsWith(':')) return message;

                return message.replace(/ +$/g, (match) => ' '.repeat(match.length));
            };

            const dispatchChatMessage = (message: string) => {
                const preservedMessage = preserveTrailingSpaces(message);

                switch (chatType) {
                    case ChatMessageTypeEnum.CHAT_DEFAULT:
                        roomSession.sendChatMessage(preservedMessage, styleId);
                        return;
                    case ChatMessageTypeEnum.CHAT_SHOUT:
                        roomSession.sendShoutMessage(preservedMessage, styleId);
                        return;
                    case ChatMessageTypeEnum.CHAT_WHISPER:
                        roomSession.sendWhisperMessage(recipientName, preservedMessage, styleId);
                        return;
                }
            };

            const trimmedText = text.trimStart();
            const shouldTranslateOutgoing = settings.enabled && !!trimmedText.length && trimmedText.charAt(0) !== ':';

            if (!shouldTranslateOutgoing) {
                dispatchChatMessage(text);
                return null;
            }

            void (async () => {
                const translation = await translateOutgoing(text);

                if (translation) {
                    enqueueOutgoingTranslation(translation);
                    dispatchChatMessage(translation.translatedText);
                    return;
                }

                dispatchChatMessage(text);
            })();

            return null;
        },
        [roomSession, settings, translateOutgoing, enqueueOutgoingTranslation, showConfirm, showNitroAlert]
    );

    return { sendChat };
};
