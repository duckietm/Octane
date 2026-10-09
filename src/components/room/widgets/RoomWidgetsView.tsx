import {
    GetRoomEngine,
    HabboWebTools,
    RoomControllerLevel,
    RoomEngineObjectEvent,
    RoomEngineRoomAdEvent,
    RoomEngineTriggerWidgetEvent,
    RoomEngineUseProductEvent,
    RoomId,
    RoomObjectVariable,
    RoomSessionErrorMessageEvent,
    RoomZoomEvent
} from '@octane/renderer';
import { FC, useState } from 'react';
import { DispatchUiEvent, LocalizeText, localizeWithFallback, NotificationAlertType, RoomWidgetUpdateRoomObjectEvent } from '../../../api';
import { WidgetErrorBoundary } from '../../../common';
import { useOctaneEvent, useNotification, usePollSubscriptions, useRoom } from '../../../hooks';
import { AvatarInfoWidgetView } from './avatar-info/AvatarInfoWidgetView';
import { BuildHeightWidgetView } from './BuildHeightWidgetView';
import { ChatWidgetView } from './chat/ChatWidgetView';
import { ChatInputView } from './chat-input/ChatInputView';
import { FurniChooserWidgetView } from './choosers/FurniChooserWidgetView';
import { UserChooserWidgetView } from './choosers/UserChooserWidgetView';
import { DoorbellWidgetView } from './doorbell/DoorbellWidgetView';
import { FriendRequestWidgetView } from './friend-request/FriendRequestWidgetView';
import { FurnitureWidgetsView } from './furniture/FurnitureWidgetsView';
import { PetBreedingView } from './pet-breeding/PetBreedingView';
import { PetPackageWidgetView } from './pet-package/PetPackageWidgetView';
import { PollWidgetView } from './poll/PollWidgetView';
import { FurniRentConfirmView } from './rent/FurniRentConfirmView';
import { AchievementResolutionView } from './resolution/AchievementResolutionView';
import { RoomCompetitionView } from './room-competition/RoomCompetitionView';
import { RoomKeybindView } from './RoomKeybindView';
import { RoomFilterWordsWidgetView } from './room-filter-words/RoomFilterWordsWidgetView';
import { RoomThumbnailWidgetView } from './room-thumbnail/RoomThumbnailWidgetView';
import { RoomToolsWidgetView } from './room-tools/RoomToolsWidgetView';
import { applyRoomZoom } from './room-tools/roomZoom.helpers';
import { WordQuizWidgetView } from './word-quiz/WordQuizWidgetView';

const MAX_ZOOM_SHIFT = 3;

export const RoomWidgetsView: FC<{}> = (props) => {
    const { roomSession = null } = useRoom();
    const { simpleAlert = null } = useNotification();
    const [adTooltip, setAdTooltip] = useState<{ objectId: number; text: string }>(null);

    const getAdObject = (event: RoomEngineObjectEvent) => {
        const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);
        const url = roomObject?.model?.getValue<string>(RoomObjectVariable.FURNITURE_AD_URL) ?? '';

        return { roomObject, url: url.startsWith('http') ? url : '' };
    };

    // Like Habbo: visitors open an ad with one click; people who can move furni need a double click.
    const handleRoomAdClick = (event: RoomEngineObjectEvent) => {
        const { url } = getAdObject(event);

        if (!url) return;

        const canMoveFurni = roomSession.isRoomOwner || roomSession.controllerLevel >= RoomControllerLevel.GUEST;
        const isDoubleClick = event.type === RoomEngineRoomAdEvent.FURNI_DOUBLE_CLICK;

        if (canMoveFurni !== isDoubleClick) return;

        HabboWebTools.openUntrustedWebPage(url);
    };

    const handleRoomAdTooltip = (event: RoomEngineObjectEvent) => {
        if (event.type === RoomEngineRoomAdEvent.TOOLTIP_HIDE) {
            setAdTooltip((prev) => (prev && prev.objectId === event.objectId ? null : prev));

            return;
        }

        const { roomObject, url } = getAdObject(event);

        if (!url) return;

        setAdTooltip({
            objectId: event.objectId,
            text: localizeWithFallback(
                `${roomObject.type}.tooltip`,
                localizeWithFallback('ads.roomad.tooltip', 'This is an advertisement. Clicking it will open another web page.')
            )
        });
    };

    usePollSubscriptions();

    useOctaneEvent<RoomZoomEvent>(RoomZoomEvent.ROOM_ZOOM, (event) => {
        const level = Number.isFinite(event.level) ? Math.floor(event.level) : 1;
        const logicalScale = level < 1 ? 0.5 : (1 << Math.min(level - 1, MAX_ZOOM_SHIFT));
        applyRoomZoom(event.roomId, logicalScale, event.isFlipForced);
    });

    useOctaneEvent<RoomEngineObjectEvent>(
        [
            RoomEngineTriggerWidgetEvent.REQUEST_TEASER,
            RoomEngineTriggerWidgetEvent.REQUEST_ECOTRONBOX,
            RoomEngineTriggerWidgetEvent.REQUEST_CLOTHING_CHANGE,
            RoomEngineTriggerWidgetEvent.REQUEST_PLAYLIST_EDITOR,
            RoomEngineTriggerWidgetEvent.OPEN_WIDGET,
            RoomEngineTriggerWidgetEvent.CLOSE_WIDGET,
            RoomEngineRoomAdEvent.FURNI_CLICK,
            RoomEngineRoomAdEvent.FURNI_DOUBLE_CLICK,
            RoomEngineRoomAdEvent.TOOLTIP_SHOW,
            RoomEngineRoomAdEvent.TOOLTIP_HIDE
        ],
        (event) => {
            if (!roomSession) return;

            const objectId = event.objectId;
            const category = event.category;

            let updateEvent: RoomWidgetUpdateRoomObjectEvent = null;

            switch (event.type) {
                case RoomEngineTriggerWidgetEvent.REQUEST_TEASER:
                    //widgetHandler.processWidgetMessage(new RoomWidgetFurniToWidgetMessage(RoomWidgetFurniToWidgetMessage.REQUEST_TEASER, objectId, category, event.roomId));
                    break;
                case RoomEngineTriggerWidgetEvent.REQUEST_ECOTRONBOX:
                    //widgetHandler.processWidgetMessage(new RoomWidgetFurniToWidgetMessage(RoomWidgetFurniToWidgetMessage.REQUEST_ECOTRONBOX, objectId, category, event.roomId));
                    break;
                case RoomEngineTriggerWidgetEvent.REQUEST_PLACEHOLDER:
                    //widgetHandler.processWidgetMessage(new RoomWidgetFurniToWidgetMessage(RoomWidgetFurniToWidgetMessage.REQUEST_PLACEHOLDER, objectId, category, event.roomId));
                    break;
                case RoomEngineTriggerWidgetEvent.REQUEST_CLOTHING_CHANGE:
                    //widgetHandler.processWidgetMessage(new RoomWidgetFurniToWidgetMessage(RoomWidgetFurniToWidgetMessage.REQUEST_CLOTHING_CHANGE, objectId, category, event.roomId));
                    break;
                case RoomEngineTriggerWidgetEvent.REQUEST_PLAYLIST_EDITOR:
                    //widgetHandler.processWidgetMessage(new RoomWidgetFurniToWidgetMessage(RoomWidgetFurniToWidgetMessage.REQUEST_PLAYLIST_EDITOR, objectId, category, event.roomId));
                    break;
                case RoomEngineTriggerWidgetEvent.OPEN_WIDGET:
                case RoomEngineTriggerWidgetEvent.CLOSE_WIDGET:
                case RoomEngineUseProductEvent.USE_PRODUCT_FROM_ROOM:
                    //widgetHandler.processEvent(event);
                    break;
                case RoomEngineRoomAdEvent.FURNI_CLICK:
                case RoomEngineRoomAdEvent.FURNI_DOUBLE_CLICK:
                    handleRoomAdClick(event);
                    break;
                case RoomEngineRoomAdEvent.TOOLTIP_SHOW:
                case RoomEngineRoomAdEvent.TOOLTIP_HIDE:
                    handleRoomAdTooltip(event);
                    break;
            }

            if (!updateEvent) return;

            let dispatchEvent = true;

            if (RoomId.isRoomPreviewerId(updateEvent.roomId)) return;

            if (updateEvent instanceof RoomWidgetUpdateRoomObjectEvent) dispatchEvent = !RoomId.isRoomPreviewerId(updateEvent.roomId);

            if (dispatchEvent) DispatchUiEvent(updateEvent);
        }
    );

    useOctaneEvent<RoomSessionErrorMessageEvent>(
        [
            RoomSessionErrorMessageEvent.RSEME_KICKED,
            RoomSessionErrorMessageEvent.RSEME_PETS_FORBIDDEN_IN_HOTEL,
            RoomSessionErrorMessageEvent.RSEME_PETS_FORBIDDEN_IN_FLAT,
            RoomSessionErrorMessageEvent.RSEME_MAX_PETS,
            RoomSessionErrorMessageEvent.RSEME_MAX_NUMBER_OF_OWN_PETS,
            RoomSessionErrorMessageEvent.RSEME_NO_FREE_TILES_FOR_PET,
            RoomSessionErrorMessageEvent.RSEME_SELECTED_TILE_NOT_FREE_FOR_PET,
            RoomSessionErrorMessageEvent.RSEME_BOTS_FORBIDDEN_IN_HOTEL,
            RoomSessionErrorMessageEvent.RSEME_BOTS_FORBIDDEN_IN_FLAT,
            RoomSessionErrorMessageEvent.RSEME_BOT_LIMIT_REACHED,
            RoomSessionErrorMessageEvent.RSEME_SELECTED_TILE_NOT_FREE_FOR_BOT,
            RoomSessionErrorMessageEvent.RSEME_BOT_NAME_NOT_ACCEPTED
        ],
        (event) => {
            let errorTitle = LocalizeText('error.title');
            let errorMessage: string = '';

            switch (event.type) {
                case RoomSessionErrorMessageEvent.RSEME_MAX_PETS:
                    errorMessage = LocalizeText('room.error.max_pets');
                    break;
                case RoomSessionErrorMessageEvent.RSEME_MAX_NUMBER_OF_OWN_PETS:
                    errorMessage = LocalizeText('room.error.max_own_pets');
                    break;
                case RoomSessionErrorMessageEvent.RSEME_KICKED:
                    errorMessage = LocalizeText('room.error.kicked');
                    errorTitle = LocalizeText('generic.alert.title');
                    break;
                case RoomSessionErrorMessageEvent.RSEME_PETS_FORBIDDEN_IN_HOTEL:
                    errorMessage = LocalizeText('room.error.pets.forbidden_in_hotel');
                    break;
                case RoomSessionErrorMessageEvent.RSEME_PETS_FORBIDDEN_IN_FLAT:
                    errorMessage = LocalizeText('room.error.pets.forbidden_in_flat');
                    break;
                case RoomSessionErrorMessageEvent.RSEME_NO_FREE_TILES_FOR_PET:
                    errorMessage = LocalizeText('room.error.pets.no_free_tiles');
                    break;
                case RoomSessionErrorMessageEvent.RSEME_SELECTED_TILE_NOT_FREE_FOR_PET:
                    errorMessage = LocalizeText('room.error.pets.selected_tile_not_free');
                    break;
                case RoomSessionErrorMessageEvent.RSEME_BOTS_FORBIDDEN_IN_HOTEL:
                    errorMessage = LocalizeText('room.error.bots.forbidden_in_hotel');
                    break;
                case RoomSessionErrorMessageEvent.RSEME_BOTS_FORBIDDEN_IN_FLAT:
                    errorMessage = LocalizeText('room.error.bots.forbidden_in_flat');
                    break;
                case RoomSessionErrorMessageEvent.RSEME_BOT_LIMIT_REACHED:
                    errorMessage = LocalizeText('room.error.max_bots');
                    break;
                case RoomSessionErrorMessageEvent.RSEME_SELECTED_TILE_NOT_FREE_FOR_BOT:
                    errorMessage = LocalizeText('room.error.bots.selected_tile_not_free');
                    break;
                case RoomSessionErrorMessageEvent.RSEME_BOT_NAME_NOT_ACCEPTED:
                    errorMessage = LocalizeText('room.error.bots.name.not.accepted');
                    break;
                default:
                    return;
            }

            simpleAlert(errorMessage, NotificationAlertType.DEFAULT, null, null, errorTitle);
        }
    );

    return (
        <WidgetErrorBoundary name="RoomWidgets">
            <div className="absolute top-0 left-0 pointer-events-none size-full">
                <WidgetErrorBoundary name="FurnitureWidgets">
                    <FurnitureWidgetsView />
                </WidgetErrorBoundary>
            </div>
            {adTooltip && (
                <div className="octane-room-ad-tooltip absolute left-1/2 top-[40%] -translate-x-1/2 pointer-events-none z-10 max-w-[260px] rounded-md bg-[rgba(34,34,30,0.9)] px-3 py-2 text-center text-[12px] text-white">
                    {adTooltip.text}
                </div>
            )}
            <WidgetErrorBoundary name="AvatarInfoWidget">
                <AvatarInfoWidgetView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="ChatWidget">
                <ChatWidgetView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="ChatInput">
                <ChatInputView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="RoomKeybind">
                <RoomKeybindView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="DoorbellWidget">
                <DoorbellWidgetView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="BuildHeightWidget">
                <BuildHeightWidgetView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="RoomToolsWidget">
                <RoomToolsWidgetView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="RoomFilterWordsWidget">
                <RoomFilterWordsWidgetView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="RoomThumbnailWidget">
                <RoomThumbnailWidgetView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="FurniChooserWidget">
                <FurniChooserWidgetView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="PetPackageWidget">
                <PetPackageWidgetView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="UserChooserWidget">
                <UserChooserWidgetView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="WordQuizWidget">
                <WordQuizWidgetView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="PollWidget">
                <PollWidgetView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="FurniRentConfirm">
                <FurniRentConfirmView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="RoomCompetition">
                <RoomCompetitionView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="AchievementResolution">
                <AchievementResolutionView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="PetBreeding">
                <PetBreedingView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="FriendRequestWidget">
                <FriendRequestWidgetView />
            </WidgetErrorBoundary>
        </WidgetErrorBoundary>
    );
};
