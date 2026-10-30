import { FC } from 'react';
import { Column } from '../../common';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { OfferView } from '../catalog/views/targeted-offer/OfferView';
import { GroupRoomInformationView } from '../groups/views/GroupRoomInformationView';
import { NotificationCenterView } from '../notification-center/NotificationCenterView';
import { PurseView } from '../purse/PurseView';
import { PurseNoticesView } from '../purse/views/PurseNoticesView';
import { MysteryBoxExtensionView } from '../room/widgets/mysterybox/MysteryBoxExtensionView';
import { RoomPromotesWidgetView } from '../room/widgets/room-promotes/RoomPromotesWidgetView';
import { SoundboardFeedView } from '../soundboard/SoundboardFeedView';

export const RightSideView: FC<{}> = (props) => {
    return (
        <NativeTextTree>
            <div className="absolute top-0 right-1 z-10 w-[min(230px,calc(100vw-16px))] sm:w-[min(230px,calc(100vw-20px))] h-[calc(100%-55px)] pointer-events-none">
                <Column gap={1} position="relative" alignItems="end" className="w-full">
                    <PurseView />
                    <PurseNoticesView />
                    <GroupRoomInformationView />
                    <MysteryBoxExtensionView />
                    <OfferView />
                    <RoomPromotesWidgetView />
                    <NotificationCenterView />
                    <SoundboardFeedView />
                </Column>
            </div>
        </NativeTextTree>
    );
};
