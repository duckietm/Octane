import { FC } from 'react';
import { Column } from '../../common';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { useIsHandheld } from '../../hooks/handheld/useHandheldLayout';
import { useHandheldHudStore } from '../../state/handheldHudStore';
import { OfferView } from '../catalog/views/targeted-offer/OfferView';
import { GroupRoomInformationView } from '../groups/views/GroupRoomInformationView';
import { NotificationCenterView } from '../notification-center/NotificationCenterView';
import { PurseView } from '../purse/PurseView';
import { PurseNoticesView } from '../purse/views/PurseNoticesView';
import { MysteryBoxExtensionView } from '../room/widgets/mysterybox/MysteryBoxExtensionView';
import { RoomPromotesWidgetView } from '../room/widgets/room-promotes/RoomPromotesWidgetView';
import { SoundboardFeedView } from '../soundboard/SoundboardFeedView';

export const RightSideView: FC<{}> = (props) => {
    const isHandheld = useIsHandheld();
    const sideOpen = useHandheldHudStore((state) => state.sideOpen);

    // The widgets that stay in the column for as long as they apply (not the notifications, which come and go).
    const widgets = (
        <>
            <PurseNoticesView />
            <GroupRoomInformationView />
            <MysteryBoxExtensionView />
            <OfferView />
            <RoomPromotesWidgetView />
        </>
    );

    return (
        <NativeTextTree>
            <div className="octane-right-side absolute top-0 right-1 z-10 w-[min(230px,calc(100vw-16px))] sm:w-[min(230px,calc(100vw-20px))] h-[calc(100%-55px)] pointer-events-none">
                <Column gap={1} position="relative" alignItems="end" className="w-full">
                    <PurseView />
                    {/* Phone layout: the purse's arrow folds these away, so an idle screen shows the balances only. */}
                    {isHandheld ? (
                        <div className="octane-handheld-side-widgets" hidden={!sideOpen}>
                            {widgets}
                        </div>
                    ) : (
                        widgets
                    )}
                    <NotificationCenterView />
                    <SoundboardFeedView />
                </Column>
            </div>
        </NativeTextTree>
    );
};
