import type { IHotelViewLandingSlot } from '@octane/renderer';
import { FC } from 'react';
import { isHotelViewOfficialWidgetType } from '../hotelViewWidgets';
import { HotelViewAvatarImageWidget } from './HotelViewAvatarImageWidget';
import { HotelViewCommunityGoalVsModeWidget } from './HotelViewCommunityGoalVsModeWidget';
import { HotelViewGenericWidget } from './HotelViewGenericWidget';
import { HotelViewPromoArticleWidget } from './HotelViewPromoArticleWidget';
import { HotelViewRoomHopperNetworkWidget } from './HotelViewRoomHopperNetworkWidget';

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

    if (!isHotelViewOfficialWidgetType(type)) return null;

    switch (type) {
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
        default:
            return null;
    }
};
