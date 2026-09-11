import type { IHotelViewLandingSlot } from '@octane/renderer';
import { FC } from 'react';
import { GetConfigurationValue, localizeWithFallback } from '../../../api';

export interface HotelViewRoomHopperNetworkWidgetProps {
    slot: IHotelViewLandingSlot;
    resolveImageUrl: (url: string) => string;
    onLinkClick: (link: string) => void;
}

/**
 * `RoomHopperNetworkWidget.as` + the `room_hopper_network` layout (250x218): a
 * header row, an 18px caption, an info text beside a 120x120 image and a wide
 * "go to room" button. The official button opens a room network
 * (`RoomNetworkOpenConnection`), which the emulator does not serve: the slot
 * link is followed instead.
 */
export const HotelViewRoomHopperNetworkWidget: FC<HotelViewRoomHopperNetworkWidgetProps> = (props) => {
    const { slot, resolveImageUrl, onLinkClick } = props;
    const imageUrl = slot.imageUrl || GetConfigurationValue<string>('landing.view.roomhopper.image.uri', '');
    const header = localizeWithFallback('landing.view.roomhoppernetwork.title', 'Room hopper');
    const caption = slot.title || localizeWithFallback('landing.view.roomhoppernetwork.caption', 'Hop from room to room');
    const info = slot.body || localizeWithFallback('landing.view.roomhoppernetwork.info', 'Jump into a random room of the network and meet new Habbos.');
    const buttonText = slot.buttonText || localizeWithFallback('landing.view.roomhoppernetwork.gotoroom', 'Go to room');

    return (
        <div className="hotelview-room-hopper">
            <div className="hotelview-widget-header">
                <i className="hotelview-widget-header__bar" aria-hidden="true" />
                <span className="hotelview-widget-header__text">{header}</span>
                <i className="hotelview-widget-header__line" aria-hidden="true" />
            </div>
            <h2 className="hotelview-room-hopper__caption">{caption}</h2>
            <div className="hotelview-room-hopper__body">
                <p className="hotelview-room-hopper__info">{info}</p>
                {imageUrl && <img className="hotelview-room-hopper__image" src={resolveImageUrl(imageUrl)} alt="" />}
            </div>
            <button type="button" className="hotelview-widget-button hotelview-room-hopper__button" onClick={() => onLinkClick(slot.link)}>
                {buttonText}
            </button>
        </div>
    );
};
