import {
    AddLinkEventTracker,
    ExtendRentOrBuyoutFurniMessageComposer,
    FurniRentOrBuyoutOfferMessageEvent,
    GetRentOrBuyoutOfferMessageComposer,
    GetRoomEngine,
    GetSessionDataManager,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    RoomObjectCategory
} from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { LocalizeText, localizeWithFallback, NotificationAlertType, SendMessageComposer } from '../../../../api';
import { Button, Column, LayoutCurrencyIcon, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { useMessageEvent, useNotification, usePurse, useRoom } from '../../../../hooks';

interface RentRequest {
    objectId: number;
    isWall: boolean;
    buyout: boolean;
    typeName: string;
    name: string;
}

interface RentOffer extends RentRequest {
    credits: number;
    points: number;
    pointsType: number;
}

/** Opened by `rent-furni/extend|buyout/<objectId>/<category>` from the furni infostand. */
export const FurniRentConfirmView: FC = () => {
    const [offer, setOffer] = useState<RentOffer>(null);
    const pendingRef = useRef<RentRequest>(null);
    const { roomSession = null } = useRoom();
    const { getCurrencyAmount = null } = usePurse();
    const { simpleAlert = null } = useNotification();

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const [, mode, objectIdText, categoryText] = url.split('/');
                const objectId = parseInt(objectIdText);
                const category = parseInt(categoryText);

                if ((mode !== 'extend' && mode !== 'buyout') || !(objectId > 0) || !roomSession) return;

                const roomObject = GetRoomEngine().getRoomObject(roomSession.roomId, objectId, category);

                if (!roomObject) return;

                const isWall = category === RoomObjectCategory.WALL;
                const furniData = isWall
                    ? GetSessionDataManager().getWallItemDataByName(roomObject.type)
                    : GetSessionDataManager().getFloorItemDataByName(roomObject.type);

                pendingRef.current = { objectId, isWall, buyout: mode === 'buyout', typeName: roomObject.type, name: furniData?.name ?? roomObject.type };
                SendMessageComposer(new GetRentOrBuyoutOfferMessageComposer(isWall, roomObject.type, mode === 'buyout'));
            },
            eventUrlPrefix: 'rent-furni/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [roomSession]);

    useMessageEvent<FurniRentOrBuyoutOfferMessageEvent>(FurniRentOrBuyoutOfferMessageEvent, (event) => {
        const parser = event.getParser();
        const pending = pendingRef.current;

        if (!parser || !pending || parser.furniTypeName !== pending.typeName || parser.buyout !== pending.buyout) return;

        pendingRef.current = null;
        setOffer({ ...pending, credits: parser.priceInCredits, points: parser.priceInActivityPoints, pointsType: parser.activityPointType });
    });

    if (!offer) return null;

    const confirm = () => {
        const notEnoughCredits = offer.credits > 0 && getCurrencyAmount(-1) < offer.credits;
        const notEnoughPoints = offer.points > 0 && getCurrencyAmount(offer.pointsType) < offer.points;

        if (notEnoughCredits || notEnoughPoints) {
            simpleAlert(
                LocalizeText(notEnoughCredits ? 'catalog.alert.notenough.credits.description' : `catalog.alert.notenough.activitypoints.description.${offer.pointsType}`),
                NotificationAlertType.DEFAULT,
                null,
                null,
                LocalizeText('catalog.alert.notenough.title')
            );

            return;
        }

        SendMessageComposer(new ExtendRentOrBuyoutFurniMessageComposer(offer.isWall, offer.objectId, offer.buyout));
        setOffer(null);
    };

    const title = offer.buyout
        ? localizeWithFallback('rent.confirmation.title.buyout', 'Confirm purchase')
        : localizeWithFallback('rent.confirmation.title.extend', 'Confirm Rentable extension');

    return (
        <OctaneCardView className="octane-widget-rent-confirm" theme="primary-slim">
            <OctaneCardHeaderView headerText={title} onCloseClick={() => setOffer(null)} />
            <OctaneCardContentView gap={2}>
                <Text bold>{offer.name}</Text>
                {!offer.buyout && <Text small>{localizeWithFallback('rent.confirmation.rental.description', 'You are about to rent the selected piece of furni for 7 more days:')}</Text>}
                <Column gap={1}>
                    {offer.credits > 0 && (
                        <div className="flex items-center gap-1">
                            <Text bold>{offer.credits}</Text>
                            <LayoutCurrencyIcon type={-1} />
                        </div>
                    )}
                    {offer.points > 0 && (
                        <div className="flex items-center gap-1">
                            <Text bold>{offer.points}</Text>
                            <LayoutCurrencyIcon type={offer.pointsType} />
                        </div>
                    )}
                </Column>
                <div className="flex gap-1 justify-end mt-auto">
                    <Button variant="secondary" onClick={() => setOffer(null)}>
                        {localizeWithFallback('generic.cancel', 'Cancel')}
                    </Button>
                    <Button variant="success" onClick={confirm}>
                        {offer.buyout ? localizeWithFallback('infostand.button.buyout', 'Buy-out') : localizeWithFallback('infostand.button.extend', 'Extend')}
                    </Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
