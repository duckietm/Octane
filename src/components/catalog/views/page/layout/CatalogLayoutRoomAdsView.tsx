import {
    GetRoomAdPurchaseInfoComposer,
    GetUserEventCatsMessageComposer,
    PurchaseRoomAdMessageComposer,
    RoomAdPurchaseInfoEvent,
    RoomEntryData
} from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../../../api';
import { Button } from '../../../../../common';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { Select } from '../../../../../common/Select';
import { useCatalogUiState, useMessageEvent, useNavigatorData, useRoomPromote } from '../../../../../hooks';
import { OctaneInput } from '../../../../../layout';
import { CatalogPriceDisplayWidgetView } from '../widgets/CatalogPriceDisplayWidgetView';
import { CatalogLayoutProps } from './CatalogLayout.types';

export const CatalogLayoutRoomAdsView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
    const [eventName, setEventName] = useState<string>('');
    const [eventDesc, setEventDesc] = useState<string>('');
    const [roomId, setRoomId] = useState<number>(-1);
    const [extended, setExtended] = useState<boolean>(false);
    const [categoryId, setCategoryId] = useState<number>(1);
    const { categories } = useNavigatorData();
    const { setIsVisible = null } = useCatalogUiState();
    const { promoteInformation, isExtended, setIsExtended } = useRoomPromote();
    const promoteData = promoteInformation?.data ?? null;

    const [availableRooms, setAvailableRooms] = useState<RoomEntryData[]>([]);

    const isPurchasingAd = useRef(false);

    useMessageEvent<RoomAdPurchaseInfoEvent>(RoomAdPurchaseInfoEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        setAvailableRooms(parser.rooms ?? []);
    });

    useEffect(() => {
        SendMessageComposer(new GetRoomAdPurchaseInfoComposer());
    }, []);

    useEffect(() => {
        if (isExtended && promoteData) {
            setRoomId(promoteData.flatId);
            setEventName(promoteData.eventName);
            setEventDesc(promoteData.eventDescription);
            setCategoryId(promoteData.categoryId);
            setExtended(isExtended);
            setIsExtended(false);
        }
    }, [isExtended, promoteData, setIsExtended]);

    const resetData = () => {
        setRoomId(-1);
        setEventName('');
        setEventDesc('');
        setCategoryId(1);
        setIsExtended(false);
        setIsVisible(false);
        isPurchasingAd.current = false;
    };

    const purchaseAd = () => {
        if (isPurchasingAd.current) return;

        isPurchasingAd.current = true;

        const pageId = page.pageId;
        const offerId = page.offers.length >= 1 ? page.offers[0].offerId : -1;
        const flatId = roomId;
        const name = eventName;
        const desc = eventDesc;
        const catId = categoryId;

        SendMessageComposer(new PurchaseRoomAdMessageComposer(pageId, offerId, flatId, name, extended, desc, catId));
        resetData();
    };

    useEffect(() => {
        // TODO: someone needs to fix this for morningstar
        SendMessageComposer(new GetUserEventCatsMessageComposer());
    }, []);

    const invalid = !eventName || !eventDesc || roomId === -1;
    const offer = page?.offers?.[0] ?? null;

    // AIR layout_roomads_xml, in AIR's order but stretched over the whole catalog page: the text (u_headline_small),
    // the category menu, the name box, the description box (takes the free height), the room menu, then the price
    // and the purchase button.
    return (
        <NativeTextTree>
            <div className="octane-catalog-air-roomads">
                <div className="octane-catalog-air-roomads__text">{LocalizeText('roomad.catalog_text', ['duration'], ['120'])}</div>
                <div className="octane-catalog-air-roomads__categories">
                    <Select
                        aria-label={LocalizeText('navigator.category')}
                        className="form-select form-select-sm"
                        disabled={extended}
                        value={categoryId}
                        onChange={(event) => setCategoryId(parseInt(event.target.value))}
                    >
                        {categories &&
                            categories.map((cat, index) => (
                                <option key={index} value={cat.id}>
                                    {LocalizeText(cat.name)}
                                </option>
                            ))}
                    </Select>
                </div>
                <label className="octane-catalog-air-roomads__label is-name" htmlFor="octane-roomad-name">
                    {LocalizeText('roomad.catalog_name')}
                </label>
                <div className="octane-catalog-air-roomads__name">
                    <OctaneInput
                        id="octane-roomad-name"
                        maxLength={64}
                        readOnly={extended}
                        value={eventName}
                        onChange={(event) => setEventName(event.target.value)}
                    />
                </div>
                <label className="octane-catalog-air-roomads__label is-description" htmlFor="octane-roomad-description">
                    {LocalizeText('roomad.catalog_description')}
                </label>
                <textarea
                    id="octane-roomad-description"
                    className="octane-catalog-air-roomads__description"
                    maxLength={64}
                    readOnly={extended}
                    value={eventDesc}
                    onChange={(event) => setEventDesc(event.target.value)}
                />
                <span className="octane-catalog-air-roomads__label is-room">{LocalizeText('roomad.catalog_roomname')}</span>
                <div className="octane-catalog-air-roomads__rooms">
                    <Select
                        aria-label={LocalizeText('roomad.catalog_roomname')}
                        className="form-select form-select-sm"
                        disabled={extended}
                        value={roomId}
                        onChange={(event) => setRoomId(parseInt(event.target.value))}
                    >
                        <option disabled value={-1}>
                            {LocalizeText('roomad.catalog_roomname')}
                        </option>
                        {availableRooms &&
                            availableRooms.map((room, index) => (
                                <option key={index} value={room.roomId}>
                                    {room.roomName}
                                </option>
                            ))}
                    </Select>
                </div>
                {!!offer && (
                    <div className="octane-catalog-air-roomads__price">
                        <CatalogPriceDisplayWidgetView offer={offer} />
                    </div>
                )}
                <div className="octane-catalog-air-roomads__purchase">
                    <Button disabled={invalid} variant="success" onClick={purchaseAd}>
                        {extended ? LocalizeText('roomad.extend.event') : LocalizeText('buy')}
                    </Button>
                </div>
            </div>
        </NativeTextTree>
    );
};

interface INavigatorCategory {
    id: number;
    name: string;
    visible: boolean;
}
