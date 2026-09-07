import { FC } from 'react';
import { WidgetErrorBoundary } from '../../../../common';
import { RentConfirmationView } from '../../../catalog/views/RentConfirmationView';
import { FurnitureContextMenuView } from './context-menu/FurnitureContextMenuView';
import { FurnitureAreaHideView } from './FurnitureAreaHideView';
import { FurnitureBackgroundColorView } from './FurnitureBackgroundColorView';
import { FurnitureBadgeDisplayView } from './FurnitureBadgeDisplayView';
import { FurnitureChestView } from './FurnitureChestView';
import { FurnitureCraftingView } from './FurnitureCraftingView';
import { FurnitureDimmerView } from './FurnitureDimmerView';
import { FurnitureExchangeCreditView } from './FurnitureExchangeCreditView';
import { FurnitureExternalImageView } from './FurnitureExternalImageView';
import { FurnitureFootballGateView } from './FurnitureFootballGateView';
import { FurnitureFriendFurniView } from './FurnitureFriendFurniView';
import { FurnitureGiftOpeningView } from './FurnitureGiftOpeningView';
import { FurnitureHighScoreView } from './FurnitureHighScoreView';
import { FurnitureInternalLinkView } from './FurnitureInternalLinkView';
import { FurnitureMannequinView } from './FurnitureMannequinView';
import { FurnitureRentableSpaceView } from './FurnitureRentableSpaceView';
import { FurnitureRoomLinkView } from './FurnitureRoomLinkView';
import { FurnitureSpamWallPostItView } from './FurnitureSpamWallPostItView';
import { FurnitureStackHeightView } from './FurnitureStackHeightView';
import { FurnitureStickieView } from './FurnitureStickieView';
import { FurnitureTrophyView } from './FurnitureTrophyView';
import { FurnitureYoutubeDisplayView } from './FurnitureYoutubeDisplayView';
import { FurniturePlaylistEditorWidgetView } from './playlist-editor/FurniturePlaylistEditorWidgetView';

export const FurnitureWidgetsView: FC<{}> = (props) => {
    return (
        <>
            <WidgetErrorBoundary name="FurnitureAreaHide">
                <FurnitureAreaHideView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="FurnitureBackgroundColor">
                <FurnitureBackgroundColorView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="FurnitureBadgeDisplay">
                <FurnitureBadgeDisplayView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="FurnitureChest">
                <FurnitureChestView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="FurnitureCrafting">
                <FurnitureCraftingView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="FurnitureDimmer">
                <FurnitureDimmerView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="FurnitureExchangeCredit">
                <FurnitureExchangeCreditView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="FurnitureExternalImage">
                <FurnitureExternalImageView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="FurnitureFootballGate">
                <FurnitureFootballGateView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="FurnitureFriendFurni">
                <FurnitureFriendFurniView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="FurnitureGiftOpening">
                <FurnitureGiftOpeningView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="FurnitureHighScore">
                <FurnitureHighScoreView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="FurnitureInternalLink">
                <FurnitureInternalLinkView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="FurnitureMannequin">
                <FurnitureMannequinView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="FurniturePlaylistEditorWidget">
                <FurniturePlaylistEditorWidgetView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="FurnitureRentableSpace">
                <FurnitureRentableSpaceView />
            </WidgetErrorBoundary>
            {/* The official rent confirmation belongs to the catalog but opens from the infostand extend / buy-out buttons. */}
            <WidgetErrorBoundary name="RentConfirmation">
                <RentConfirmationView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="FurnitureRoomLink">
                <FurnitureRoomLinkView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="FurnitureSpamWallPostIt">
                <FurnitureSpamWallPostItView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="FurnitureStackHeight">
                <FurnitureStackHeightView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="FurnitureStickie">
                <FurnitureStickieView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="FurnitureTrophy">
                <FurnitureTrophyView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="FurnitureContextMenu">
                <FurnitureContextMenuView />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary name="FurnitureYoutubeDisplay">
                <FurnitureYoutubeDisplayView />
            </WidgetErrorBoundary>
        </>
    );
};
