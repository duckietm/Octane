import {
    ExtendRentOrBuyoutFurniMessageComposer,
    ExtendRentOrBuyoutStripItemMessageComposer,
    FurniRentOrBuyoutOfferMessageEvent,
    FurnitureType,
    GetRentOrBuyoutOfferMessageComposer,
    IFurnitureData
} from '@octane/renderer';
import { useCallback, useState } from 'react';
import { useSharedHook } from '@/state/useSharedHook';
import { GetConfigurationValue, LocalizeText, SendMessageComposer } from '../../api';
import { getRentConfirmationAffordability, isOfferForFurniType, RentOrBuyoutOffer } from '../../components/catalog/views/rentConfirmation.helpers';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';
import { usePurse } from '../purse';

export interface RentConfirmationRequest {
    furniData: IFurnitureData;
    buyout: boolean;
    /** Room item id when the dialog was opened from the infostand (official MODE_INFOSTAND). */
    roomItemId: number;
    /** Inventory item id when opened from the inventory (official MODE_INVENTORY). */
    stripId: number;
}

/**
 * The official RentConfirmationWindow: asks the server for the extend /
 * buy-out price of a furni type (2518), opens once the FurniRentOrBuyoutOffer
 * (35) for that type arrives and the viewer can pay, then extends or buys out
 * the room item (1071) or the inventory item (2115).
 */
const useRentConfirmationState = () => {
    const [request, setRequest] = useState<RentConfirmationRequest>(null);
    const [offer, setOffer] = useState<RentOrBuyoutOffer>(null);
    const { getCurrencyAmount = null } = usePurse();
    const { simpleAlert = null } = useNotification();

    const close = useCallback(() => {
        setRequest(null);
        setOffer(null);
    }, []);

    const openRentConfirmation = useCallback((furniData: IFurnitureData, buyout: boolean, roomItemId: number = -1, stripId: number = -1) => {
        if (!furniData) return;

        setOffer(null);
        setRequest({ furniData, buyout, roomItemId, stripId });
        SendMessageComposer(new GetRentOrBuyoutOfferMessageComposer(furniData.type === FurnitureType.WALL, furniData.fullName, buyout));
    }, []);

    const confirm = useCallback(() => {
        if (!request || !offer) return;

        const isWallItem = request.furniData.type === FurnitureType.WALL;

        if (request.roomItemId > -1) SendMessageComposer(new ExtendRentOrBuyoutFurniMessageComposer(isWallItem, request.roomItemId, offer.buyout));
        else if (request.stripId > -1) SendMessageComposer(new ExtendRentOrBuyoutStripItemMessageComposer(request.stripId, offer.buyout));

        close();
    }, [request, offer, close]);

    useMessageEvent<FurniRentOrBuyoutOfferMessageEvent>(FurniRentOrBuyoutOfferMessageEvent, (event) => {
        if (!request) return;

        const parser = event.getParser();
        const received: RentOrBuyoutOffer = {
            isWallItem: parser.isWallItem,
            furniTypeName: parser.furniTypeName,
            buyout: parser.buyout,
            priceInCredits: parser.priceInCredits,
            priceInActivityPoints: parser.priceInActivityPoints,
            activityPointType: parser.activityPointType
        };

        if (!isOfferForFurniType(received, request.furniData.fullName)) return;

        const affordability = getRentConfirmationAffordability(received, getCurrencyAmount);

        if (affordability === 'credits') {
            simpleAlert?.(LocalizeText('catalog.alert.notenough.credits.description'), null, null, null, LocalizeText('catalog.alert.notenough.title'));
            close();

            return;
        }

        if (affordability === 'activity_points') {
            const currencyName = LocalizeText(GetConfigurationValue<string>(`activitypoint.name.${received.activityPointType}`, 'duckets'));

            simpleAlert?.(
                LocalizeText('catalog.alert.notenough.activitypoints.description', ['currencyname'], [currencyName]),
                null,
                null,
                null,
                LocalizeText('catalog.alert.notenough.activitypoints.title', ['currencyname'], [currencyName])
            );
            close();

            return;
        }

        setOffer(received);
    });

    return { request, offer, openRentConfirmation, confirm, close };
};

export const useRentConfirmation = () => useSharedHook(useRentConfirmationState);
