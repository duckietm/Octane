import type { IHotelViewLandingSlot } from '@octane/renderer';
import { FC } from 'react';
import { isHotelViewOfficialWidgetType } from '../hotelViewWidgets';
import { HotelViewAvatarImageWidget } from './HotelViewAvatarImageWidget';
import { HotelViewCommunityGoalVsModeWidget } from './HotelViewCommunityGoalVsModeWidget';
import { HotelViewGenericWidget } from './HotelViewGenericWidget';
import { HotelViewPromoArticleWidget } from './HotelViewPromoArticleWidget';
import { HotelViewRoomHopperNetworkWidget } from './HotelViewRoomHopperNetworkWidget';
import { HotelViewWidgetContainerWidget } from './HotelViewWidgetContainerWidget';

export interface HotelViewOfficialWidgetProps {
    slot: IHotelViewLandingSlot;
    slotNumber: number;
    resolveImageUrl: (url: string) => string;
    onLinkClick: (link: string) => void;
}

/**
 * `LandingViewWidgetType.getWidgetForType` for the official widget types the
 * emulator-driven slots can carry beside the ones `HotelView` renders itself.
 */
export const HotelViewOfficialWidget: FC<HotelViewOfficialWidgetProps> = (props) => {
    const { slot, slotNumber, resolveImageUrl, onLinkClick } = props;
    const type = slot.type as string;

    // `widgetcontainer` builds whichever widget the timing code selected, so the
    // switch has to be reachable from inside it too.
    const renderWidgetForType = (widgetType: string) => {
        switch (widgetType) {
            case 'promoarticle':
                return <HotelViewPromoArticleWidget headerText={slot.title} />;
            case 'avatarimage':
                return <HotelViewAvatarImageWidget />;
            case 'roomhoppernetwork':
                return <HotelViewRoomHopperNetworkWidget slot={slot} resolveImageUrl={resolveImageUrl} onLinkClick={onLinkClick} />;
            case 'generic':
                return <HotelViewGenericWidget slot={slot} slotNumber={slotNumber} resolveImageUrl={resolveImageUrl} onLinkClick={onLinkClick} />;
            case 'communitygoalvsmode':
                return <HotelViewCommunityGoalVsModeWidget slot={slot} voting={false} />;
            case 'communitygoalvsmodevote':
                return <HotelViewCommunityGoalVsModeWidget slot={slot} voting={true} />;
            case 'widgetcontainer':
                return (
                    <HotelViewWidgetContainerWidget
                        slot={slot}
                        slotNumber={slotNumber}
                        resolveImageUrl={resolveImageUrl}
                        onLinkClick={onLinkClick}
                        renderWidget={renderWidgetForType}
                    />
                );
            default:
                return null;
        }
    };

    if (!isHotelViewOfficialWidgetType(type)) return null;

    return renderWidgetForType(type);
};
