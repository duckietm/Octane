import {
    GetRoomAdPurchaseInfoComposer,
    GetUserEventCatsMessageComposer,
    PurchaseRoomAdMessageComposer,
    RoomAdPurchaseInfoEvent,
    RoomEntryData
} from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../../../api';
import { Button, Column, Text } from '../../../../../common';
import { useCatalogUiState, useMessageEvent, useNavigatorData, useRoomPromote } from '../../../../../hooks';
import { OctaneInput } from '../../../../../layout';
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

    return (
        <>
            <Text bold center>
                {LocalizeText('roomad.catalog_header')}
            </Text>
            <Column className="text-black" overflow="hidden" size={12}>
                <div>{LocalizeText('roomad.catalog_text', ['duration'], ['120'])}</div>
                <div className="p-1 rounded bg-muted">
                    <Column gap={2}>
                        <Text bold>{LocalizeText('navigator.category')}</Text>
                        <select
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
                        </select>
                    </Column>
                    <div className="flex flex-col gap-1">
                        <Text bold>{LocalizeText('roomad.catalog_name')}</Text>
                        <OctaneInput maxLength={64} readOnly={extended} value={eventName} onChange={(event) => setEventName(event.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <Text bold>{LocalizeText('roomad.catalog_description')}</Text>
                        <textarea
                            className="min-h-[calc(1.5em+ .5rem+2px)] px-[.5rem] py-[.25rem]  rounded-[.2rem] form-control-sm"
                            maxLength={64}
                            readOnly={extended}
                            value={eventDesc}
                            onChange={(event) => setEventDesc(event.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <Text bold>{LocalizeText('roomad.catalog_roomname')}</Text>
                        <select
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
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <Button
                            disabled={!eventName || !eventDesc || roomId === -1}
                            variant={!eventName || !eventDesc || roomId === -1 ? 'danger' : 'success'}
                            onClick={purchaseAd}
                        >
                            {extended ? LocalizeText('roomad.extend.event') : LocalizeText('buy')}
                        </Button>
                    </div>
                </div>
            </Column>
        </>
    );
};

interface INavigatorCategory {
    id: number;
    name: string;
    visible: boolean;
}
