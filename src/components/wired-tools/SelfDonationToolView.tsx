import {
    AddLinkEventTracker,
    FurnitureType,
    GetRoomEngine,
    GetSessionDataManager,
    IFurnitureData,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    SelfDonationMessageComposer,
    SelfDonationResultMessageEvent
} from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { localizeWithFallback, NotificationAlertType, SendMessageComposer } from '../../api';
import { Column, Flex, Text } from '../../common';
import { useMessageEvent, useNotification } from '../../hooks';
import { OctaneButton, OctaneCard, OctaneInput } from '../../layout';

/** `SelfDonationToolView.MAX_AMOUNT`. */
export const SELF_DONATION_MAX_AMOUNT = 500;

const MAX_ROWS = 200;

interface SelfDonationItem {
    id: number;
    name: string;
    isWallItem: boolean;
    iconUrl: string;
}

/**
 * `SelfDonationTool` / `SelfDonationToolView` of the official AIR 13 client, the
 * sandbox tool opened by `:donate` (`selfdonation/open`): pick a furniture type,
 * pick an amount between 1 and 500, and the server puts that many copies into
 * your own inventory. The server answers with `SelfDonationResult`, whose result
 * code selects one of the three official alert texts.
 */
export const SelfDonationToolView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [amount, setAmount] = useState(1);
    const [selected, setSelected] = useState<SelfDonationItem | null>(null);
    const { simpleAlert = null } = useNotification();

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'open':
                    case 'show':
                        setAmount(1);
                        setSelected(null);
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((prev) => !prev);
                        return;
                }
            },
            eventUrlPrefix: 'selfdonation/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useMessageEvent<SelfDonationResultMessageEvent>(SelfDonationResultMessageEvent, (event) => {
        const resultCode = event.getParser()?.resultCode;
        const success = resultCode === 0;
        const bodyKey = resultCode === 0 ? 'selfdonation.result.success' : resultCode === 1 ? 'selfdonation.result.not_allowed' : 'selfdonation.result.failed';
        const body =
            resultCode === 0
                ? localizeWithFallback(bodyKey, 'The items are in your inventory.')
                : resultCode === 1
                  ? localizeWithFallback(bodyKey, 'You are not allowed to use this tool.')
                  : localizeWithFallback(bodyKey, 'The donation failed.');

        simpleAlert?.(
            body,
            NotificationAlertType.DEFAULT,
            null,
            null,
            localizeWithFallback(success ? 'selfdonation.success' : 'selfdonation.fail', success ? 'Donation sent' : 'Donation failed')
        );
    });

    const items = useMemo<SelfDonationItem[]>(() => {
        if (!isVisible) return [];

        const all: IFurnitureData[] = GetSessionDataManager().getAllFurnitureData() ?? [];

        return all
            .filter((data) => data && (data.type === FurnitureType.FLOOR || data.type === FurnitureType.WALL))
            .map((data) => {
                const isWallItem = data.type === FurnitureType.WALL;

                return {
                    id: data.id,
                    name: data.name || data.className || `#${data.id}`,
                    isWallItem,
                    iconUrl: isWallItem ? GetRoomEngine().getFurnitureWallIconUrl(data.id) : GetRoomEngine().getFurnitureFloorIconUrl(data.id)
                };
            });
    }, [isVisible]);

    const filtered = useMemo<SelfDonationItem[]>(() => {
        const query = searchValue.trim().toLocaleLowerCase();
        const matches = query ? items.filter((item) => item.name.toLocaleLowerCase().includes(query)) : items;

        return matches.slice(0, MAX_ROWS);
    }, [items, searchValue]);

    if (!isVisible) return null;

    const donate = () => {
        if (!selected) {
            simpleAlert?.(
                localizeWithFallback('selfdonation.select_item', 'Select a furniture item first.'),
                NotificationAlertType.DEFAULT,
                null,
                null,
                localizeWithFallback('wiredfurni.error.title', 'Error')
            );

            return;
        }

        if (amount < 1 || amount > SELF_DONATION_MAX_AMOUNT) {
            simpleAlert?.(
                localizeWithFallback('selfdonation.invalid_amount', `Please enter an amount between 1 and ${SELF_DONATION_MAX_AMOUNT}.`),
                NotificationAlertType.DEFAULT,
                null,
                null,
                localizeWithFallback('wiredfurni.error.title', 'Error')
            );

            return;
        }

        SendMessageComposer(new SelfDonationMessageComposer(selected.isWallItem, selected.id, '', amount));
    };

    return (
        <OctaneCard className="h-[440px] w-[420px]" uniqueKey="self-donation">
            <OctaneCard.Header headerText={localizeWithFallback('selfdonation.title', 'Sandbox donation tool')} onCloseClick={() => setIsVisible(false)} />
            <OctaneCard.Content>
                <Column gap={2} className="h-full p-2">
                    <Flex alignItems="center" gap={2}>
                        <Text>{localizeWithFallback('selfdonation.amount', 'Amount')}</Text>
                        <OctaneInput
                            type="number"
                            min={1}
                            max={SELF_DONATION_MAX_AMOUNT}
                            value={String(amount)}
                            onChange={(event) => setAmount(Number.parseInt(event.target.value, 10) || 0)}
                            className="w-[80px]"
                        />
                    </Flex>
                    <OctaneInput
                        placeholder={localizeWithFallback('generic.search', 'Search')}
                        value={searchValue}
                        onChange={(event) => setSearchValue(event.target.value)}
                    />
                    <div className="grow overflow-auto rounded border border-black/10 bg-white/60 shadow-inner">
                        {!filtered.length && (
                            <div className="p-6 text-center">
                                <Text className="text-black/55">{localizeWithFallback('selfdonation.invalid_item', 'No furniture found.')}</Text>
                            </div>
                        )}
                        {filtered.map((item) => (
                            <Flex
                                key={`${item.isWallItem ? 'i' : 's'}-${item.id}`}
                                alignItems="center"
                                gap={2}
                                className={`cursor-pointer px-2 py-1 ${
                                    selected && selected.id === item.id && selected.isWallItem === item.isWallItem ? 'bg-black/10' : 'hover:bg-black/5'
                                }`}
                                onClick={() => setSelected(item)}
                            >
                                <img src={item.iconUrl} alt="" className="h-[32px] w-[32px] object-contain" />
                                <Text className="truncate">{item.name}</Text>
                            </Flex>
                        ))}
                    </div>
                    <OctaneButton onClick={donate}>{localizeWithFallback('selfdonation.donate', 'Donate')}</OctaneButton>
                </Column>
            </OctaneCard.Content>
        </OctaneCard>
    );
};
